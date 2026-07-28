import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { useActionHistoryStore } from '@/store/actionHistoryStore';

/**
 * Keyboard shortcut configuration
 * @typedef {{ key: string; description: string; tKey: string; path: string }} Shortcut
 */

/**
 * Array of keyboard shortcuts for navigation
 * Each shortcut uses Alt + Shift + [key] combination
 */
export const SHORTCUTS = [
  { key: 'Alt + Shift + D', description: 'Ke Halaman Dashboard', tKey: 'desc_D', path: '/' },
  { key: 'Alt + Shift + P', description: 'Ke Halaman Profile', tKey: 'desc_P', path: '/profile' },
  { key: 'Alt + Shift + M', description: 'Ke Halaman Mata Pelajaran (Subjects)', tKey: 'desc_M', path: '/subjects' },
  { key: 'Alt + Shift + C', description: 'Ke Halaman Kelas (Classes)', tKey: 'desc_C', path: '/classes' },
  { key: 'Alt + Shift + S', description: 'Ke Halaman Siswa (Students)', tKey: 'desc_S', path: '/students' },
  { key: 'Alt + Shift + A', description: 'Ke Halaman Kehadiran (Attendance)', tKey: 'desc_A', path: '/attendance' },
  { key: 'Alt + Shift + G', description: 'Ke Halaman Buku Nilai (Gradebook)', tKey: 'desc_G', path: '/grades' },
  { key: 'Alt + Shift + N', description: 'Ke Halaman Materi Ajar', tKey: 'desc_N', path: '/materials' },
  { key: 'Alt + Shift + J', description: 'Ke Halaman Jurnal Guru', tKey: 'desc_J', path: '/journals' },
  { key: 'Alt + Shift + E', description: 'Ke Halaman Soal Evaluasi', tKey: 'desc_E', path: '/evaluations' },
  { key: 'Alt + Shift + T', description: 'Ke Halaman Kalender (Tasks)', tKey: 'desc_T', path: '/calendar' },
  { key: 'Alt + Shift + B', description: 'Ke Halaman Pengaturan & Backup', tKey: 'desc_B', path: '/settings' },
  { key: 'Alt + Shift + H', description: 'Ke Halaman Bantuan (Help/About)', tKey: 'desc_H', path: '/about' },
];

/**
 * Hook that registers keyboard shortcuts for application navigation
 * 
 * @description
 * Sets up global keyboard listeners for Alt + Shift + [key] combinations
 * to navigate to different sections of the application.
 * 
 * The shortcuts automatically avoid triggering when user is typing in
 * input fields, textareas, or content-editable elements.
 * 
 * @example
 * ```tsx
 * function App() {
 *   useKeyboardShortcuts();
 *   return <></>;
 * }
 * 
 * // Alt + Shift + D -> Navigates to dashboard ('/')
 * // Alt + Shift + P -> Navigates to profile ('/profile')
 * // etc.
 * ```
 */
export function useKeyboardShortcuts() {
  const navigate = useNavigate();

  useEffect(() => {
    /**
     * Handles keyboard down events for shortcut detection
     * @param {KeyboardEvent} e - Keyboard event
     */
    const handleKeyDown = (e: KeyboardEvent) => {
      // Handle Undo / Redo globally (Ctrl+Z / Ctrl+Y)
      if (e.ctrlKey || e.metaKey) {
        if (e.key.toLowerCase() === 'z' && !e.shiftKey) {
          e.preventDefault();
          useActionHistoryStore.getState().undo();
          return;
        }
        if (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey)) {
          e.preventDefault();
          useActionHistoryStore.getState().redo();
          return;
        }
      }

      // Avoid triggering navigation when user is typing in inputs
      if (e.target instanceof HTMLInputElement || 
          e.target instanceof HTMLTextAreaElement || 
          (e.target as HTMLElement).isContentEditable) {
        return;
      }

      // We use Alt + Shift + Key combo
      if (e.altKey && e.shiftKey) {
        let matched = false;
        
        switch (e.code) {
          case 'KeyD': navigate('/'); matched = true; break;
          case 'KeyP': navigate('/profile'); matched = true; break;
          case 'KeyM': navigate('/subjects'); matched = true; break;
          case 'KeyC': navigate('/classes'); matched = true; break;
          case 'KeyS': navigate('/students'); matched = true; break;
          case 'KeyA': navigate('/attendance'); matched = true; break;
          case 'KeyG': navigate('/grades'); matched = true; break;
          case 'KeyN': navigate('/materials'); matched = true; break;
          case 'KeyJ': navigate('/journals'); matched = true; break;
          case 'KeyE': navigate('/evaluations'); matched = true; break;
          case 'KeyT': navigate('/calendar'); matched = true; break;
          case 'KeyB': navigate('/settings'); matched = true; break;
          case 'KeyH': navigate('/about'); matched = true; break;
        }

        if (matched) {
          e.preventDefault();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);
}
