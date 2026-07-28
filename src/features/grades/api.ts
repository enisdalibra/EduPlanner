import Dexie from 'dexie';
import { db, type Grade } from '@/db/database';
import { assertAcademicRelations } from '@/lib/academicRelations';
import { validateGrade, ValidationError } from '@/lib/validation';

export async function getGradesByClass(classId: string, subjectId?: string) {
   if (subjectId && subjectId !== 'none') {
     // Use compound index [classId+subjectId] for efficient filtered query
     return await db.grades.where('[classId+subjectId]').equals([classId, subjectId]).toArray();
   }
   return await db.grades.where('classId').equals(classId).toArray();
 }

export async function saveGrade(classId: string, studentId: string, evaluationName: string, score: number, subjectId?: string) {
   const normalizedEvaluationName = evaluationName.trim();
   validateGrade({ evaluationName: normalizedEvaluationName }, true);
   if (!isNaN(score) && score !== null) {
     validateGrade({ classId, studentId, evaluationName: normalizedEvaluationName, score });
   }

   await db.transaction(
     'rw',
     [db.grades, db.classes, db.students, db.subjects],
     async () => {
       await assertAcademicRelations(db, { classId, studentId, subjectId });

       // Use compound index [classId+subjectId+evaluationName] for efficient lookup when subject is specified
       if (subjectId) {
         const existing = await db.grades.where('[classId+subjectId+evaluationName]').equals([classId, subjectId, normalizedEvaluationName]).toArray();
         const match = existing.find(g => g.studentId === studentId);

         if (match) {
           if (isNaN(score) || score === null) {
             await db.grades.delete(match.id);
           } else {
             await db.grades.update(match.id, { score });
           }
         } else if (!isNaN(score) && score !== null) {
           await db.grades.add({
             id: crypto.randomUUID(),
             classId,
             studentId,
             subjectId,
             evaluationName: normalizedEvaluationName,
             score
           });
         }
         return;
       }

       // Use compound index [classId+evaluationName] for efficient lookup without subject
       const allForEval = await db.grades.where('[classId+evaluationName]').equals([classId, normalizedEvaluationName]).toArray();
       const existing = allForEval.find(g => g.studentId === studentId && !g.subjectId);

       if (existing) {
         if (isNaN(score) || score === null) {
           await db.grades.delete(existing.id);
         } else {
           await db.grades.update(existing.id, { score });
         }
       } else if (!isNaN(score) && score !== null) {
         await db.grades.add({
           id: crypto.randomUUID(),
           classId,
           studentId,
           subjectId,
           evaluationName: normalizedEvaluationName,
           score
         });
       }
     },
   );
 }

// Get unique evaluation names for a class and optional subject
export async function getEvaluationsForClass(classId: string, subjectId?: string): Promise<string[]> {
   if (subjectId && subjectId !== 'none') {
     // Use compound index [classId+subjectId+evaluationName] for efficient lookup
     const grades = await db.grades.where('[classId+subjectId+evaluationName]').between(
       [classId, subjectId, Dexie.minKey],
       [classId, subjectId, Dexie.maxKey]
     ).toArray();
     const evals = new Set<string>();
     grades.forEach(g => evals.add(g.evaluationName));
     return Array.from(evals).sort();
   }
   // Use compound index [classId+evaluationName] for efficient lookup
   const grades = await db.grades.where('[classId+evaluationName]').between(
     [classId, Dexie.minKey],
     [classId, Dexie.maxKey]
   ).toArray();
   const evals = new Set<string>();
   grades.forEach(g => evals.add(g.evaluationName));
   return Array.from(evals).sort();
 }

async function getGradesForEvaluation(
  classId: string,
  evaluationName: string,
  subjectId?: string,
): Promise<Grade[]> {
  if (subjectId) {
    return db.grades
      .where('[classId+subjectId+evaluationName]')
      .equals([classId, subjectId, evaluationName])
      .toArray();
  }
  return db.grades
    .where('[classId+evaluationName]')
    .equals([classId, evaluationName])
    .filter((grade) => !grade.subjectId)
    .toArray();
}

export async function renameEvaluation(
  classId: string,
  oldName: string,
  newName: string,
  subjectId?: string,
): Promise<number> {
  const normalizedOldName = oldName.trim();
  const normalizedNewName = newName.trim();
  const normalizedSubjectId =
    subjectId && subjectId !== 'none' ? subjectId : undefined;

  if (!normalizedOldName) {
    throw new ValidationError('Current evaluation name is required');
  }
  validateGrade({ evaluationName: normalizedNewName }, true);
  if (normalizedOldName === normalizedNewName) return 0;

  return db.transaction('rw', db.grades, async () => {
    const [sourceGrades, targetGrades] = await Promise.all([
      getGradesForEvaluation(
        classId,
        normalizedOldName,
        normalizedSubjectId,
      ),
      getGradesForEvaluation(
        classId,
        normalizedNewName,
        normalizedSubjectId,
      ),
    ]);
    const targetStudentIds = new Set(
      targetGrades.map(({ studentId }) => studentId),
    );
    if (sourceGrades.some(({ studentId }) => targetStudentIds.has(studentId))) {
      throw new ValidationError(
        'Cannot rename evaluation because the target name already has a grade for one or more students',
      );
    }

    await Promise.all(
      sourceGrades.map(({ id }) =>
        db.grades.update(id, { evaluationName: normalizedNewName }),
      ),
    );
    return sourceGrades.length;
  });
}

export async function deleteEvaluation(classId: string, evaluationName: string, subjectId?: string) {
  if (subjectId && subjectId !== 'none') {
    const grades = await db.grades.where('[classId+subjectId+evaluationName]').equals([classId, subjectId, evaluationName]).toArray();
    await Promise.all(grades.map(g => db.grades.delete(g.id)));
  } else {
    const grades = await db.grades.where('[classId+evaluationName]').equals([classId, evaluationName]).toArray();
    await Promise.all(grades.map(g => {
      if (!g.subjectId) {
        return db.grades.delete(g.id);
      }
      return Promise.resolve();
    }));
  }
}
