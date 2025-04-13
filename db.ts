import mongoose, { Schema } from "mongoose"

export async function connect() {
  await mongoose.connect(Bun.env.MONGODB_URI)
}
await connect()

const messageSchema = new Schema({
  text: String,
  userId: String,
  dateTime: Number,
})
const threadSchema = new Schema({
  userId: String,
  threadId: String,
})

export const MessageDB = mongoose.model("Message", messageSchema)
export const ThreadDB = mongoose.model("Thread", threadSchema)
