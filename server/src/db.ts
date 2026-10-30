import { MongoClient, Db } from 'mongodb';

export interface RunData {
  sessionId: string;
  currentRoom: string;
  distance: number;
  inventory: string[];
  solvedRooms: string[];
  checkpointRoom: string;
  playerProfile: any;
  queueSnapshot: any[];
  updatedAt: Date;
}

export interface TelemetryEvent {
  sessionId: string;
  type: string;
  data: any;
  timestamp: Date;
}

// In-memory fallback stores when MONGODB_URI is not supplied
const memoryRuns = new Map<string, RunData>();
const memoryEvents: TelemetryEvent[] = [];

let client: MongoClient | null = null;
let db: Db | null = null;

export async function initDatabase(): Promise<{ isConnected: boolean; mode: 'mongodb' | 'memory' }> {
  const uri = process.env.MONGODB_URI;
  if (!uri || uri.trim() === '') {
    console.log('[DB] No MONGODB_URI provided. Running in high-performance in-memory fallback mode.');
    return { isConnected: false, mode: 'memory' };
  }

  try {
    client = new MongoClient(uri, { serverSelectionTimeoutMS: 3000 });
    await client.connect();
    db = client.db('wake_game');
    console.log('[DB] Successfully connected to MongoDB Atlas.');
    return { isConnected: true, mode: 'mongodb' };
  } catch (err: any) {
    console.warn(`[DB] Failed to connect to MongoDB Atlas (${err.message}). Falling back to memory mode.`);
    client = null;
    db = null;
    return { isConnected: false, mode: 'memory' };
  }
}

export async function saveRun(run: RunData): Promise<void> {
  run.updatedAt = new Date();
  if (db) {
    try {
      await db.collection('runs').updateOne(
        { sessionId: run.sessionId },
        { $set: run },
        { upsert: true }
      );
      return;
    } catch (e) {
      console.warn('[DB] Mongo saveRun failed, caching to memory:', e);
    }
  }
  memoryRuns.set(run.sessionId, run);
}

export async function getRun(sessionId: string): Promise<RunData | null> {
  if (db) {
    try {
      const doc = await db.collection('runs').findOne({ sessionId });
      if (doc) return doc as unknown as RunData;
    } catch (e) {
      console.warn('[DB] Mongo getRun failed, reading memory:', e);
    }
  }
  return memoryRuns.get(sessionId) || null;
}

export async function recordEvent(event: TelemetryEvent): Promise<void> {
  event.timestamp = new Date();
  if (db) {
    try {
      await db.collection('events').insertOne(event);
      return;
    } catch (e) {
      console.warn('[DB] Mongo recordEvent failed, appending memory:', e);
    }
  }
  memoryEvents.push(event);
}
