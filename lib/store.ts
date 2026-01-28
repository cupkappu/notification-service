import Database from 'better-sqlite3';
import path from 'path';
import crypto from 'crypto';

const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'subscriptions.db');
const db = new Database(dbPath);

// Initialize the database with multi-device support
db.exec(`
  CREATE TABLE IF NOT EXISTS subscriptions (
    subscription_id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    deviceName TEXT,
    createdAt TEXT NOT NULL
  )
`);

// Create index for userId lookup
try {
  db.prepare('CREATE INDEX IF NOT EXISTS idx_userId ON subscriptions(userId)').run();
} catch (e) {
  // Index might already exist
}

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface SubscriptionRecord extends PushSubscription {
  subscription_id: string;
  userId: string;
  deviceName: string | null;
  createdAt: string;
}

export function generateSubscriptionId(): string {
  return crypto.randomUUID();
}

export function addSubscription(
  userId: string,
  subscription: PushSubscription,
  deviceName?: string
): string {
  const subscriptionId = generateSubscriptionId();
  const stmt = db.prepare(`
    INSERT INTO subscriptions (subscription_id, userId, endpoint, p256dh, auth, deviceName, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    subscriptionId,
    userId,
    subscription.endpoint,
    subscription.keys.p256dh,
    subscription.keys.auth,
    deviceName || null,
    new Date().toISOString()
  );

  return subscriptionId;
}

export function getSubscription(subscriptionId: string): SubscriptionRecord | null {
  const stmt = db.prepare('SELECT * FROM subscriptions WHERE subscription_id = ?');
  const row = stmt.get(subscriptionId) as any;

  if (!row) return null;

  return {
    subscription_id: row.subscription_id,
    userId: row.userId,
    endpoint: row.endpoint,
    keys: {
      p256dh: row.p256dh,
      auth: row.auth,
    },
    deviceName: row.deviceName,
    createdAt: row.createdAt,
  };
}

export function getUserSubscriptions(userId: string): SubscriptionRecord[] {
  const stmt = db.prepare('SELECT * FROM subscriptions WHERE userId = ? ORDER BY createdAt DESC');
  const rows = stmt.all(userId) as any[];

  return rows.map((row) => ({
    subscription_id: row.subscription_id,
    userId: row.userId,
    endpoint: row.endpoint,
    keys: {
      p256dh: row.p256dh,
      auth: row.auth,
    },
    deviceName: row.deviceName,
    createdAt: row.createdAt,
  }));
}

export function getAllSubscriptions(): SubscriptionRecord[] {
  const stmt = db.prepare('SELECT * FROM subscriptions ORDER BY createdAt DESC');
  const rows = stmt.all() as any[];

  return rows.map((row) => ({
    subscription_id: row.subscription_id,
    userId: row.userId,
    endpoint: row.endpoint,
    keys: {
      p256dh: row.p256dh,
      auth: row.auth,
    },
    deviceName: row.deviceName,
    createdAt: row.createdAt,
  }));
}

export function removeSubscription(subscriptionId: string): boolean {
  const stmt = db.prepare('DELETE FROM subscriptions WHERE subscription_id = ?');
  const result = stmt.run(subscriptionId);
  return result.changes > 0;
}

export function removeUserSubscription(userId: string): boolean {
  // Remove the first subscription for a user (legacy support)
  const stmt = db.prepare('DELETE FROM subscriptions WHERE userId = ? LIMIT 1');
  const result = stmt.run(userId);
  return result.changes > 0;
}

export function hasSubscription(userId: string): boolean {
  const stmt = db.prepare('SELECT 1 FROM subscriptions WHERE userId = ? LIMIT 1');
  return !!stmt.get(userId);
}

export function getSubscriptionCount(): number {
  const result = db.prepare('SELECT COUNT(*) as count FROM subscriptions').get() as { count: number };
  return result.count;
}

export function getUserCount(): number {
  const result = db.prepare('SELECT COUNT(DISTINCT userId) as count FROM subscriptions').get() as { count: number };
  return result.count;
}
