import { describe, expect, it } from 'vitest';

import {
  INPUT_LIMITS,
  ValidationError,
  validateClass,
  validateGrade,
  validateNote,
  validateProfile,
  validateStudent,
  validateStudentNote,
  validateSubject,
  validateTask,
} from '@/lib/validation';

const text = (length: number) => 'x'.repeat(length);

describe('user input length limits', () => {
  it('accepts values at their boundary', () => {
    expect(() =>
      validateStudent({
        name: text(INPUT_LIMITS.personName),
        nis: text(INPUT_LIMITS.identifier),
        classId: 'class-1',
      }),
    ).not.toThrow();
    expect(() =>
      validateNote({
        title: text(INPUT_LIMITS.title),
        content: text(INPUT_LIMITS.noteContent),
        type: 'materi',
      }),
    ).not.toThrow();
  });

  it.each([
    ['student name', () => validateStudent({ name: text(INPUT_LIMITS.personName + 1), nis: '1', classId: 'c1' })],
    ['student NIS', () => validateStudent({ name: 'Student', nis: text(INPUT_LIMITS.identifier + 1), classId: 'c1' })],
    ['class name', () => validateClass({ name: text(INPUT_LIMITS.entityName + 1) })],
    ['class description', () => validateClass({ name: 'Class', description: text(INPUT_LIMITS.description + 1) })],
    ['subject name', () => validateSubject({ name: text(INPUT_LIMITS.entityName + 1) })],
    ['evaluation name', () => validateGrade({ classId: 'c1', studentId: 's1', evaluationName: text(INPUT_LIMITS.entityName + 1), score: 90 })],
    ['note title', () => validateNote({ title: text(INPUT_LIMITS.title + 1), content: '', type: 'materi' })],
    ['note content', () => validateNote({ title: 'Title', content: text(INPUT_LIMITS.noteContent + 1), type: 'materi' })],
    ['student note', () => validateStudentNote({ studentId: 's1', content: text(INPUT_LIMITS.studentNote + 1) })],
    ['profile email', () => validateProfile({ name: 'Teacher', email: `${text(INPUT_LIMITS.email)}@example.com` })],
  ])('rejects an over-limit %s', (_label, validate) => {
    expect(validate).toThrow(ValidationError);
  });

  it('limits task descriptions, tag length, and tag count', () => {
    const base = { title: 'Task', date: '2026-07-28', status: 'pending' as const };
    expect(() =>
      validateTask({ ...base, description: text(INPUT_LIMITS.description + 1) }),
    ).toThrow(ValidationError);
    expect(() =>
      validateTask({ ...base, tags: [text(INPUT_LIMITS.tag + 1)] }),
    ).toThrow(ValidationError);
    expect(() =>
      validateTask({
        ...base,
        tags: Array.from({ length: INPUT_LIMITS.tagsPerTask + 1 }, (_, index) => `tag-${index}`),
      }),
    ).toThrow(ValidationError);
  });

  it('rejects malformed or duplicate subject assignment IDs', () => {
    expect(() =>
      validateSubject({
        name: 'Subject',
        assignedStudents: ['student-1', 'student-1'],
      }),
    ).toThrow(/duplicate/);
    expect(() =>
      validateSubject({
        name: 'Subject',
        assignedStudents: [''],
      }),
    ).toThrow(/non-empty/);
  });
});
