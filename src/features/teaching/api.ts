import { db, type TeachingSession } from '@/db/database';
import { DomainNotFoundError } from '@/lib/domainErrors';
import { validateTeachingSession } from '@/lib/validation';

export type TeachingSessionInput = Omit<TeachingSession, 'id'>;

export async function recordTeachingSession(input: TeachingSessionInput): Promise<TeachingSession> {
  const session: TeachingSession = { id: crypto.randomUUID(), ...input };
  validateTeachingSession(session);

  return db.transaction(
    'rw',
    [db.teachingSessions, db.classes, db.subjects, db.notes],
    async () => {
      if (!(await db.classes.get(session.classId))) {
        throw new DomainNotFoundError('Class', session.classId);
      }
      if (session.subjectId && !(await db.subjects.get(session.subjectId))) {
        throw new DomainNotFoundError('Subject', session.subjectId);
      }
      if (session.noteId && !(await db.notes.get(session.noteId))) {
        throw new DomainNotFoundError('Note', session.noteId);
      }
      await db.teachingSessions.add(session);
      return session;
    },
  );
}
