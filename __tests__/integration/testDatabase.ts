import { db } from '@/db/database';

export async function resetTestDatabase(): Promise<void> {
  db.close();
  await db.delete();
  await db.open();
}

export async function deleteTestDatabase(): Promise<void> {
  db.close();
  await db.delete();
}
