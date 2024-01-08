'use server';
// lib/db/dbConnect.ts
import mongoose from 'mongoose';
import { Mongoose } from 'mongoose';

const DB_URI = process.env.MONGODB_URL || '';

declare global {
  var mongoose: {
    promise: Promise<Mongoose> | null;
    conn: Mongoose | null;
  };
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  if (cached.conn) return cached.conn;
  try {
    if (!cached.promise) {
      cached.promise = mongoose
        .set({ debug: true, strictQuery: false })
        .connect(`${DB_URI}`)
        .then((mongoose) => mongoose);
    }
    console.log('Mongoose Database Connected');
  } catch (error) {
    console.log('Mongoose Database Failed');
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

export default dbConnect;
