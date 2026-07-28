import { create } from 'zustand';
import { toast } from 'sonner';

export interface ActionRecord {
  id: string;
  description: string;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
}

interface ActionHistoryState {
  past: ActionRecord[];
  future: ActionRecord[];
  pushAction: (action: Omit<ActionRecord, 'id'>) => void;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  clearHistory: () => void;
  isProcessing: boolean;
}

export const useActionHistoryStore = create<ActionHistoryState>((set, get) => ({
  past: [],
  future: [],
  isProcessing: false,

  pushAction: (action) => {
    set((state) => {
      // Limit history to 50 items to prevent memory bloat
      const newPast = [...state.past, { ...action, id: crypto.randomUUID() }].slice(-50);
      return {
        past: newPast,
        future: [], // Clear future on new action
      };
    });
  },

  undo: async () => {
    const { past, future, isProcessing } = get();
    if (past.length === 0 || isProcessing) return;

    set({ isProcessing: true });
    const actionToUndo = past[past.length - 1];
    const newPast = past.slice(0, past.length - 1);

    try {
      await actionToUndo.undo();
      set({
        past: newPast,
        future: [actionToUndo, ...future],
      });
      toast.success(`Undo: ${actionToUndo.description}`);
    } catch (error) {
      console.error("Failed to undo action:", error);
      toast.error(`Failed to undo: ${actionToUndo.description}`);
    } finally {
      set({ isProcessing: false });
    }
  },

  redo: async () => {
    const { past, future, isProcessing } = get();
    if (future.length === 0 || isProcessing) return;

    set({ isProcessing: true });
    const actionToRedo = future[0];
    const newFuture = future.slice(1);

    try {
      await actionToRedo.redo();
      set({
        past: [...past, actionToRedo],
        future: newFuture,
      });
      toast.success(`Redo: ${actionToRedo.description}`);
    } catch (error) {
      console.error("Failed to redo action:", error);
      toast.error(`Failed to redo: ${actionToRedo.description}`);
    } finally {
      set({ isProcessing: false });
    }
  },

  clearHistory: () => set({ past: [], future: [] }),
}));
