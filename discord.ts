import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, Client, Collection, ComponentBuilder, EmbedBuilder, GuildMember, TextChannel } from "discord.js";
import { getUserName, send } from "./line.js";
import dotenv from "dotenv"
dotenv.config()

const discord = new Client({
  "intents": [
    "Guilds",
    "GuildMembers",
    "GuildMessages",
    "MessageContent"
  ]
})

discord.on("ready", async () => {
  console.log("Bot is ready")
})


discord.login(process.env.DISCORD_TOKEN)

discord.on("messageCreate", async (message) => {
  if (message.author.bot) {
    return;
  }
  const channel = message.channel
  if (!channel.isThread()) {
    return;
  }
  const topic = channel.name
  const topicArray = topic.split("/")
  if (topicArray.length !== 2) {
    return;
  }
  const userId = topicArray[1]
  const button = new ButtonBuilder()
    .setCustomId(`send/${userId}`)
    .setLabel('送信')
    .setStyle(ButtonStyle.Danger);
    const button2=new ButtonBuilder().setCustomId("delete").setEmoji("🗑️").setStyle(ButtonStyle.Primary)
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button,button2)

  await message.reply({
    content: "このメッセージをほんまに送信しますか？",
    components: [row]
  })
})

discord.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return
  if( !interaction.message.author.bot) return
  const mode = interaction.customId.split("/")[0]

  if (mode === "send") {
    const userId = interaction.customId.split("/")[1]
    const replyMessageId = interaction.message.reference?.messageId
    const replyMessage = interaction.channel?.messages.cache.get(replyMessageId)
    if (!replyMessage) {
      interaction.reply("エラーが発生しました。")
      return;
    }
    const content = replyMessage.content
    await send(content, userId)    
    await replyMessage.reply({
      content: "送信しました",
    })
    await interaction.message.delete()
    return;
  } else if (mode === "close") {
    if (interaction.channel.isThread()) {
      await interaction.channel.delete()
    }
  }else if(mode==="delete"){
    await interaction.message.delete()
  }
})


export async function createThreadAndSendMessages(userId: string, messages: string[]) {
  const channel = await discord.channels.fetch(process.env.DISCORD_CHANNEL_ID) as TextChannel
  const now = Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date())
  
  const created = await channel.threads.create({
    name: `${now}-${await getUserName(userId)}/${userId}`,
    autoArchiveDuration: 1440,
    type: ChannelType.PublicThread
  })

  const button = new ButtonBuilder()
    .setCustomId(`close`)
    .setLabel('削除')
    .setStyle(ButtonStyle.Danger);
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button)

  await created.send({
    content: "スレッドを削除する。",
    components: [row]
  })

  for (const message of messages) {
    await created.send(message)
  }
}

export async function channelFromUserId(userId:string){
  const channel = await discord.channels.fetch(process.env.DISCORD_CHANNEL_ID) as TextChannel
  const threads = await channel.threads.fetch()
  const thread = threads.threads.find(t=>t.name.includes(userId))
  return thread
}