import mongoose from "mongoose";

let connected = false;

export async function connectDB(): Promise<void> {
  if (connected) return;
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not defined");
  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
  });
  connected = true;
}