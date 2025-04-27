import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ChannelType,
  ChatInputCommandInteraction,
  Client,
  Message,
  unorderedList,
  type TextThreadChannel,
} from "discord.js"
import { getUsername, send } from "./line"
import { ThreadDB, type MessageData, type ThreadData } from "./db"
import assert from "node:assert/strict"

const discord = new Client({
  intents: ["Guilds", "GuildMessages", "MessageContent"],
})

discord.on("ready", async () => {
  console.log("Bot is ready")
})

await discord.login(Bun.env.DISCORD_TOKEN)

const involvedChannel = await discord.channels.fetch(Bun.env.DISCORD_CHANNEL_ID)
assert.ok(involvedChannel?.type === ChannelType.GuildText)

const getMessageContent = (message: Message) =>
  message.content.replace(new RegExp(`\\s*<@!?${Bun.env.DISCORD_CLIENT_ID}>\\s*`, "g"), "").trim()

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
  if (!messageContent && !message.attachments.size) return
  const { userId } = (await ThreadDB.findOne({ threadId: channel.id })) ?? {}
  if (!userId) return
  const button = new ButtonBuilder()
    .setCustomId(`send/${userId}`)
    .setLabel("送信")
    .setStyle(ButtonStyle.Primary)
  const button2 = new ButtonBuilder()
    .setCustomId("delete")
    .setEmoji("🗑️")
    .setStyle(ButtonStyle.Secondary)
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button, button2)

  await message.reply({
    content: "このメッセージをほんまに送信しますか？",
    components: [row],
  })
})

async function buttonHandler(interaction: ButtonInteraction) {
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
      try {
        await send(userId, messageContent, replyMessage.attachments)
        if (interaction.channel?.isThread()) {
          markAsResolved(interaction.channel)
        }
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
}

const slashCommandHandler = async (interaction: ChatInputCommandInteraction) => {
  const { channel } = interaction
  const isInInvolvedThread = channel?.isThread() && channel.parentId === Bun.env.DISCORD_CHANNEL_ID
  switch (interaction.commandName) {
    case "resolve":
      if (isInInvolvedThread) {
        markAsResolved(channel)
        await interaction.reply({
          content: ":white_check_mark: 完了",
        })
      } else {
        await interaction.reply({
          content: ":question: 不明なスレッド",
        })
      }
      return
    case "close":
      if (isInInvolvedThread) {
        await ThreadDB.deleteOne({ threadId: channel.id })
        void channel.setArchived(true)
        await interaction.reply({
          content: ":white_check_mark: 完了",
        })
      } else {
        await interaction.reply({
          content: ":question: 不明なスレッド",
        })
      }
      return
    case "unresolved":
      await interaction.deferReply()
      const { threads } = await involvedChannel.threads.fetch()
      const unresolvedThreads = threads
        .filter((thread) => isUnresolved(thread as TextThreadChannel))
        .map((thread) => thread.url)
      interaction.editReply({
        content: unresolvedThreads.length
          ? unorderedList(unresolvedThreads)
          : ":smiling_face_with_3_hearts: すべての問い合わせに対応済みです。",
      })
      return
    default:
      await interaction.reply({
        content: ":question: 不明なコマンド",
      })
      return
  }
  return
}

discord.on("interactionCreate", async (interaction) => {
  if (interaction.isButton()) {
    await buttonHandler(interaction)
  } else if (interaction.isChatInputCommand()) {
    await slashCommandHandler(interaction)
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

const unresolvedIndicator = "🟢【未対応】"

export function isUnresolved(thread: TextThreadChannel) {
  return thread.name.startsWith(unresolvedIndicator)
}

export function markAsResolved(thread: TextThreadChannel) {
  if (!isUnresolved(thread)) return
  void thread.edit({
    name: thread.name.replace(unresolvedIndicator, ""),
  })
}

export function markAsUnresolved(thread: TextThreadChannel) {
  if (isUnresolved(thread)) return
  void thread.edit({
    name: `${unresolvedIndicator}${thread.name}`,
  })
}

export const createThreadAndSendMessages = async (userId: string, messages: MessageData[]) => {
  const messageContents = messages.map((m) => m.text)
  const timestamp = dateFormatter.format(messages.at(-1)?.dateTime)
  const username = await getUsername(userId)
  const created = await involvedChannel.threads.create({
    name: `${unresolvedIndicator}${timestamp}-${username}`,
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
      ? await discord.channels
          .fetch(threadId, {
            force: true,
          })
          .catch(async (e) => {
            console.error(e)
            await ThreadDB.deleteOne({ userId })
            return null
          })
      : null
  ) as TextThreadChannel | null
}
