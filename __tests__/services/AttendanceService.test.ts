import { describe, expect, it } from 'vitest';

import { AttendanceService } from '@/services/AttendanceService';

describe('AttendanceService', () => {
  it('counts every supported attendance status', () => {
    expect(AttendanceService.calculateStatistics({
      student1: { studentId: 'student-1', status: 'hadir' },
      student2: { studentId: 'student-2', status: 'sakit' },
      student3: { studentId: 'student-3', status: 'izin' },
      student4: { studentId: 'student-4', status: 'alpa' },
      malformed: { studentId: 'malformed', status: 'unknown' as never },
    }).map(({ value }) => value)).toEqual([1, 1, 1, 1]);
  });
});
