import { describe, expect, it } from 'vitest';
import type { ClassEnrollment, Subject } from '@/db/database';
import { getSubjectsForClass, partitionSubjectsForClasses } from '@/lib/subjectRelations';

describe('subjectRelations', () => {
  const enrollments: ClassEnrollment[] = [
    { id: 'e1', classId: 'class-xa', studentId: 's1', enrolledAt: '2026-07-01' },
    { id: 'e2', classId: 'class-xb', studentId: 's2', enrolledAt: '2026-07-01' },
    { id: 'e3', classId: 'class-xb', studentId: 's3', enrolledAt: '2026-07-01', endedAt: '2026-08-01' },
  ];

  const subjects: Subject[] = [
    { id: 'subj-info', name: 'Informatika', classIds: ['class-xa', 'class-xb'] },
    { id: 'subj-math', name: 'Matematika', assignedStudents: ['s1'] },
    { id: 'subj-phys', name: 'Fisika', assignedStudents: ['s3'] }, // ended enrollment only
    { id: 'subj-art', name: 'Seni Budaya' }, // unassigned
  ];

  it('matches subjects linked directly via classIds even when class has no students', () => {
    const emptyClassSubject: Subject = { id: 'subj-empty', name: 'Bahasa', classIds: ['class-empty'] };
    expect(getSubjectsForClass([emptyClassSubject], 'class-empty', [])).toEqual([emptyClassSubject]);
  });

  it('matches subjects linked via either direct classIds or active student enrollments', () => {
    expect(getSubjectsForClass(subjects, 'class-xa', enrollments).map((s) => s.id)).toEqual([
      'subj-info',
      'subj-math',
    ]);
    expect(getSubjectsForClass(subjects, 'class-xb', enrollments).map((s) => s.id)).toEqual([
      'subj-info',
    ]);
  });

  it('partitions shared subjects (taken by all selected classes) from other subjects', () => {
    const result = partitionSubjectsForClasses(subjects, ['class-xa', 'class-xb'], enrollments);
    expect(result.shared.map((s) => s.id)).toEqual(['subj-info']);
    expect(result.other.map((s) => s.id)).toEqual(['subj-math', 'subj-phys', 'subj-art']);
  });

  it('keeps all subjects selectable in other when selected classes have no shared subject yet', () => {
    const result = partitionSubjectsForClasses(subjects, ['class-empty-1', 'class-empty-2'], []);
    expect(result.shared).toEqual([]);
    expect(result.other.map((s) => s.id)).toEqual(['subj-info', 'subj-math', 'subj-phys', 'subj-art']);
  });

  it('returns all subjects as shared when no specific classes are selected', () => {
    const result = partitionSubjectsForClasses(subjects, [], enrollments);
    expect(result.shared.map((s) => s.id)).toEqual(['subj-info', 'subj-math', 'subj-phys', 'subj-art']);
    expect(result.other).toEqual([]);
  });
});
