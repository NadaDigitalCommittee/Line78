import { InteractionContextType, REST, Routes, SlashCommandBuilder } from "discord.js"

const resolve = new SlashCommandBuilder()
  .setName("resolve")
  .setDescription("スレッドを対応済みとマークします。")
  .setContexts(InteractionContextType.Guild)

const close = new SlashCommandBuilder()
  .setName("close")
  .setDescription("スレッドを対応済みとマークして終了します。")
  .setContexts(InteractionContextType.Guild)

const unresolved = new SlashCommandBuilder()
  .setName("unresolved")
  .setDescription("未対応のスレッドを一覧します。")
  .setContexts(InteractionContextType.Guild)

const rest = new REST({ version: "10" }).setToken(Bun.env.DISCORD_TOKEN)

console.log("Registering commands...")
await rest
  .put(Routes.applicationCommands(Bun.env.DISCORD_CLIENT_ID), {
    body: [resolve, close, unresolved],
  })
  .then(() => {
    console.log("✓ Success")
  })
