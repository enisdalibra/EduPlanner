import React, { useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { GradeService } from "@/services/GradeService";
import { INPUT_LIMITS } from "@/lib/validation";
import { useVirtualizer } from "@tanstack/react-virtual";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Icon } from "@/components/ui/icon";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface GradebookTableProps {
  students: {id: string, name: string}[];
  evaluations: string[];
  gradesMap: Record<string, Record<string, string>>;
  t: (key: string, variables?: Record<string, string | number>) => string;
  onScoreChange: (studentId: string, evalName: string, val: string) => void;
  onScoreBlur: (studentId: string, evalName: string, val: string) => void;
  onScoreFocus: (studentId: string, evalName: string, val: string) => void;
  onRenameEval: (oldName: string, newName: string) => Promise<boolean>;
  onDeleteEval: (name: string) => void;
}

export function GradebookTable({ 
  students, evaluations, gradesMap, t, 
  onScoreChange, onScoreBlur, onScoreFocus,
  onRenameEval, onDeleteEval 
}: GradebookTableProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  
  // States for rename dialog
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [evalToRename, setEvalToRename] = useState("");
  const [newName, setNewName] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);

  const rowVirtualizer = useVirtualizer({
    count: students.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 49, // Approx height of a row
    overscan: 5,
  });

  const handleRename = async () => {
    const normalizedName = newName.trim();
    if (!normalizedName || normalizedName === evalToRename || isRenaming) {
      setIsRenameOpen(false);
      return;
    }

    setIsRenaming(true);
    try {
      const renamed = await onRenameEval(evalToRename, normalizedName);
      if (renamed) setIsRenameOpen(false);
    } catch (error) {
      console.error("Unexpected evaluation rename failure:", error);
    } finally {
      setIsRenaming(false);
    }
  };

  const navigateCell = (r: number, c: number) => {
    if (r < 0 || r >= students.length || c < 0 || c >= evaluations.length) return;
    rowVirtualizer.scrollToIndex(r, { align: 'auto' });
    setTimeout(() => {
      const nextInput = document.querySelector(`input[data-rowindex="${r}"][data-colindex="${c}"]`) as HTMLInputElement;
      if (nextInput) {
        nextInput.focus();
        nextInput.select();
      }
    }, 50);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, rowIndex: number, colIndex: number) => {
    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        navigateCell(rowIndex - 1, colIndex);
        break;
      case 'ArrowDown':
      case 'Enter':
        e.preventDefault();
        navigateCell(rowIndex + 1, colIndex);
        break;
      case 'Escape':
        e.currentTarget.blur();
        break;
    }
  };

  if (students.length === 0) {
    return <div className="p-10 text-center text-slate-500">{t('gradebookPage.emptyStudents')}</div>;
  }

  return (
    <div ref={parentRef} className="w-full flex-1 overflow-auto border-t border-gray-100 dark:border-gray-700">
      <div className="text-sm text-left relative flex flex-col w-max min-w-full">
        {/* Header */}
        <div className="bg-gray-50 dark:bg-gray-900 sticky top-0 z-30 border-b border-gray-200 dark:border-gray-700 flex items-center shadow-sm h-[49px]">
          <div className="px-4 py-3 w-16 flex-none text-center font-bold text-gray-500 dark:text-gray-400 sticky left-0 bg-gray-50 dark:bg-gray-900 z-40">
            {t('gradebookPage.thNo')}
          </div>
          <div className="px-4 py-3 w-[200px] flex-none font-bold text-gray-500 dark:text-gray-400 sticky left-16 bg-gray-50 dark:bg-gray-900 z-40 border-r border-gray-200 dark:border-gray-700">
            {t('gradebookPage.thName')}
          </div>
          {evaluations.map(ev => (
            <div key={ev} className="group relative px-4 py-3 w-[120px] flex-none text-center font-bold text-gray-500 dark:text-gray-400 border-r border-gray-200 dark:border-gray-700 flex items-center justify-center gap-1">
              <span className="truncate">{ev}</span>
              <DropdownMenu>
                <DropdownMenuTrigger render={<button className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-all" />}>
                   <Icon name="more_vert" className="w-3.5 h-3.5" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => {
                    setEvalToRename(ev);
                    setNewName(ev);
                    setIsRenameOpen(true);
                  }}>
                    <Icon name="edit" className="w-4 h-4 mr-2" />
                    {t('gradebookPage.rename')}
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-danger" onClick={() => onDeleteEval(ev)}>
                    <Icon name="delete" className="w-4 h-4 mr-2" />
                    {t('gradebookPage.deleteColumn')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
          {/* Spacer */}
          <div className="flex-1 min-w-4 bg-gray-50 dark:bg-gray-900" />
          <div className="px-4 py-3 w-[100px] flex-none text-center font-bold text-gray-500 dark:text-gray-400 border-l border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 sticky right-0 z-40 shadow-[-4px_0_10px_rgba(0,0,0,0.05)]">
            {t('gradebookPage.average')}
          </div>
          <div className="w-4 flex-none bg-gray-50 dark:bg-gray-900"></div>
        </div>

        {/* Body */}
        <div 
          className="relative w-full"
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const student = students[virtualRow.index];
            return (
              <div 
                key={student.id} 
                className="hover:bg-gray-50/50 dark:hover:bg-gray-900/20 absolute flex items-center bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700/50 w-full"
                style={{
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <div className="px-4 py-2 w-16 flex-none text-center text-gray-400 font-medium sticky left-0 bg-white dark:bg-gray-800 z-10 truncate">
                  {virtualRow.index + 1}
                </div>
                <div className="px-4 py-2 w-[200px] flex-none font-medium text-slate-900 dark:text-white sticky left-16 bg-white dark:bg-gray-800 z-10 border-r border-gray-200 dark:border-gray-700 truncate">
                  {student.name}
                </div>
                {evaluations.map(ev => {
                  const val = gradesMap[student.id]?.[ev] || "";
                  return (
                    <div key={ev} className="px-2 py-2 w-[120px] flex-none border-r border-gray-100 dark:border-gray-700">
                      <Input 
                        type="number"
                        className="h-8 text-center bg-transparent border-transparent hover:border-gray-200 dark:hover:border-gray-600 focus:border-primary rounded-sm font-mono dark:text-white"
                        value={val}
                        onChange={(e) => onScoreChange(student.id, ev, e.target.value)}
                        onBlur={(e) => onScoreBlur(student.id, ev, e.target.value)}
                        onFocus={() => onScoreFocus(student.id, ev, val)}
                        placeholder="-"
                        data-rowindex={virtualRow.index}
                        data-colindex={evaluations.indexOf(ev)}
                        onKeyDown={(e) => handleKeyDown(e, virtualRow.index, evaluations.indexOf(ev))}
                      />
                    </div>
                  );
                })}
                {/* Spacer */}
                <div className="flex-1 min-w-4 h-full" />
                <div className="px-4 py-2 w-[100px] flex-none text-center font-bold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 sticky right-0 z-10 shadow-[-4px_0_10px_rgba(0,0,0,0.05)] truncate h-full flex items-center justify-center">
                  {gradesMap[student.id] ? GradeService.calculateAverage(gradesMap[student.id]).toFixed(1) : "-"}
                </div>
                <div className="w-4 flex-none bg-white dark:bg-gray-800 h-full"></div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Rename Dialog */}
      <Dialog open={isRenameOpen} onOpenChange={setIsRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('gradebookPage.renameTitle')}</DialogTitle>
            <DialogDescription>{t('gradebookPage.renameDesc')}</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>{t('gradebookPage.evalName')}</Label>
            <Input 
              value={newName} 
              maxLength={INPUT_LIMITS.entityName}
              onChange={e => setNewName(e.target.value)} 
              className="mt-2" 
              autoFocus 
              onKeyDown={e => e.key === 'Enter' && void handleRename()}
              disabled={isRenaming}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRenameOpen(false)} disabled={isRenaming}>{t('common.cancel')}</Button>
            <Button onClick={() => void handleRename()} disabled={isRenaming}>{t('common.save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
