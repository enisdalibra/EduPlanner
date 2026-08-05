import { useState, useEffect, useRef, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/database";
import { getGradesByClass, getEvaluationsForClass, saveGrade, renameEvaluation, deleteEvaluation } from "./api";
import { getStudentsByClass } from "../classes/api";
import { useTranslation } from "@/hooks/useTranslation";
import { GradeService } from "@/services/GradeService";
import { GradebookTable } from "./components/GradebookTable";
import { useActionHistoryStore } from "@/store/actionHistoryStore";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Icon } from "@/components/ui/icon";
import { INPUT_LIMITS } from "@/lib/validation";

export function GradebookView() {
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("none");
  const { t } = useTranslation();
  
  const classes = useLiveQuery(() => db.classes.filter((cls) => !cls.archivedAt).toArray());
  const subjects = useLiveQuery(() => db.subjects.toArray());
  
  const [students, setStudents] = useState<{id: string, name: string}[]>([]);
  const [evaluations, setEvaluations] = useState<string[]>([]);
  
  // Filter subjects that have at least one student from the selected class assigned to them
  const availableSubjects = useMemo(() => {
    if (!selectedClassId || !subjects || !students) return [];
    
    // IDs of students in the currently selected class
    const classStudentIds = new Set(students.map(s => s.id));
    
    return subjects.filter(subject => {
      return (subject.assignedStudents || []).some(id => classStudentIds.has(id));
    });
  }, [subjects, selectedClassId, students]);

  // gradesMap: studentId -> evaluationName -> score
  const [gradesMap, setGradesMap] = useState<Record<string, Record<string, string>>>({});
  
  const [newEvalName, setNewEvalName] = useState("");
  const [isNewEvalOpen, setIsNewEvalOpen] = useState(false);

  const activeCellRef = useRef<{studentId: string, evalName: string, val: string} | null>(null);

  const loadData = async () => {
    if (!selectedClassId) return;
    
    const classStudents = await getStudentsByClass(selectedClassId);
    const subjectToUse = selectedSubjectId !== "none" ? selectedSubjectId : undefined;
    const evals = await getEvaluationsForClass(selectedClassId, subjectToUse);
    const allGrades = await getGradesByClass(selectedClassId, subjectToUse);
    
    setStudents(classStudents);
    setEvaluations(evals);
    
    const gMap: Record<string, Record<string, string>> = {};
    classStudents.forEach(s => gMap[s.id] = {});
    
    allGrades.forEach(g => {
      if (!gMap[g.studentId]) gMap[g.studentId] = {};
      gMap[g.studentId][g.evaluationName] = g.score.toString();
    });
    
    setGradesMap(gMap);
  };

  useEffect(() => {
    loadData();
  }, [selectedClassId, selectedSubjectId]);

  // Special effect to reset subject if it becomes invalid for the current class
  useEffect(() => {
    if (selectedClassId && selectedSubjectId !== "none" && availableSubjects.length > 0) {
      if (!availableSubjects.some(s => s.id === selectedSubjectId)) {
        setSelectedSubjectId("none");
      }
    }
  }, [availableSubjects, selectedClassId, selectedSubjectId]);

  const handleScoreFocus = (studentId: string, evalName: string, val: string) => {
    activeCellRef.current = { studentId, evalName, val };
  };

  const handleScoreChange = (studentId: string, evalName: string, val: string) => {
    setGradesMap(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [evalName]: val
      }
    }));
  };

  const handleScoreBlur = async (studentId: string, evalName: string, val: string) => {
    const oldVal = activeCellRef.current?.val || "";
    if (oldVal === val) return; // No change

    const numScore = parseFloat(val);
    const oldNumScore = parseFloat(oldVal);
    const subjectToUse = selectedSubjectId !== "none" ? selectedSubjectId : undefined;
    
    await saveGrade(selectedClassId, studentId, evalName, numScore, subjectToUse);

    useActionHistoryStore.getState().pushAction({
      description: `Ubah nilai ${evalName}`,
      undo: async () => {
        await saveGrade(selectedClassId, studentId, evalName, oldNumScore, subjectToUse);
        setGradesMap(prev => ({
          ...prev,
          [studentId]: { ...prev[studentId], [evalName]: oldVal }
        }));
      },
      redo: async () => {
        await saveGrade(selectedClassId, studentId, evalName, numScore, subjectToUse);
        setGradesMap(prev => ({
          ...prev,
          [studentId]: { ...prev[studentId], [evalName]: val }
        }));
      }
    });
  };

  const handleAddEvaluation = () => {
    if (!newEvalName.trim()) return;
    const name = newEvalName.trim();
    if (!evaluations.includes(name)) {
      setEvaluations(prev => [...prev, name]);
    }
    setNewEvalName("");
    setIsNewEvalOpen(false);
  };

  const handleRenameEval = async (oldName: string, newName: string) => {
    const subjectToUse = selectedSubjectId !== "none" ? selectedSubjectId : undefined;
    try {
      await renameEvaluation(selectedClassId, oldName, newName, subjectToUse);
    } catch (error) {
      console.error("Failed to rename evaluation:", error);
      toast.error(t('gradebookPage.renameError'));
      return false;
    }

    toast.success(t('gradebookPage.renameSuccess'));
    try {
      await loadData();
    } catch (error) {
      console.error("Failed to refresh gradebook after renaming evaluation:", error);
    }
    return true;
  };

  const handleDeleteEval = async (name: string) => {
    if (confirm(t('gradebookPage.confirmDeleteColumn', { name }))) {
      const subjectToUse = selectedSubjectId !== "none" ? selectedSubjectId : undefined;
      await deleteEvaluation(selectedClassId, name, subjectToUse);
      toast.success(t('gradebookPage.deleteSuccess'));
      loadData();
    }
  };

  return (
    <div className="space-y-6 h-full flex flex-col pt-2 md:pt-0">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">{t('gradebookPage.title')}</h1>
          <p className="page-description">{t('gradebookPage.desc')}</p>
        </div>
        
        <div className="w-full lg:w-auto flex flex-col sm:flex-row items-center gap-3">
          <Select value={selectedClassId} onValueChange={setSelectedClassId}>
            <SelectTrigger className="w-full sm:w-[180px] bg-white dark:bg-gray-800 rounded-xl">
              <SelectValue placeholder={t('gradebookPage.selectClass')}>
                {(value) => classes?.find(cls => cls.id === value)?.name ?? t('gradebookPage.selectClass')}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {classes?.map(cls => (
                <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
            <SelectTrigger className="w-full sm:w-[180px] bg-white dark:bg-gray-800 rounded-xl">
              <SelectValue placeholder={t('gradebookPage.allSubjects')}>
                {(value) => value === 'none'
                  ? t('gradebookPage.generalSubject')
                  : availableSubjects.find(subject => subject.id === value)?.name ?? t('gradebookPage.allSubjects')}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t('gradebookPage.generalSubject')}</SelectItem>
              {availableSubjects.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedClassId && (
            <Dialog open={isNewEvalOpen} onOpenChange={setIsNewEvalOpen}>
              <DialogTrigger render={<Button className="w-full sm:w-auto rounded-xl" />}>
                <Icon name="add" className="w-4 h-4 mr-2" />
                {t('gradebookPage.btnNewCol')}
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('gradebookPage.modalTitle')}</DialogTitle>
                  <DialogDescription>{t('gradebookPage.modalDesc')}</DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <Label>{t('gradebookPage.evalName')}</Label>
                  <Input value={newEvalName} maxLength={INPUT_LIMITS.entityName} onChange={e => setNewEvalName(e.target.value)} className="mt-2" />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsNewEvalOpen(false)}>{t('gradebookPage.btnCancel')}</Button>
                  <Button onClick={handleAddEvaluation}>{t('gradebookPage.btnAdd')}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {!selectedClassId ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm">
           <Icon name="fact_check" className="w-12 h-12 mb-4 text-gray-200 dark:text-gray-700" />
           <p className="text-gray-500 dark:text-gray-400 font-medium">{t('gradebookPage.emptyState')}</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col overflow-hidden max-h-[75vh]">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/20 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Icon name="table_chart" className="w-5 h-5 text-primary" />
              <span className="text-sm font-bold text-text dark:text-white uppercase tracking-wider">{t('gradebookPage.tableTitle')}</span>
            </div>
          </div>

          {students.length === 0 ? (
            <div className="p-10 text-center text-slate-500">{t('gradebookPage.emptyStudents')}</div>
          ) : (
            <GradebookTable 
              students={students}
              evaluations={evaluations}
              gradesMap={gradesMap}
              t={t}
              onScoreChange={handleScoreChange}
              onScoreBlur={handleScoreBlur}
              onScoreFocus={handleScoreFocus}
              onRenameEval={handleRenameEval}
              onDeleteEval={handleDeleteEval}
            />
          )}
        </div>
      )}
    </div>
  );
}
