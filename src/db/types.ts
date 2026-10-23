export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  isPinned: boolean;
  isLocked?: boolean;
  pinHash?: string;
  color?: string;
  tags?: string[];
  deletedAt?: number | null;
}

export type CreateNoteInput = {
  id?: string;
  title: string;
  content: string;
  color?: string;
  tags?: string[];
  isPinned?: boolean;
  isLocked?: boolean;
  pinHash?: string;
};

export type UpdateNoteInput = Partial<Omit<Note, 'id' | 'createdAt'>>;

export type ThemeMode = 'light' | 'dark' | 'system';
