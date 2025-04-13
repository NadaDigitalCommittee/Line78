import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  Client,
  TextChannel,
  type TextThreadChannel,
} from "discord.js"
import { getUserName, send } from "./line"
import { ThreadDB } from "./db"

const discord = new Client({
  intents: ["Guilds", "GuildMessages", "MessageContent"],
})

discord.on("ready", async () => {
  console.log("Bot is ready")
})

discord.login(Bun.env.DISCORD_TOKEN)

discord.on("messageCreate", async (message) => {
  if (message.author.bot) {
    return
  }
  const channel = message.channel
  if (!channel.isThread()) {
    return
  }
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

  if (mode === "send") {
    const userId = interaction.customId.split("/")[1]
    const replyMessageId = interaction.message.reference?.messageId
    const replyMessage = interaction.channel?.messages.cache.get(replyMessageId)
    if (!replyMessage) {
      interaction.reply("エラーが発生しました。")
      return
    }
    let content = replyMessage.content
    const attachments = replyMessage.attachments
    content += "\n" + attachments.map((a) => a.url).join("\n")
    await send(content, userId)
    await replyMessage.reply({
      content: "送信しました",
    })
    await interaction.message.delete()
    return
  } else if (mode === "close") {
    if (interaction.channel?.isThread()) {
      await interaction.channel.delete()
    }
  } else if (mode === "delete") {
    await interaction.message.delete()
  }
})

export async function createThreadAndSendMessages(userId: string, messages: string[]) {
  const channel = (await discord.channels.fetch(Bun.env.DISCORD_CHANNEL_ID)) as TextChannel
  const now = Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date())

  const created = await channel.threads.create({
    name: `${now}-${await getUserName(userId)}`,
    autoArchiveDuration: 1440,
    type: ChannelType.PublicThread,
  })
  await ThreadDB.create({ userId: userId, threadId: created.id })

  const button = new ButtonBuilder()
    .setCustomId(`close`)
    .setLabel("削除")
    .setStyle(ButtonStyle.Danger)
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button)

  await created.send({
    content: "スレッドを削除する。",
    components: [row],
  })

  for (const message of messages) {
    await created.send(message)
  }
}

export async function fetchThreadFromUserId(userId: string) {
  const { threadId } = (await ThreadDB.findOne({ userId })) ?? {}
  return threadId ? ((await discord.channels.fetch(threadId)) as TextThreadChannel) : null
}
