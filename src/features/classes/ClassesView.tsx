import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { useLiveQuery } from 'dexie-react-hooks';
import { toast } from 'sonner';

import { db, type Class } from '@/db/database';
import { useTranslation } from '@/hooks/useTranslation';
import { INPUT_LIMITS } from '@/lib/validation';
import { createAcademicPeriod, setActiveAcademicPeriod } from '@/features/academic-periods/api';
import { archiveClass, createClass, promoteStudents, unarchiveClass } from './api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Icon } from '@/components/ui/icon';

const localDate = () => new Date().toISOString().slice(0, 10);

export function ClassesView() {
  const { t, language } = useTranslation();
  const isId = language === 'id';
  const periods = useLiveQuery(() => db.academicPeriods.orderBy('startDate').reverse().toArray());
  const classes = useLiveQuery(() => db.classes.toArray());
  const enrollments = useLiveQuery(() => db.classEnrollments.toArray());
  const [periodId, setPeriodId] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    if (!periodId && periods?.length) setPeriodId(periods.find((item) => item.isActive)?.id ?? periods[0].id);
  }, [periodId, periods]);

  const visibleClasses = useMemo(() => (classes ?? [])
    .filter((cls) => !periodId || cls.academicPeriodId === periodId)
    .filter((cls) => showArchived || !cls.archivedAt), [classes, periodId, showArchived]);

  const [classOpen, setClassOpen] = useState(false);
  const [className, setClassName] = useState('');
  const [classDescription, setClassDescription] = useState('');
  const [periodOpen, setPeriodOpen] = useState(false);
  const [periodForm, setPeriodForm] = useState({ name: '', startDate: localDate(), endDate: localDate() });

  const saveClass = async () => {
    if (!className.trim() || !periodId) return;
    await createClass(className, classDescription, periodId);
    setClassName(''); setClassDescription(''); setClassOpen(false);
    toast.success(t('classesPage.successAdd'));
  };

  const savePeriod = async () => {
    const created = await createAcademicPeriod({ ...periodForm, isActive: true });
    setPeriodId(created.id); setPeriodOpen(false);
    setPeriodForm({ name: '', startDate: localDate(), endDate: localDate() });
    toast.success(isId ? 'Periode akademik dibuat' : 'Academic period created');
  };

  const [promotionOpen, setPromotionOpen] = useState(false);
  const [sourceClass, setSourceClass] = useState<Class | null>(null);
  const [targetPeriodId, setTargetPeriodId] = useState('');
  const [assignments, setAssignments] = useState<Record<string, string[]>>({});
  const [archiveSource, setArchiveSource] = useState(true);
  const [targetName, setTargetName] = useState('');
  const sourceStudents = useLiveQuery(async () => {
    if (!sourceClass) return [];
    const active = (await db.classEnrollments.where('classId').equals(sourceClass.id).toArray()).filter((item) => !item.endedAt);
    return (await db.students.bulkGet(active.map(({ studentId }) => studentId)))
      .filter((student): student is NonNullable<typeof student> => Boolean(student))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [sourceClass?.id]);
  const targetClasses = (classes ?? []).filter((cls) => cls.academicPeriodId === targetPeriodId && !cls.archivedAt);

  const openPromotion = (cls: Class) => {
    const nextPeriod = periods?.find((item) => item.id !== cls.academicPeriodId)?.id ?? '';
    setSourceClass(cls); setTargetPeriodId(nextPeriod); setAssignments({}); setArchiveSource(true); setPromotionOpen(true);
  };
  const toggleAssignment = (studentId: string, classId: string) => {
    setAssignments((current) => {
      const selected = new Set(current[studentId] ?? []);
      if (selected.has(classId)) selected.delete(classId); else selected.add(classId);
      return { ...current, [studentId]: [...selected] };
    });
  };
  const createTarget = async () => {
    if (!targetName.trim() || !targetPeriodId) return;
    await createClass(targetName, undefined, targetPeriodId);
    setTargetName('');
  };
  const confirmPromotion = async () => {
    if (!sourceClass || !targetPeriodId) return;
    await promoteStudents({
      sourceClassId: sourceClass.id,
      targetPeriodId,
      assignments: (sourceStudents ?? []).map((student) => ({ studentId: student.id, targetClassIds: assignments[student.id] ?? [] })),
      archiveSource,
    });
    setPromotionOpen(false);
    toast.success(isId ? 'Kenaikan kelas berhasil disimpan' : 'Promotion saved successfully');
  };

  const assignedCount = Object.values(assignments).filter((ids) => ids.length > 0).length;
  const multiCount = Object.values(assignments).filter((ids) => ids.length > 1).length;

  return (
    <div className="space-y-6 view-enter pb-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><h1 className="page-title">{t('classesPage.title')}</h1><p className="page-description">{t('classesPage.desc')}</p></div>
        <div className="flex flex-wrap gap-2">
          <Dialog open={periodOpen} onOpenChange={setPeriodOpen}>
            <DialogTrigger render={<Button variant="outline" />}><Icon name="date_range" className="mr-2 h-4 w-4" />{isId ? 'Tambah Periode' : 'Add Period'}</DialogTrigger>
            <DialogContent><DialogHeader><DialogTitle>{isId ? 'Periode Akademik Baru' : 'New Academic Period'}</DialogTitle></DialogHeader>
              <div className="space-y-3"><Label>{isId ? 'Nama periode' : 'Period name'}</Label><Input value={periodForm.name} onChange={(e) => setPeriodForm({ ...periodForm, name: e.target.value })} placeholder="2026/2027 Ganjil" />
                <div className="grid grid-cols-2 gap-3"><div><Label>{isId ? 'Mulai' : 'Start'}</Label><Input type="date" value={periodForm.startDate} onChange={(e) => setPeriodForm({ ...periodForm, startDate: e.target.value })} /></div><div><Label>{isId ? 'Selesai' : 'End'}</Label><Input type="date" value={periodForm.endDate} onChange={(e) => setPeriodForm({ ...periodForm, endDate: e.target.value })} /></div></div>
              </div><DialogFooter><Button onClick={savePeriod} disabled={!periodForm.name.trim()}>{t('common.save')}</Button></DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog open={classOpen} onOpenChange={setClassOpen}>
            <DialogTrigger render={<Button />}><Icon name="add" className="mr-2 h-4 w-4" />{t('classesPage.addClass')}</DialogTrigger>
            <DialogContent><DialogHeader><DialogTitle>{t('classesPage.addDialogTitle')}</DialogTitle></DialogHeader>
              <div className="space-y-3"><Label>{t('classesPage.nameLabel')}</Label><Input maxLength={INPUT_LIMITS.entityName} value={className} onChange={(e) => setClassName(e.target.value)} /><Label>{isId ? 'Deskripsi' : 'Description'}</Label><Textarea value={classDescription} onChange={(e) => setClassDescription(e.target.value)} /></div>
              <DialogFooter><Button onClick={saveClass} disabled={!className.trim() || !periodId}>{t('common.save')}</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="panel p-4 flex flex-wrap items-center gap-3">
        <Select value={periodId} onValueChange={setPeriodId}><SelectTrigger className="w-64"><SelectValue placeholder={isId ? 'Pilih periode' : 'Select period'}>{(value) => periods?.find((item) => item.id === value)?.name}</SelectValue></SelectTrigger><SelectContent>{periods?.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}{item.isActive ? ' • Aktif' : ''}</SelectItem>)}</SelectContent></Select>
        {periodId && !periods?.find((item) => item.id === periodId)?.isActive && <Button variant="outline" size="sm" onClick={() => setActiveAcademicPeriod(periodId)}>{isId ? 'Jadikan periode aktif' : 'Make active period'}</Button>}
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />{isId ? 'Tampilkan kelas arsip' : 'Show archived classes'}</label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {visibleClasses.map((cls) => {
          const count = (enrollments ?? []).filter((item) => item.classId === cls.id && !item.endedAt).length;
          return <Card key={cls.id} className={cls.archivedAt ? 'opacity-75' : ''}><CardHeader><CardTitle className="flex items-center justify-between"><span>{cls.name}</span>{cls.archivedAt && <span className="text-xs rounded-full bg-gray-100 px-2 py-1">{isId ? 'Arsip' : 'Archived'}</span>}</CardTitle></CardHeader><CardContent><p className="text-sm text-gray-500 min-h-10">{cls.description}</p><p className="mt-3 text-sm font-medium">{count} {isId ? 'siswa aktif' : 'active students'}</p></CardContent><CardFooter className="flex flex-wrap gap-2"><Link to={`/classes/${cls.id}`}><Button size="sm" variant="outline">{t('dashboard.openClass')}</Button></Link>{!cls.archivedAt ? <><Button size="sm" variant="secondary" onClick={() => openPromotion(cls)}>{isId ? 'Naikkan Kelas' : 'Promote'}</Button><Button size="sm" variant="ghost" onClick={() => archiveClass(cls.id)}>{isId ? 'Arsipkan' : 'Archive'}</Button></> : <Button size="sm" variant="ghost" onClick={() => unarchiveClass(cls.id)}>{isId ? 'Aktifkan kembali' : 'Restore'}</Button>}</CardFooter></Card>;
        })}
      </div>

      <Dialog open={promotionOpen} onOpenChange={setPromotionOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{isId ? `Kenaikan dari ${sourceClass?.name ?? ''}` : `Promote from ${sourceClass?.name ?? ''}`}</DialogTitle><DialogDescription>{isId ? 'Setiap siswa dapat dipetakan ke nol, satu, atau beberapa kelas tujuan.' : 'Each student can be assigned to zero, one, or multiple target classes.'}</DialogDescription></DialogHeader>
          <div className="space-y-4"><div><Label>{isId ? 'Periode tujuan' : 'Target period'}</Label><Select value={targetPeriodId} onValueChange={(value) => { setTargetPeriodId(value); setAssignments({}); }}><SelectTrigger><SelectValue placeholder={isId ? 'Pilih periode' : 'Select period'}>{(value) => periods?.find((item) => item.id === value)?.name}</SelectValue></SelectTrigger><SelectContent>{periods?.filter((item) => item.id !== sourceClass?.academicPeriodId).map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select></div>
            <div className="flex gap-2"><Input value={targetName} onChange={(e) => setTargetName(e.target.value)} placeholder={isId ? 'Buat kelas tujuan baru' : 'Create a new target class'} /><Button type="button" variant="outline" onClick={createTarget} disabled={!targetPeriodId || !targetName.trim()}>{isId ? 'Buat' : 'Create'}</Button></div>
            <div className="border rounded-xl overflow-hidden"><div className="grid grid-cols-[minmax(160px,1fr)_2fr] bg-gray-50 dark:bg-gray-800 p-3 text-xs font-bold"><span>{isId ? 'Siswa' : 'Student'}</span><span>{isId ? 'Kelas tujuan' : 'Target classes'}</span></div>{sourceStudents?.map((student) => <div key={student.id} className="grid grid-cols-[minmax(160px,1fr)_2fr] gap-3 p-3 border-t"><div><div className="font-medium">{student.name}</div><div className="text-xs text-gray-400">{student.nis}</div></div><div className="flex flex-wrap gap-2">{targetClasses.map((target) => <label key={target.id} className="flex items-center gap-1.5 text-sm rounded-lg border px-2 py-1"><input type="checkbox" checked={(assignments[student.id] ?? []).includes(target.id)} onChange={() => toggleAssignment(student.id, target.id)} />{target.name}</label>)}{!targetClasses.length && <span className="text-sm text-gray-400">{isId ? 'Buat kelas tujuan terlebih dahulu.' : 'Create a target class first.'}</span>}</div></div>)}</div>
            <div className="rounded-xl bg-primary/5 p-3 text-sm">{assignedCount}/{sourceStudents?.length ?? 0} {isId ? 'siswa mendapat kelas tujuan' : 'students assigned'} · {multiCount} {isId ? 'masuk beberapa kelas' : 'assigned to multiple classes'}</div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={archiveSource} onChange={(e) => setArchiveSource(e.target.checked)} />{isId ? 'Arsipkan kelas asal setelah berhasil' : 'Archive source class after completion'}</label>
          </div><DialogFooter><Button variant="outline" onClick={() => setPromotionOpen(false)}>{t('common.cancel')}</Button><Button onClick={confirmPromotion} disabled={!targetPeriodId}>{isId ? 'Konfirmasi Kenaikan' : 'Confirm Promotion'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
