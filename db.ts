import mongoose, { Schema } from "mongoose";

async function connect() {
  await mongoose.connect(process.env.MONGODB_URI);
}
connect()

const schema=new Schema({
  text:String,
  userId:String,
  dateTime:Date
})

export const MessageDB=mongoose.model("Message",schema)