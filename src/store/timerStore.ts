import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ActiveTimer {
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
      stopTimer: () => {}, // We'll handle saving to DB in the component, then call clearTimer
      clearTimer: () => set({ activeTimer: null }),
    }),
    {
      name: 'eduplanner-timer', // key in localStorage
    }
  )
);
