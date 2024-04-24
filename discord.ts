import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, Client, ComponentBuilder, EmbedBuilder, TextChannel } from "discord.js";
import { send } from "./line.js";
import dotenv from "dotenv"
dotenv.config()

const discord = new Client({
  "intents": [
    "Guilds",
    "GuildMembers",
    "GuildMessages",
  ]
})

discord.on("ready", () => {
  console.log("Bot is ready")
})


discord.login(process.env.DISCORD_TOKEN)

discord.on("messageCreate", async (message) => {
  if(message.author.bot){
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
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button)
  
  await message.reply({
    content: "ボタンを押してね",
    components: [row]
  })
})

discord.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return
  const mode = interaction.customId.split("/")[0] 

  if (mode === "send") {
    const userId = interaction.customId.split("/")[1]
    const replyMessageId = interaction.message.reference?.messageId
    const replyMessage = await interaction.channel?.messages.fetch(replyMessageId)
    if (!replyMessage) {
      interaction.reply("エラーが発生しました")
      return;
    }
    const content = replyMessage.content
    await send(content, userId)
  }else if(mode==="close"){
    if(interaction.channel.isThread()){
      await interaction.channel.delete()
    }
  }
})


export async function createThreadAndSendMessages(userId:string,messages:string[]){
  const channel = await discord.channels.fetch(process.env.DISCORD_CHANNEL_ID) as TextChannel
  const now=new Date()
  const hour=now.getHours()
  const minute=now.getMinutes()
  const created=await channel.threads.create({
    name: `問い合わせ${hour}:${minute}/${userId}`,
    autoArchiveDuration: 1440,
  })  
  for(const message of messages){
    await created.send(message)
  }
}