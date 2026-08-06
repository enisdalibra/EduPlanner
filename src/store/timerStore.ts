import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ActiveTimer {
  classId: string;
  subjectId: string;
  startTime: number;
  noteId?: string;
}

interface TimerState {
  activeTimer: ActiveTimer | null;
  startTimer: (classId: string, subjectId: string, noteId?: string) => void;
  stopTimer: () => void;
  clearTimer: () => void;
}

export const useTimerStore = create<TimerState>()(
  persist(
    (set) => ({
      activeTimer: null,
      startTimer: (classId, subjectId, noteId) => set({ activeTimer: { classId, subjectId, startTime: Date.now(), noteId } }),
      stopTimer: () => set({ activeTimer: null }),
      clearTimer: () => set({ activeTimer: null }),
    }),
    {
      name: 'eduplanner-timer', // key in localStorage
    }
  )
);
