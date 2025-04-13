// Import all dependencies, mostly using destructuring for better view.
import {
  type ClientConfig,
  type MessageAPIResponseBase,
  messagingApi,
  webhook,
} from "@line/bot-sdk"
import { fetchThreadFromUserId, createThreadAndSendMessages } from "./discord"
import { MessageDB } from "./db"

const clientConfig: ClientConfig = {
  channelAccessToken: Bun.env.LINE_CHANNEL_ACCESS_TOKEN,
}

const client = new messagingApi.MessagingApiClient(clientConfig)

const isTextEvent = (
  event: any,
): event is webhook.MessageEvent & { message: webhook.TextMessageContent } => {
  return event.type === "message" && event.message && event.message.type === "text"
}

export const textEventHandler = async (
  event: webhook.Event,
): Promise<MessageAPIResponseBase | undefined> => {
  if (!isTextEvent(event)) {
    return
  }

  const userId = event.source.userId as string

  await MessageDB.create({ text: event.message.text, userId, dateTime: new Date().getTime() })
  const thread = await fetchThreadFromUserId(userId)

  if (event.message.text?.includes("質問")) {
    if (thread) return
    const messages = await MessageDB.aggregate([
      { $match: { userId } },
      { $sort: { dateTime: -1 } },
      { $limit: 4 },
    ]).exec()
    await createThreadAndSendMessages(
      userId,
      messages.map((m) => m.text),
    )
    return
  }
  if (thread) await thread.send(event.message.text)
}

export async function send(message: string, userId: string) {
  await client.pushMessage({
    to: userId,
    messages: [
      {
        type: "text",
        text: message,
      },
    ],
  })
}

export async function getUserName(userId: string) {
  const profile = await client.getProfile(userId)
  return profile.displayName.replace("/", "")
}
