import mongoose, { Schema } from "mongoose"

export async function connect() {
  await mongoose.connect(Bun.env.MONGODB_URI)
}
connect()

const schema = new Schema({
  text: String,
  userId: String,
  dateTime: Number,
})

export const MessageDB = mongoose.model("Message", schema)
