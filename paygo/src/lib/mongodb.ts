import { MongoClient } from 'mongodb';
import { randomUUID } from 'crypto';

const uri = process.env.NEXT_PUBLIC_MONGODB_URI!;
if (!uri) throw new Error('MONGODB_URI not set');

const client = new MongoClient(uri);
const dbName = 'invoicesdb';

export async function getDb() {
  await client.connect();
  return client.db(dbName);
}

// Generate UUID for new docs
export function generateUUID(): string {
  return randomUUID();
}