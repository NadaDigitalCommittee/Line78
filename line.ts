// Import all dependencies, mostly using destructuring for better view.
import {
  ClientConfig,
  MessageAPIResponseBase,
  messagingApi,
  webhook,
} from '@line/bot-sdk';
import dotenv from "dotenv"
import { channelFromUserId, createThreadAndSendMessages } from './discord.js';
import { MessageDB } from './db.js';
dotenv.config()

const clientConfig: ClientConfig = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN || '',
};

const client = new messagingApi.MessagingApiClient(clientConfig);

const isTextEvent = (event: any): event is webhook.MessageEvent & { message: webhook.TextMessageContent } => {
  return event.type === 'message' && event.message && event.message.type === 'text';
};

export const textEventHandler = async (event: webhook.Event): Promise<MessageAPIResponseBase | undefined> => {
  console.log(event,"イベント来てるよ！！！！！")
  if (!isTextEvent(event)) {
    return;
  }

  const userId = event.source.userId as string;
  if(userId!=="Udcb5703cf0ab344cfe2ca71f3c42e548"){
    return;
  }
  await MessageDB.create({ text: event.message.text, userId, dateTime: new Date().getTime() });
  const channel = await channelFromUserId(userId);

  if (event.message.text?.startsWith("質問")) {
    if (channel) { return; }
    const messages = await MessageDB.aggregate([
      { $match: { userId } },
      { $sort: { dateTime: -1 } },
      { $limit: 4 },
    ]).exec()
    await createThreadAndSendMessages(userId, messages.map((m) => m.text));
    return;
  }
  if(channel){
    await channel.send(event.message.text)
  }
};

export async function send(message: string, userId: string) {
  await client.pushMessage({
    to: userId,
    messages: [{
      type: 'text',
      text: message,
    }],
  });
}