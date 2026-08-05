import { db, type Note } from '@/db/database';
import { validateNote } from '@/lib/validation';
import { DomainNotFoundError } from '@/lib/domainErrors';
import { assertOptionalClassSubjectRelations } from '@/lib/domainRelations';
import { assertClassWritable } from '@/lib/classAccess';

export type NoteUpdate = Partial<Omit<Note, 'id' | 'createdAt'>>;

export async function getNotes(type: 'guru' | 'materi' | 'evaluasi') {
   return await db.notes.where('type').equals(type).reverse().sortBy('createdAt');
}

export async function getNotesByClass(classId: string, type: 'guru' | 'materi' | 'evaluasi') {
   // Use compound index [classId+type] for efficient filtered query
   return await db.notes.where('[classId+type]').equals([classId, type]).reverse().sortBy('createdAt');
}

export async function createNote(title: string, content: string, type: 'guru' | 'materi' | 'evaluasi', classId?: string, subjectId?: string) {
  validateNote({ title, content, type });
  const note: Note = {
    id: crypto.randomUUID(),
    title,
    content,
    type,
    classId,
    subjectId,
    createdAt: new Date()
  };
  return db.transaction('rw', [db.notes, db.classes, db.subjects], async () => {
    await assertOptionalClassSubjectRelations(db, note);
    if (classId) await assertClassWritable(db, classId);
    await db.notes.add(note);
    return note;
  });
}

export async function updateNote(id: string, updates: NoteUpdate) {
  validateNote(updates, true);
  await db.transaction('rw', [db.notes, db.classes, db.subjects], async () => {
    const current = await db.notes.get(id);
    if (!current) throw new DomainNotFoundError('Note', id);
    if (current.classId) await assertClassWritable(db, current.classId);
    if (updates.classId) await assertClassWritable(db, updates.classId);
    await assertOptionalClassSubjectRelations(db, updates);
    await db.notes.update(id, updates);
  });
}

export async function deleteNote(id: string) {
  await db.transaction('rw', [db.notes, db.teachingSessions, db.classes], async () => {
    const note = await db.notes.get(id);
    if (!note) throw new DomainNotFoundError('Note', id);
    if (note.classId) await assertClassWritable(db, note.classId);

    // Preserve teaching history while removing the optional link to the note.
    // `noteId` is not indexed, so the cleanup must use a filtered collection.
    await db.teachingSessions
      .filter((session) => session.noteId === id)
      .modify({ noteId: undefined });
    await db.notes.delete(id);
  });
}
