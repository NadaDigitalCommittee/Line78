import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  Client,
  Message,
  TextChannel,
  type TextThreadChannel,
} from "discord.js"
import { getUsername, send } from "./line"
import { ThreadDB, type MessageData, type ThreadData } from "./db"

const discord = new Client({
  intents: ["Guilds", "GuildMessages", "MessageContent"],
})

discord.on("ready", async () => {
  console.log("Bot is ready")
})

discord.login(Bun.env.DISCORD_TOKEN)

const getMessageContent = (message: Message) =>
  message.content.replace(new RegExp(`<@!?${Bun.env.DISCORD_CLIENT_ID}>`, "g"), "").trim()

discord.on("messageCreate", async (message) => {
  if (message.author.bot) return
  const repliedMessage =
    message.reference?.messageId &&
    (await message.channel.messages.fetch(message.reference.messageId))
  const hasMention = discord.user && message.mentions.has(discord.user)
  if (!(repliedMessage || hasMention)) return
  const channel = repliedMessage ? repliedMessage.channel : message.channel
  if (!channel.isThread()) return

  const messageContent = getMessageContent(message)
  if (!messageContent) return
  const { userId } = (await ThreadDB.findOne({ threadId: channel.id })) ?? {}
  if (!userId) return
  const button = new ButtonBuilder()
    .setCustomId(`send/${userId}`)
    .setLabel("送信")
    .setStyle(ButtonStyle.Danger)
  const button2 = new ButtonBuilder()
    .setCustomId("delete")
    .setEmoji("🗑️")
    .setStyle(ButtonStyle.Primary)
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button, button2)

  await message.reply({
    content: "このメッセージをほんまに送信しますか？",
    components: [row],
  })
})

discord.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return
  if (!interaction.message.author.bot) return
  const mode = interaction.customId.split("/")[0]
  switch (mode) {
    case "send": {
      const userId = interaction.customId.split("/")[1]
      const replyMessageId = interaction.message.reference?.messageId
      const replyMessage = replyMessageId && interaction.channel?.messages.cache.get(replyMessageId)
      if (!replyMessage) {
        interaction.reply("送信するメッセージの内容を取得できません。")
        return
      }
      if (!userId) {
        await replyMessage.reply({
          content: "送信先ユーザーを取得できません。",
        })
        return
      }
      const messageContent = getMessageContent(replyMessage)
      const attachments = replyMessage.attachments
      try {
        await send(messageContent, userId, attachments)
        await replyMessage.reply({
          content: "送信しました。",
        })
      } catch (e) {
        await replyMessage.reply({
          content: `メッセージを送信できません: ${(e as Error).message ?? "不明なエラー"}`,
        })
      }
      await interaction.message.delete()
      return
    }
    case "delete":
      await interaction.message.delete()
      break
  }
})

const dateFormatter = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
})

export async function createThreadAndSendMessages(userId: string, messages: MessageData[]) {
  const channel = (await discord.channels.fetch(Bun.env.DISCORD_CHANNEL_ID)) as TextChannel
  const messageContents = messages.map((m) => m.text)
  const timestamp = dateFormatter.format(messages[0]?.dateTime)

  const username = await getUsername(userId)
  const created = await channel.threads.create({
    name: `${timestamp}-${username}`,
    autoArchiveDuration: 1440,
    type: ChannelType.PublicThread,
  })
  await ThreadDB.updateOne(
    { userId },
    { $set: { userId, threadId: created.id } satisfies ThreadData },
    {
      upsert: true,
    },
  )

  await created.send(`*${timestamp} ${username}*\n>>> ${messageContents.join("\n")}`)
}

export async function fetchThreadFromUserId(userId: string) {
  const { threadId } = (await ThreadDB.findOne({ userId })) ?? {}
  return (
    threadId
      ? await discord.channels.fetch(threadId).catch(async (e) => {
          console.error(e)
          await ThreadDB.deleteOne({ userId })
          return null
        })
      : null
  ) as TextThreadChannel | null
}
