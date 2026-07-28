import { Note } from "@/db/database";

export class NoteService {
  static getCategorizedNotes(notes: Note[] | undefined) {
    if (!notes) return { guru: [], materi: [], evaluasi: [] };
    
    return {
      guru: notes.filter(n => n.type === 'guru'),
      materi: notes.filter(n => n.type === 'materi'),
      evaluasi: notes.filter(n => n.type === 'evaluasi'),
    };
  }

  static getExcerpt(content: string, length: number = 200): string {
    if (!content) return "";
    return content.length > length ? content.substring(0, length) + "..." : content;
  }
}