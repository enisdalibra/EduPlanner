import { db, type TeachingSession } from '@/db/database';
import { DomainNotFoundError } from '@/lib/domainErrors';
import { validateTeachingSession } from '@/lib/validation';
import { assertClassWritableAt } from '@/lib/classAccess';

export type TeachingSessionInput = Omit<TeachingSession, 'id'>;

export async function recordTeachingSession(input: TeachingSessionInput): Promise<TeachingSession> {
  const session: TeachingSession = { id: crypto.randomUUID(), ...input };
  validateTeachingSession(session);

  return db.transaction(
    'rw',
    [db.teachingSessions, db.classes, db.subjects, db.notes],
    async () => {
      // A session that began while the class was active may still be completed
      // after an archive/promotion operation. New sessions on archived classes
      // remain forbidden.
      await assertClassWritableAt(db, session.classId, session.startTime);
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
