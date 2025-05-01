// Import all dependencies, mostly using destructuring for better view.
import {
  type ClientConfig,
  type MessageEvent,
  type MessageAPIResponseBase,
  messagingApi,
  type WebhookEvent,
} from "@line/bot-sdk"
import { fetchThreadFromUserId, createThreadAndSendMessages, markAsUnresolved } from "./discord"
import { MessageDB, type MessageData } from "./db"
import { blockQuote, type Attachment, type Collection } from "discord.js"

const clientConfig: ClientConfig = {
  channelAccessToken: Bun.env.LINE_CHANNEL_ACCESS_TOKEN,
}

const client = new messagingApi.MessagingApiClient(clientConfig)

const isMessageEvent = (event: WebhookEvent): event is MessageEvent => event.type === "message"

export const messageEventHandler = async (
  event: WebhookEvent,
): Promise<MessageAPIResponseBase | undefined> => {
  if (!isMessageEvent(event)) return

  const userId = event.source.userId
  if (!userId) return
  const text = (() => {
    switch (event.message.type) {
      case "text":
        return event.message.text
      case "image":
        return "*\\[IMAGE\\]*"
      case "video":
        return "*\\[VIDEO\\]*"
      case "audio":
        return "*\\[AUDIO\\]*"
      case "location":
        return "*\\[LOCATION\\]*"
      case "file":
        return "*\\[FILE\\]*"
      case "sticker":
        return "*\\[STICKER\\]*"
    }
  })()
  const eventMessage: MessageData = {
    text,
    userId,
    dateTime: event.timestamp,
  }
  const thread = await fetchThreadFromUserId(userId)
  if (thread) {
    await thread.send(blockQuote(text))
    markAsUnresolved(thread)
  } else if (/^(質問|問い合わせ)$/.test(text)) {
    const messages = await MessageDB.aggregate<MessageData>([
      {
        $match: {
          userId,
          dateTime: {
            $gte: Date.now() - 15 * 60 * 1000,
          },
        },
      },
      { $sort: { dateTime: 1 } },
    ]).exec()
    messages.push(eventMessage)
    await createThreadAndSendMessages(userId, messages)
  }
  void MessageDB.create(eventMessage)
}

export async function send(
  userId: string,
  messageContent?: string,
  attachments?: Collection<string, Attachment>,
) {
  const messages: messagingApi.Message[] = []
  if (messageContent) {
    messages.push({
      type: "text",
      text: messageContent,
    })
  }
  attachments?.forEach(({ url, contentType }) => {
    switch (contentType) {
      case "image/png":
      case "image/jpeg":
        messages.push({
          type: "image",
          originalContentUrl: url,
          previewImageUrl: url,
        })
        break
      default:
        throw new Error("この形式のファイルには対応していません。")
    }
  })
  await client.pushMessage({
    to: userId,
    messages,
  })
}

export async function getUsername(userId: string) {
  const profile = await client.getProfile(userId)
  return profile.displayName.replace("/", "")
}
