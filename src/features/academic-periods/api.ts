import { db, type AcademicPeriod } from '@/db/database';
import { DomainNotFoundError } from '@/lib/domainErrors';
import { validateAcademicPeriod } from '@/lib/validation';

export async function getAcademicPeriods() {
  return db.academicPeriods.orderBy('startDate').reverse().toArray();
}

export async function getActiveAcademicPeriod() {
  return db.academicPeriods.filter((period) => period.isActive).first();
}

export async function createAcademicPeriod(input: Omit<AcademicPeriod, 'id'>) {
  const period: AcademicPeriod = { ...input, id: crypto.randomUUID(), name: input.name.trim() };
  validateAcademicPeriod(period);
  return db.transaction('rw', db.academicPeriods, async () => {
    if (period.isActive) {
      await db.academicPeriods.filter((item) => item.isActive).modify({ isActive: false });
    }
    await db.academicPeriods.add(period);
    return period;
  });
}

export async function updateAcademicPeriod(id: string, updates: Partial<Omit<AcademicPeriod, 'id'>>) {
  const normalized = { ...updates, ...(updates.name !== undefined ? { name: updates.name.trim() } : {}) };
  validateAcademicPeriod(normalized, true);
  return db.transaction('rw', db.academicPeriods, async () => {
    const current = await db.academicPeriods.get(id);
    if (!current) throw new DomainNotFoundError('Academic period', id);
    const next = { ...current, ...normalized };
    validateAcademicPeriod(next);
    if (normalized.isActive) {
      await db.academicPeriods.filter((item) => item.isActive).modify({ isActive: false });
    }
    await db.academicPeriods.update(id, normalized);
  });
}

export async function setActiveAcademicPeriod(id: string) {
  return updateAcademicPeriod(id, { isActive: true });
}
