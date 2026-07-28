export type AttendanceStatus = 'hadir' | 'sakit' | 'izin' | 'alpa';

export interface AttendanceDraft {
  id?: string;
  studentId: string;
  status: AttendanceStatus;
}

export class AttendanceService {
  static calculateStatistics(drafts: Record<string, AttendanceDraft>) {
    let hadir = 0, sakit = 0, izin = 0, alpa = 0;
    Object.values(drafts).forEach(d => {
      if (d.status === 'hadir') hadir++;
      else if (d.status === 'sakit') sakit++;
      else if (d.status === 'izin') izin++;
      else if (d.status === 'alpa') alpa++;
    });
    
    return [
      { name: 'Hadir', value: hadir, fill: '#10b981' }, 
      { name: 'Sakit', value: sakit, fill: '#f59e0b' }, 
      { name: 'Izin',  value: izin, fill: '#3b82f6' }, 
      { name: 'Alpa',  value: alpa, fill: '#f43f5e' }, 
    ];
  }
}