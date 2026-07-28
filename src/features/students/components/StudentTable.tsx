import { useRef } from "react";
import { Link } from "react-router";
;
import { type Student, type Class } from "@/db/database";
import { Button } from "@/components/ui/button";
import { SimpleTooltip } from "@/components/ui/simple-tooltip";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Icon } from "@/components/ui/icon";

interface StudentTableProps {
  students: Student[] | undefined;
  classes: Class[] | undefined;
  t: (key: string) => string;
  onEdit: (student: Student) => void;
  onDelete: (student: Student) => void;
}

export function StudentTable({ students, classes, t, onEdit, onDelete }: StudentTableProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  
  const studentList = students || [];
  
  const rowVirtualizer = useVirtualizer({
    count: studentList.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 73, // Approx row height with padding
    overscan: 5,
  });

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col h-[600px] max-h-[70vh]">
      <div ref={parentRef} className="overflow-auto flex-1 relative">
        <table className="w-full text-sm text-left table-fixed border-collapse separate border-spacing-0">
          <thead className="sticky top-0 z-10 bg-[#f0eef9] dark:bg-gray-700/80 shadow-sm">
            <tr className="flex w-full">
              <th className="px-6 py-3.5 flex-1 text-xs font-semibold text-primary dark:text-[#b4a4f4] uppercase tracking-wide">{t('studentsPage.thName')}</th>
              <th className="px-6 py-3.5 w-32 text-xs font-semibold text-primary dark:text-[#b4a4f4] uppercase tracking-wide">{t('studentsPage.thNis')}</th>
              <th className="px-6 py-3.5 w-48 text-xs font-semibold text-primary dark:text-[#b4a4f4] uppercase tracking-wide">{t('studentsPage.thClass')}</th>
              <th className="px-6 py-3.5 w-32 text-right text-xs font-semibold text-primary dark:text-[#b4a4f4] uppercase tracking-wide">{t('studentsPage.thAction')}</th>
            </tr>
          </thead>
          <tbody 
            className="divide-y divide-gray-100 dark:divide-gray-700/60 block relative"
            style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
          >
            {studentList.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-10 text-center text-gray-500 dark:text-gray-400 block w-full">
                  {t('studentsPage.noStudentsFound')}
                </td>
              </tr>
            ) : (
              rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const student = studentList[virtualRow.index];
                const studentClass = classes?.find(c => c.id === student.classId);
                return (
                  <tr 
                    key={student.id} 
                    className="hover:bg-[#f5f3ff] dark:hover:bg-gray-700/30 transition-colors absolute w-full flex items-center"
                    style={{
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    <td className="px-6 py-4 font-semibold text-text dark:text-white flex-1 truncate">
                      {student.name}
                    </td>
                    <td className="px-6 py-4 text-gray-500 dark:text-gray-400 w-32 truncate">{student.nis}</td>
                    <td className="px-6 py-4 w-48 truncate">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/10 truncate max-w-full">
                        {studentClass?.name || t('studentsPage.deletedClass')}
                      </span>
                    </td>
                    <td className="px-6 py-4 w-32 text-right flex items-center justify-end gap-1">
                      <SimpleTooltip content={t('studentsPage.tooltipProfile')}>
                        <Link to={`/students/${student.id}`}>
                          <Button 
                            variant="ghost" 
                            size="icon-sm" 
                            className="text-gray-400 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-700 h-8 w-8"
                          >
                            <Icon name="visibility" className="w-4 h-4" />
                          </Button>
                        </Link>
                      </SimpleTooltip>
                      <SimpleTooltip content={t('studentsPage.tooltipEdit') || 'Edit Data Siswa'}>
                        <Button 
                          variant="ghost" 
                          size="icon-sm" 
                          className="text-gray-400 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-700 h-8 w-8"
                          onClick={() => onEdit(student)}
                        >
                          <Icon name="edit" className="w-4 h-4" />
                        </Button>
                      </SimpleTooltip>
                      <SimpleTooltip content={t('studentsPage.tooltipDelete')}>
                        <Button 
                          variant="ghost" 
                          size="icon-sm" 
                          className="text-gray-400 hover:text-danger hover:bg-danger/10 h-8 w-8"
                          onClick={() => onDelete(student)}
                        >
                          <Icon name="delete" className="w-4 h-4" />
                        </Button>
                      </SimpleTooltip>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
