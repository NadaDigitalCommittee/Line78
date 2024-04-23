// Import all dependencies, mostly using destructuring for better view.
import {
  ClientConfig,
  MessageAPIResponseBase,
  messagingApi,
  webhook,
} from '@line/bot-sdk';
import dotenv from "dotenv"
import { createThreadAndSendMessages } from './discord.js';
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
  if (!isTextEvent(event)) {
    return;
  }

  const userId=event.source.userId as string;
  await MessageDB.create({text:event.message.text,userId});
  await createThreadAndSendMessages(userId,[]);
};

export async function send(message:string,userId:string){
  await client.pushMessage({
    to: userId,
    messages: [{
      type: 'text',
      text: message,
    }],
  });
}