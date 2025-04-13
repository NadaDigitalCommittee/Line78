declare global {
  namespace NodeJS {
    interface ProcessEnv {
      LINE_CHANNEL_ACCESS_TOKEN: string
      LINE_CHANNEL_SECRET: string
      DISCORD_TOKEN: string
      MONGODB_URI: string
      DISCORD_CLIENT_ID: string
      DISCORD_CHANNEL_ID: string
    }
  }
}

export {}
