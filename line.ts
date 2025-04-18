// Import all dependencies, mostly using destructuring for better view.
import {
  type ClientConfig,
  type MessageEvent,
  type MessageAPIResponseBase,
  messagingApi,
  type TextEventMessage,
  type WebhookEvent,
} from "@line/bot-sdk"
import { fetchThreadFromUserId, createThreadAndSendMessages } from "./discord"
import { MessageDB, type MessageData } from "./db"
import type { Attachment, Collection } from "discord.js"

const clientConfig: ClientConfig = {
  channelAccessToken: Bun.env.LINE_CHANNEL_ACCESS_TOKEN,
}

const client = new messagingApi.MessagingApiClient(clientConfig)

type TextEvent = MessageEvent & { message: TextEventMessage }

const isTextEvent = (event: WebhookEvent): event is TextEvent => {
  return event.type === "message" && event.message.type === "text"
}

export const textEventHandler = async (
  event: WebhookEvent,
): Promise<MessageAPIResponseBase | undefined> => {
  if (!isTextEvent(event)) return

  const userId = event.source.userId
  if (!userId) return
  const { text } = event.message
  await MessageDB.create({
    text,
    userId,
    dateTime: event.timestamp,
  } satisfies MessageData)
  const thread = await fetchThreadFromUserId(userId)

  if (text && /^(質問|問い合わせ)$/.test(text)) {
    if (thread) return
    const messages = await MessageDB.aggregate<MessageData>([
      { $match: { userId } },
      { $sort: { dateTime: -1 } },
      { $limit: 4 },
    ]).exec()
    await createThreadAndSendMessages(userId, messages.reverse())
    return
  }
  if (thread) await thread.send(`>>> ${text}`)
}

export async function send(
  message: string,
  userId: string,
  attachments?: Collection<string, Attachment>,
) {
  const attachmentsToSend = attachments?.map(({ url, contentType }): messagingApi.Message => {
    switch (contentType) {
      case "image/png":
      case "image/jpeg":
        return {
          type: "image",
          originalContentUrl: url,
          previewImageUrl: url,
        }
      default:
        throw new Error("この形式のファイルには対応していません。")
    }
  })
  await client.pushMessage({
    to: userId,
    messages: [
      {
        type: "text",
        text: message,
      },
      ...(attachmentsToSend ?? []),
    ],
  })
}

export async function getUsername(userId: string) {
  const profile = await client.getProfile(userId)
  return profile.displayName.replace("/", "")
}
