declare global {
  namespace NodeJS {
    interface ProcessEnv {
      CHANNEL_ACCESS_TOKEN: string;
      CHANNEL_SECRET: string;
      PORT: string;
      DISCORD_TOKEN: string;
      MONGODB_URI: string;
      DISCORD_CHANNEL_ID: string;
    }
  }
}

export {};