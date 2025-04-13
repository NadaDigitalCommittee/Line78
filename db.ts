import mongoose, { Schema, type InferSchemaType } from "mongoose"

export async function connect() {
  await mongoose.connect(Bun.env.MONGODB_URI)
}
await connect()

const messageSchema = new Schema({
  text: { type: String, required: true },
  userId: { type: String, required: true },
  dateTime: { type: Number, required: true },
})
const threadSchema = new Schema({
  userId: { type: String, required: true },
  threadId: { type: String, required: true },
})

export type MessageData = InferSchemaType<typeof messageSchema>
export type ThreadData = InferSchemaType<typeof threadSchema>

export const MessageDB = mongoose.model("Message", messageSchema)
export const ThreadDB = mongoose.model("Thread", threadSchema)
