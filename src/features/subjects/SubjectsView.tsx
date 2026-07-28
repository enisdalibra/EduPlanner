import { useState } from "react";
import type React from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type Subject } from "@/db/database";
import { assignClassToSubject, createSubject, deleteSubject, removeStudentFromSubject } from "./api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SimpleTooltip } from "@/components/ui/simple-tooltip";
import { toast } from "sonner";
import { useTranslation } from "@/hooks/useTranslation";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Icon } from "@/components/ui/icon";
import { INPUT_LIMITS } from "@/lib/validation";

export function SubjectsView() {
  const subjects = useLiveQuery(() => db.subjects.toArray());
  const classes = useLiveQuery(() => db.classes.toArray());
  const students = useLiveQuery(() => db.students.toArray());

  const { t } = useTranslation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSubjectDesc, setNewSubjectDesc] = useState("");

  const [isManageDialogOpen, setIsManageDialogOpen] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<string>("");

  const handleCreate = async () => {
    if (!newSubjectName.trim()) {
      toast.error(t('subjectsPage.errorEmpty'));
      return;
    }
    try {
      await createSubject(newSubjectName.trim(), newSubjectDesc.trim());
      toast.success(t('subjectsPage.successAdd'));
      setIsDialogOpen(false);
      setNewSubjectName("");
      setNewSubjectDesc("");
    } catch (e) {
      toast.error(t('subjectsPage.errorAdd'));
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    if (confirm(t('subjectsPage.confirmDelete'))) {
      await deleteSubject(id);
      toast.success(t('subjectsPage.successDelete'));
    }
  };

  const handleAssignClass = async () => {
    if (!selectedSubject || !selectedClassId || !students) return;
    
    try {
      const updatedAssigned = await assignClassToSubject(selectedSubject.id, selectedClassId);
      setSelectedSubject({ ...selectedSubject, assignedStudents: updatedAssigned });
      setSelectedClassId("");
      toast.success(t('subjectsPage.successAssign') || 'Seluruh siswa kelas berhasil ditambahkan');
    } catch (e) {
      console.error(e);
      toast.error('Gagal menambahkan siswa' as string);
    }
  };

  const handleRemoveStudent = async (studentId: string) => {
    if (!selectedSubject) return;
    try {
      const updatedAssigned = await removeStudentFromSubject(selectedSubject.id, studentId);
      setSelectedSubject({ ...selectedSubject, assignedStudents: updatedAssigned });
      toast.success(t('subjectsPage.successRemoveStudent') || 'Siswa dikeluarkan dari mata pelajaran');
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6 view-enter">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">{t('subjectsPage.title')}</h1>
          <p className="page-description">{t('subjectsPage.desc')}</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger render={<Button />}>
            <Icon name="add" className="w-4 h-4 mr-2" />
            {t('subjectsPage.addSubject')}
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('subjectsPage.addDialogTitle')}</DialogTitle>
              <DialogDescription>{t('subjectsPage.addDialogDesc')}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t('subjectsPage.nameLabel')}</Label>
                <Input 
                  id="name" 
                  value={newSubjectName}
                  maxLength={INPUT_LIMITS.entityName}
                  onChange={e => setNewSubjectName(e.target.value)}
                  placeholder={t('subjectsPage.namePlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="desc">{t('subjectsPage.descLabel')}</Label>
                <Input 
                  id="desc" 
                  value={newSubjectDesc}
                  maxLength={INPUT_LIMITS.description}
                  onChange={e => setNewSubjectDesc(e.target.value)}
                  placeholder={t('subjectsPage.descPlaceholder')}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>{t('common.cancel')}</Button>
              <Button onClick={handleCreate}>{t('common.save')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {!subjects && <p className="text-center text-gray-500 py-10">{t('common.loading')}</p>}
      
      {subjects && subjects.length === 0 && (
        <div className="text-center p-20 panel bg-gray-50/50 dark:bg-gray-800/50 border-dashed">
          <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-6">
            <Icon name="content_copy" className="text-[48px] text-primary" />
          </div>
          <h3 className="text-2xl font-bold text-text dark:text-white tracking-tight mb-3">{t('subjectsPage.emptyTitle')}</h3>
          <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto leading-relaxed mb-8">
            {t('subjectsPage.emptyDesc')}
          </p>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Icon name="add" className="w-4 h-4 mr-2" />
            {t('subjectsPage.addFirstBtn')}
          </Button>
        </div>
      )}

      {subjects && subjects.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {subjects.map(subject => (
            <Card key={subject.id} className="h-full border border-gray-100 dark:border-gray-700 shadow-sm transition-all hover:shadow-lg bg-white dark:bg-gray-800 flex flex-col rounded-3xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-xl text-text dark:text-white">{subject.name}</CardTitle>
                <CardDescription className="line-clamp-2 min-h-[40px]">{subject.description || t('subjectsPage.noDesc')}</CardDescription>
              </CardHeader>
              <div className="flex-1 px-6">
                <div className="flex items-center gap-2 mb-4 text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-xl">
                   <Icon name="group" className="w-4 h-4 text-primary" />
                   <span className="font-bold text-primary">{(subject.assignedStudents || []).length}</span> {t('subjectsPage.studentsCount').replace('{{count}}', '')}
                </div>
              </div>
              <CardFooter className="flex justify-between border-t border-gray-100 dark:border-gray-700 pt-4 pb-4">
                <SimpleTooltip content={t('subjectsPage.tooltipManageStudents') || 'Kelola Siswa'}>
                  <Button variant="ghost" size="sm" className="h-8 text-primary" onClick={() => {
                    setSelectedSubject(subject);
                    setIsManageDialogOpen(true);
                  }}>
                    <Icon name="group" className="w-4 h-4 mr-2" />
                    {t('subjectsPage.manageStudents') || 'Siswa'}
                  </Button>
                </SimpleTooltip>
                <Button variant="ghost" size="sm" className="h-8 text-danger" onClick={(e) => handleDelete(e, subject.id)}>
                  <Icon name="delete" className="w-4 h-4 mr-2" />
                  {t('common.delete')}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Manage Students Dialog */}
      <Dialog open={isManageDialogOpen} onOpenChange={setIsManageDialogOpen}>
        <DialogContent className="sm:max-w-[500px] h-[80vh] flex flex-col p-0 gap-0 overflow-hidden rounded-3xl">
          <DialogHeader className="p-6 pb-2 border-b border-gray-100 dark:border-gray-700 shrink-0">
            <DialogTitle className="text-xl">{selectedSubject?.name}</DialogTitle>
            <DialogDescription>{t('subjectsPage.manageStudents')}</DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto bg-gray-50/50 dark:bg-gray-900/50 p-6 space-y-6">
            
            {/* Assign Class Section */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-text dark:text-white">{t('subjectsPage.assignClass')}</Label>
              <div className="flex flex-col sm:flex-row gap-3">
                 <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                    <SelectTrigger className="w-full bg-white dark:bg-gray-800">
                      <SelectValue placeholder={t('subjectsPage.selectClass')}>
                        {(value) => classes?.find(cls => cls.id === value)?.name ?? t('subjectsPage.selectClass')}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {classes?.map(cls => (
                        <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                      ))}
                    </SelectContent>
                 </Select>
                 <Button onClick={handleAssignClass} disabled={!selectedClassId} className="shrink-0">
                    <Icon name="add" className="w-4 h-4 mr-2" />
                    {t('subjectsPage.btnAssign')}
                 </Button>
              </div>
            </div>

            {/* Enrolled Students List */}
            <div className="space-y-3">
               <div className="flex items-center justify-between">
                 <Label className="text-sm font-semibold text-text dark:text-white">{t('subjectsPage.enrolledStudents')}</Label>
                 <Badge variant="secondary" className="bg-gray-200/50 dark:bg-gray-700 text-gray-600 dark:text-gray-300">{(selectedSubject?.assignedStudents || []).length} {t('common.total')}</Badge>
               </div>
               
               <div className="border border-gray-100 dark:border-gray-700 rounded-2xl shadow-sm overflow-hidden bg-white dark:bg-gray-800">
                  {(!selectedSubject?.assignedStudents || selectedSubject.assignedStudents.length === 0) ? (
                    <div className="p-8 text-center text-gray-500 flex flex-col items-center justify-center space-y-3">
                       <Icon name="group" className="w-8 h-8 text-gray-300" />
                       <span className="text-sm block max-w-[200px] leading-relaxed">{t('subjectsPage.emptyEnrolled')}</span>
                    </div>
                  ) : (
                    <ScrollArea className="h-[300px]">
                      <div className="divide-y divide-gray-100 dark:divide-gray-700/60">
                         {selectedSubject.assignedStudents.map((studentId) => {
                            const student = students?.find(s => s.id === studentId);
                            const className = classes?.find(c => c.id === student?.classId)?.name;
                            
                            if (!student) return null;

                            return (
                              <div key={studentId} className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group">
                                <div className="flex flex-col overflow-hidden mr-3">
                                  <span className="font-semibold text-sm text-text dark:text-white truncate">{student.name}</span>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                     {student.nis && <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded-full border border-gray-200/50 dark:border-gray-600">{student.nis}</span>}
                                     <span className="text-xs text-gray-400 truncate">{className}</span>
                                  </div>
                                </div>
                                <Button 
                                  variant="ghost" 
                                  size="icon-sm" 
                                  className="h-8 w-8 text-gray-400 hover:text-danger hover:bg-danger/10 shrink-0"
                                  onClick={() => handleRemoveStudent(studentId)}
                                >
                                  <Icon name="person_remove" className="w-4 h-4" />
                                </Button>
                              </div>
                            );
                         })}
                      </div>
                    </ScrollArea>
                  )}
               </div>
            </div>
            
          </div>
          
          <DialogFooter className="p-4 border-t border-gray-100 dark:border-gray-700 shrink-0 bg-white dark:bg-gray-800">
             <Button variant="outline" onClick={() => setIsManageDialogOpen(false)}>{t('subjectsPage.btnSaveEnrolled') || 'Tutup'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
