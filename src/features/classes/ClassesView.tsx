import { useState } from "react";
import type React from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Link } from "react-router";
import { db } from "@/db/database";
import { createClass, deleteClass, updateClass } from "./api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { SimpleTooltip } from "@/components/ui/simple-tooltip";
import { toast } from "sonner";
import { useTranslation } from "@/hooks/useTranslation";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { useTimerStore } from "@/store/timerStore";
import { INPUT_LIMITS } from "@/lib/validation";

export function ClassesView() {
  const classes = useLiveQuery(() => db.classes.toArray());
  const { t } = useTranslation();
  const { activeTimer, clearTimer } = useTimerStore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newClassName, setNewClassName] = useState("");
  const [newClassDesc, setNewClassDesc] = useState("");

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editClassId, setEditClassId] = useState("");
  const [editClassName, setEditClassName] = useState("");
  const [editClassDesc, setEditClassDesc] = useState("");

  const handleCreate = async () => {
    if (!newClassName.trim()) {
      toast.error(t('classesPage.errorEmpty'));
      return;
    }
    try {
      await createClass(newClassName.trim(), newClassDesc.trim());
      toast.success(t('classesPage.successAdd'));
      setIsDialogOpen(false);
      setNewClassName("");
      setNewClassDesc("");
    } catch (e) {
      toast.error(t('classesPage.errorAdd'));
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    if (confirm(t('classesPage.confirmDelete'))) {
      await deleteClass(id);
      if (activeTimer?.classId === id) {
        clearTimer();
      }
      toast.success(t('classesPage.successDelete'));
    }
  };

  const handleEditClick = (e: React.MouseEvent, cls: { id: string, name: string, description?: string }) => {
    e.preventDefault();
    setEditClassId(cls.id);
    setEditClassName(cls.name);
    setEditClassDesc(cls.description || "");
    setIsEditDialogOpen(true);
  };

  const handleUpdate = async () => {
    if (!editClassName.trim()) {
      toast.error(t('classesPage.errorEmpty'));
      return;
    }
    try {
      await updateClass(editClassId, editClassName.trim(), editClassDesc.trim());
      toast.success(t('classesPage.successUpdate'));
      setIsEditDialogOpen(false);
    } catch (e) {
      toast.error(t('classesPage.errorUpdate'));
    }
  };

  return (
    <div className="space-y-6 view-enter pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">{t('classesPage.title')}</h1>
          <p className="page-description">{t('classesPage.desc')}</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger render={<Button size="lg" className="w-full sm:w-auto shadow-lg shadow-primary/20" />}>
            <Icon name="add" className="w-5 h-5 mr-2" />
            {t('classesPage.addClass')}
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('classesPage.addDialogTitle')}</DialogTitle>
              <DialogDescription>{t('classesPage.addDialogDesc')}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t('classesPage.nameLabel')}</Label>
                <Input 
                  id="name" 
                  value={newClassName} 
                  maxLength={INPUT_LIMITS.entityName}
                  onChange={e => setNewClassName(e.target.value)}
                  placeholder={t('classesPage.namePlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="desc">{t('classesPage.descLabel')}</Label>
                <Input 
                  id="desc" 
                  value={newClassDesc} 
                  maxLength={INPUT_LIMITS.description}
                  onChange={e => setNewClassDesc(e.target.value)}
                  placeholder={t('classesPage.descPlaceholder')}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>{t('common.cancel')}</Button>
              <Button onClick={handleCreate}>{t('common.save')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {!classes && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="panel h-48 animate-pulse bg-gray-100 dark:bg-gray-800" />
          ))}
        </div>
      )}
      
      {classes && classes.length === 0 && (
        <div className="panel py-20 text-center border-dashed">
          <div className="w-24 h-24 bg-gray-50 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-6">
            <Icon name="groups" className="text-[48px] text-primary" />
          </div>
          <h3 className="text-2xl font-bold text-text dark:text-white tracking-tight mb-3">{t('classesPage.emptyTitle')}</h3>
          <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto leading-relaxed mb-8">
            {t('classesPage.emptyDesc')}
          </p>
          <Button size="lg" onClick={() => setIsDialogOpen(true)} className="shadow-lg shadow-primary/20">
            <Icon name="add" className="w-5 h-5 mr-2" />
            {t('classesPage.addFirstBtn')}
          </Button>
        </div>
      )}

      {classes && classes.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classes.map(cls => (
            <Link key={cls.id} to={`/classes/${cls.id}`} className="block group">
              <Card className="h-full border-gray-100 dark:border-gray-700 hover:border-primary/30 transition-all duration-300">
                <CardHeader>
                  <CardTitle className="group-hover:text-primary transition-colors text-xl font-bold">{cls.name}</CardTitle>
                  <CardDescription className="line-clamp-2">{cls.description || t('classesPage.noDesc')}</CardDescription>
                </CardHeader>
                <CardFooter className="flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
                  <div className="text-xs font-bold uppercase tracking-wider text-primary flex items-center bg-primary/10 px-3 py-1.5 rounded-full">
                    <Icon name="groups" className="w-3.5 h-3.5 mr-1.5" />
                    {t('classesPage.viewStudents')}
                  </div>
                  <div className="flex gap-1">
                    <SimpleTooltip content={t('classesPage.editClass')}>
                      <Button variant="ghost" size="icon-sm" onClick={(e) => handleEditClick(e, cls)}>
                        <Icon name="edit" className="w-4 h-4 text-gray-400 group-hover:text-primary" />
                      </Button>
                    </SimpleTooltip>
                    <SimpleTooltip content={t('classesPage.deleteTooltip')}>
                      <Button variant="ghost" size="icon-sm" onClick={(e) => handleDelete(e, cls.id)}>
                        <Icon name="delete" className="w-4 h-4 text-gray-400 hover:text-danger" />
                      </Button>
                    </SimpleTooltip>
                  </div>
                </CardFooter>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('classesPage.editClass')}</DialogTitle>
            <DialogDescription>{t('classesPage.editDialogDesc')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">{t('classesPage.nameLabel')}</Label>
              <Input 
                id="edit-name" 
                value={editClassName} 
                maxLength={INPUT_LIMITS.entityName}
                onChange={e => setEditClassName(e.target.value)}
                placeholder={t('classesPage.namePlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-desc">{t('classesPage.descLabel')}</Label>
              <Input 
                id="edit-desc" 
                value={editClassDesc} 
                maxLength={INPUT_LIMITS.description}
                onChange={e => setEditClassDesc(e.target.value)}
                placeholder={t('classesPage.descPlaceholder')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsEditDialogOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleUpdate}>{t('common.save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
