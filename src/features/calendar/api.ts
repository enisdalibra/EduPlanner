import { db, type Task } from '@/db/database';
import { DomainNotFoundError } from '@/lib/domainErrors';
import { validateTask } from '@/lib/validation';
import { assertClassWritable } from '@/lib/classAccess';

export type TaskInput = Omit<Task, 'id'>;

async function assertTaskRelations(task: Partial<Pick<Task, 'classId' | 'subjectId'>>): Promise<void> {
  if (task.classId) await assertClassWritable(db, task.classId);
  if (task.subjectId && !(await db.subjects.get(task.subjectId))) {
    throw new DomainNotFoundError('Subject', task.subjectId);
  }
}

export async function createTask(input: TaskInput): Promise<Task> {
  const task: Task = { id: crypto.randomUUID(), ...input };
  validateTask(task);
  return db.transaction('rw', [db.tasks, db.classes, db.subjects], async () => {
    await assertTaskRelations(task);
    await db.tasks.add(task);
    return task;
  });
}

export async function updateTask(id: string, updates: Partial<Task>): Promise<void> {
  validateTask(updates, true);
  await db.transaction('rw', [db.tasks, db.classes, db.subjects], async () => {
    const current = await db.tasks.get(id);
    if (!current) throw new DomainNotFoundError('Task', id);
    if (current.classId) await assertClassWritable(db, current.classId);
    await assertTaskRelations(updates);
    await db.tasks.update(id, updates);
  });
}

export async function toggleTaskStatus(id: string): Promise<Task['status']> {
  return db.transaction('rw', [db.tasks, db.classes], async () => {
    const task = await db.tasks.get(id);
    if (!task) throw new DomainNotFoundError('Task', id);
    if (task.classId) await assertClassWritable(db, task.classId);
    const status: Task['status'] = task.status === 'pending' ? 'completed' : 'pending';
    await db.tasks.update(id, { status });
    return status;
  });
}

export async function deleteTask(id: string): Promise<void> {
  await db.transaction('rw', [db.tasks, db.classes], async () => {
    const task = await db.tasks.get(id);
    if (!task) throw new DomainNotFoundError('Task', id);
    if (task.classId) await assertClassWritable(db, task.classId);
    await db.tasks.delete(id);
  });
}
