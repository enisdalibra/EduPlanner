import React, { useState, useRef } from "react";
import { Link } from "react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/database";
import { toast } from "sonner";
import { useTranslation } from "@/hooks/useTranslation";
import { StudentService } from "@/services/StudentService";
import {
  createStudent,
  deleteStudent,
  importStudentsBulk,
  updateStudent,
  type DuplicateNisPolicy,
  type StudentBulkInput,
} from "./api";
import { enrollStudent } from "@/features/classes/api";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { StudentTable } from "./components/StudentTable";
import { Icon } from "@/components/ui/icon";
import { INPUT_LIMITS } from "@/lib/validation";

export function StudentsView() {
  const [selectedClassId, setSelectedClassId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation();
  
  const classes = useLiveQuery(() => db.classes.toArray());
  const enrollments = useLiveQuery(() => db.classEnrollments.toArray());
  const students = useLiveQuery(async () => {
    let arr = await db.students.toArray();
    if (selectedClassId !== "all") {
      const studentIds = new Set(
        (await db.classEnrollments.where('classId').equals(selectedClassId).toArray())
          .filter((item) => !item.endedAt)
          .map(({ studentId }) => studentId),
      );
      arr = arr.filter((student) => studentIds.has(student.id));
    }
      if (!searchQuery) return arr;
      const lowerQ = searchQuery.toLowerCase();
      return arr.filter(s => 
        (s.name && s.name.toLowerCase().includes(lowerQ)) || 
        (s.nis && s.nis.toLowerCase().includes(lowerQ))
      );
  }, [selectedClassId, searchQuery]);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newStudent, setNewStudent] = useState({ name: "", nis: "", classId: "" });

  const [studentToEdit, setStudentToEdit] = useState<{ id: string, name: string, nis: string, classId: string } | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const [studentToDelete, setStudentToDelete] = useState<{ id: string, name: string } | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importClassId, setImportClassId] = useState<string>("");
  const [duplicateNisPolicy, setDuplicateNisPolicy] = useState<DuplicateNisPolicy>("reject");
  const [importPreview, setImportPreview] = useState<StudentBulkInput[] | null>(null);

  const confirmDelete = async () => {
    if (studentToDelete) {
      await deleteStudent(studentToDelete.id);
      toast.success(t('studentsPage.successDelete'));
      setIsDeleteDialogOpen(false);
      setStudentToDelete(null);
    }
  };

  const handleEditStudent = async () => {
    if (!studentToEdit?.name || !studentToEdit?.classId) {
      toast.error(t('studentsPage.errorEmptyClass'));
      return;
    }
    
    await updateStudent(studentToEdit.id, {
      name: studentToEdit.name,
      nis: studentToEdit.nis || "-"
    });
    await enrollStudent(studentToEdit.classId, studentToEdit.id);
    
    setIsEditDialogOpen(false);
    setStudentToEdit(null);
    toast.success(t('studentsPage.successEdit', { name: studentToEdit.name }) || 'Data siswa berhasil diubah');
  };

  const handleAddStudent = async () => {
    if (!newStudent.name || !newStudent.classId) {
      toast.error(t('studentsPage.errorEmptyClass'));
      return;
    }
    
    await createStudent(newStudent.classId, newStudent.name, newStudent.nis || "-");
    
    setNewStudent({ name: "", nis: "", classId: "" });
    setIsAddDialogOpen(false);
    toast.success(t('studentsPage.successAdd'));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!importClassId) {
      toast.error(t('studentsPage.errorSelectClass'));
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    try {
      const roster = await StudentService.parseExcelImport(file);
      setImportPreview(roster);
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : t('studentsPage.errorProcessExcel'));
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const confirmImport = async () => {
    if (!importClassId || !importPreview) return;
    try {
      const result = await importStudentsBulk(importClassId, importPreview, duplicateNisPolicy);
      toast.success(t('studentsPage.successImport', { count: result.students.length }));
      if (result.linked > 0) toast.info(`${result.linked} ${t('studentsPage.importLinked')}`);
      if (result.skipped > 0) {
        toast.warning(t('studentsPage.skippedDuplicates', { count: result.skipped }));
      }
      setIsImportDialogOpen(false);
      setImportClassId("");
      setDuplicateNisPolicy("reject");
      setImportPreview(null);
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : t('studentsPage.errorProcessExcel'));
    }
  };

  const downloadTemplate = async () => {
    try {
      await StudentService.generateImportTemplate();
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : t('studentsPage.errorProcessExcel'));
    }
  };

  return (
    <div className="space-y-6 view-enter">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="page-title">{t('studentsPage.title')}</h1>
          <p className="page-description">{t('studentsPage.desc')}</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
            <DialogTrigger render={<Button variant="outline" className="text-primary border-primary/20 hover:bg-primary/5" />}>
              <Icon name="upload_file" className="w-4 h-4 mr-2" />
              {t('studentsPage.btnImport')}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>{t('studentsPage.importTitle')}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>{t('studentsPage.importStep1')}</Label>
                  <Select value={importClassId} onValueChange={setImportClassId}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('studentsPage.classPlaceholder')}>
                        {(value) => classes?.find(c => c.id === value)?.name ?? t('studentsPage.classPlaceholder')}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {classes?.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('studentsPage.importStep2')}</Label>
                  <Button variant="secondary" size="sm" onClick={downloadTemplate} className="w-full">
                    <Icon name="download" className="w-4 h-4 mr-2" />
                    {t('studentsPage.btnDownloadTemplate')}
                  </Button>
                  <p className="text-xs text-gray-500">
                    {t('studentsPage.templateDesc')}
                  </p>
                </div>
                <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                  <Label>{t('studentsPage.duplicatePolicyLabel')}</Label>
                  <Select
                    value={duplicateNisPolicy}
                    onValueChange={(value: DuplicateNisPolicy) => setDuplicateNisPolicy(value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="reject">{t('studentsPage.duplicatePolicyReject')}</SelectItem>
                      <SelectItem value="skip">{t('studentsPage.duplicatePolicySkip')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500">{t('studentsPage.duplicatePolicyDesc')}</p>
                </div>
                <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                  <Label>{t('studentsPage.importStep3')}</Label>
                  <Input 
                    type="file" 
                    accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    disabled={!importClassId}
                    onChange={handleFileUpload}
                     ref={fileInputRef}
                  />
                  {!importClassId && <p className="text-xs text-danger">{t('studentsPage.selectClassTarget')}</p>}
                </div>
                {importPreview && <div className="rounded-xl border bg-gray-50 dark:bg-gray-800 p-3 text-sm space-y-1">
                  <div className="font-semibold">{t('studentsPage.importPreviewTitle')}</div>
                  <div>{importPreview.length} {t('studentsPage.importPreviewRows')}</div>
                  <div>{importPreview.filter((row) => students?.some((student) => student.nis === row.nis)).length} {t('studentsPage.importPreviewLinked')}</div>
                </div>}
              </div>
              {importPreview && <DialogFooter><Button variant="outline" onClick={() => setImportPreview(null)}>{t('common.cancel')}</Button><Button onClick={confirmImport}>{t('studentsPage.importConfirm')}</Button></DialogFooter>}
            </DialogContent>
          </Dialog>

          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger render={<Button />}>
              <Icon name="add" className="w-4 h-4 mr-2" />
              {t('studentsPage.btnAdd')}
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('studentsPage.addTitle')}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>{t('studentsPage.classLabel')}</Label>
                  <Select value={newStudent.classId} onValueChange={(val) => setNewStudent({...newStudent, classId: val})}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('studentsPage.classPlaceholder')}>
                        {(value) => classes?.find(c => c.id === value)?.name ?? t('studentsPage.classPlaceholder')}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {classes?.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('studentsPage.nameLabel')}</Label>
                  <Input 
                    placeholder={t('studentsPage.namePlaceholder')} 
                    value={newStudent.name}
                    maxLength={INPUT_LIMITS.personName}
                    onChange={(e) => setNewStudent({...newStudent, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('studentsPage.nisLabel')}</Label>
                  <Input 
                    placeholder={t('studentsPage.nisPlaceholder')} 
                    value={newStudent.nis}
                    maxLength={INPUT_LIMITS.identifier}
                    onChange={(e) => setNewStudent({...newStudent, nis: e.target.value})}
                  />
                </div>
                <Button onClick={handleAddStudent} className="w-full mt-4">{t('studentsPage.btnSave')}</Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('studentsPage.editTitle') || 'Edit Data Siswa'}</DialogTitle>
              </DialogHeader>
              {studentToEdit && (
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>{t('studentsPage.classLabel')}</Label>
                    <Select value={studentToEdit.classId} onValueChange={(val) => setStudentToEdit({...studentToEdit, classId: val})}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('studentsPage.classPlaceholder')}>
                          {(value) => classes?.find(c => c.id === value)?.name ?? t('studentsPage.classPlaceholder')}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {classes?.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('studentsPage.nameLabel')}</Label>
                    <Input 
                      placeholder={t('studentsPage.namePlaceholder')} 
                      value={studentToEdit.name}
                      maxLength={INPUT_LIMITS.personName}
                      onChange={(e) => setStudentToEdit({...studentToEdit, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('studentsPage.nisLabel')}</Label>
                    <Input 
                      placeholder={t('studentsPage.nisPlaceholder')} 
                      value={studentToEdit.nis}
                      maxLength={INPUT_LIMITS.identifier}
                      onChange={(e) => setStudentToEdit({...studentToEdit, nis: e.target.value})}
                    />
                  </div>
                  <Button onClick={handleEditStudent} className="w-full mt-4">{t('studentsPage.btnSave')}</Button>
                </div>
              )}
            </DialogContent>
          </Dialog>

          <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle className="text-danger">{t('common.delete') || 'Hapus Siswa'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {studentToDelete ? t('studentsPage.confirmDelete', { name: studentToDelete.name }) : ''}
                </p>
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>{t('common.cancel')}</Button>
                  <Button variant="destructive" onClick={confirmDelete}>{t('common.delete')}</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="panel flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input 
              placeholder={t('studentsPage.searchPlaceholder')} 
              className="pl-9"
              value={searchQuery}
              maxLength={INPUT_LIMITS.title}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="w-full sm:w-64">
          <Select value={selectedClassId} onValueChange={setSelectedClassId}>
            <SelectTrigger>
              <SelectValue placeholder={t('studentsPage.filterAllClasses')}>
                {(value) => value === 'all'
                  ? t('studentsPage.filterAllClasses')
                  : classes?.find(c => c.id === value)?.name ?? t('studentsPage.classPlaceholder')}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('studentsPage.filterAllClasses')}</SelectItem>
              {classes?.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <StudentTable 
        students={students} 
        classes={classes} 
        enrollments={enrollments}
        t={t} 
        onEdit={(student) => {
          const classId = enrollments?.find((item) => item.studentId === student.id && !item.endedAt)?.classId ?? "";
          setStudentToEdit({ id: student.id, name: student.name, nis: student.nis, classId });
          setIsEditDialogOpen(true);
        }}
        onDelete={(student) => {
          setStudentToDelete({ id: student.id, name: student.name });
          setIsDeleteDialogOpen(true);
        }}
      />
    </div>
  );
}
