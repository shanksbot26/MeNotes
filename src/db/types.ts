export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  isPinned: boolean;
  isLocked?: boolean;
  color?: string;
  tags?: string[];
}

export type CreateNoteInput = {
  title: string;
  content: string;
  color?: string;
  tags?: string[];
  isPinned?: boolean;
  isLocked?: boolean;
};

export type UpdateNoteInput = Partial<Omit<Note, 'id' | 'createdAt'>>;

export type ThemeMode = 'light' | 'dark' | 'system';
