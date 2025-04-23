import { InteractionContextType, REST, Routes, SlashCommandBuilder } from "discord.js"

const resolve = new SlashCommandBuilder()
  .setName("resolve")
  .setDescription("スレッドを対応済みとマークします。")
  .setContexts(InteractionContextType.Guild)

const close = new SlashCommandBuilder()
  .setName("close")
  .setDescription("スレッドを終了します。")
  .setContexts(InteractionContextType.Guild)

const rest = new REST({ version: "10" }).setToken(Bun.env.DISCORD_TOKEN)

console.log("Registering commands...")
await rest
  .put(Routes.applicationCommands(Bun.env.DISCORD_CLIENT_ID), {
    body: [resolve, close],
  })
  .then(() => {
    console.log("✓ Success")
  })
