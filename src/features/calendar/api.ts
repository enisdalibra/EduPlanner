import { db, type Task } from '@/db/database';
import { DomainNotFoundError } from '@/lib/domainErrors';
import { validateTask } from '@/lib/validation';

export type TaskInput = Omit<Task, 'id'>;

async function assertTaskRelations(task: Partial<Pick<Task, 'classId' | 'subjectId'>>): Promise<void> {
  if (task.classId && !(await db.classes.get(task.classId))) {
    throw new DomainNotFoundError('Class', task.classId);
  }
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
    if (!(await db.tasks.get(id))) throw new DomainNotFoundError('Task', id);
    await assertTaskRelations(updates);
    await db.tasks.update(id, updates);
  });
}

export async function toggleTaskStatus(id: string): Promise<Task['status']> {
  return db.transaction('rw', db.tasks, async () => {
    const task = await db.tasks.get(id);
    if (!task) throw new DomainNotFoundError('Task', id);
    const status: Task['status'] = task.status === 'pending' ? 'completed' : 'pending';
    await db.tasks.update(id, { status });
    return status;
  });
}

export async function deleteTask(id: string): Promise<void> {
  await db.transaction('rw', db.tasks, async () => {
    if (!(await db.tasks.get(id))) throw new DomainNotFoundError('Task', id);
    await db.tasks.delete(id);
  });
}
