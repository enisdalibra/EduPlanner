import { db } from '@/db/database';

export async function resetTestDatabase(): Promise<void> {
  db.close();
  await db.delete();
  await db.open();
  await db.academicPeriods.put({ id: 'period-test', name: 'Test Period', startDate: '2026-07-01', endDate: '2027-06-30', isActive: true });
}

export async function deleteTestDatabase(): Promise<void> {
  db.close();
  await db.delete();
}
