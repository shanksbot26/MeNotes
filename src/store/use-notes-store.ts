import { create } from 'zustand';
import { Platform } from 'react-native';
import { Note, CreateNoteInput, UpdateNoteInput, ThemeMode } from '@/db/types';
import { generateId } from '@/utils/id';
import { hashPin } from '@/utils/crypto';
import {
  fetchOnlineNotes,
  createOnlineNote,
  updateOnlineNote,
  deleteOnlineNote,
  formatServerUrl,
} from '@/utils/sync';

export function getEffectiveServerUrl(customUrl?: string): string {
  const trimmed = (customUrl || '').trim();
  if (trimmed) return trimmed;
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return '';
}

export function getEffectiveSyncToken(customToken?: string): string {
  const trimmed = (customToken || '').trim();
  if (trimmed) return trimmed;
  return 'akuiki26';
}

let updateDebounceTimers: Record<string, ReturnType<typeof setTimeout>> = {};

interface NotesState {
  // 100% In-Memory Cloud State (NOT stored in device AsyncStorage)
  notes: Note[];
  isLoading: boolean;
  searchQuery: string;
  themeMode: ThemeMode;
  sessionUnlockedContent: Record<string, string>;

  // Server credentials
  serverUrl: string;
  syncToken: string;
  lastSyncTimestamp: number | null;

  setSearchQuery: (query: string) => void;
  setThemeMode: (mode: ThemeMode) => void;
  setSessionUnlockedContent: (id: string, content: string) => void;
  clearSessionUnlockedContent: (id: string) => void;

  // Online Server Operations
  fetchNotes: () => Promise<void>;
  addNote: (input: CreateNoteInput) => Note;
  updateNote: (id: string, updates: UpdateNoteInput) => void;
  deleteNote: (id: string) => void;
  togglePin: (id: string) => void;
  lockNote: (id: string, cipherText: string, pin?: string) => void;
  unlockNotePermanently: (id: string, plainText: string) => void;

  // Realtime Server-Sent Events Dispatcher
  handleRealtimeEvent: (type: string, payload?: any) => void;
}

export const useNotesStore = create<NotesState>((set, get) => ({
  notes: [],
  isLoading: true,
  searchQuery: '',
  themeMode: 'system',
  sessionUnlockedContent: {},

  serverUrl: '',
  syncToken: 'akuiki26',
  lastSyncTimestamp: null,

  setSearchQuery: (query: string) => set({ searchQuery: query }),
  setThemeMode: (mode: ThemeMode) => set({ themeMode: mode }),

  setSessionUnlockedContent: (id: string, content: string) => {
    set((state) => ({
      sessionUnlockedContent: {
        ...state.sessionUnlockedContent,
        [id]: content,
      },
    }));
  },

  clearSessionUnlockedContent: (id: string) => {
    set((state) => {
      const updated = { ...state.sessionUnlockedContent };
      delete updated[id];
      return { sessionUnlockedContent: updated };
    });
  },

  fetchNotes: async () => {
    const state = get();
    const url = getEffectiveServerUrl(state.serverUrl);
    if (!url) {
      set({ isLoading: false });
      return;
    }

    try {
      set({ isLoading: true });
      const onlineNotes = await fetchOnlineNotes(url, state.syncToken);
      set({
        notes: onlineNotes,
        isLoading: false,
        lastSyncTimestamp: Date.now(),
      });
    } catch (err) {
      console.warn('Failed to fetch online notes:', err);
      set({ isLoading: false });
    }
  },

  addNote: (input: CreateNoteInput) => {
    const now = Date.now();
    const state = get();
    const url = getEffectiveServerUrl(state.serverUrl);

    const newNote: Note = {
      id: input.id || generateId(),
      title: input.title.trim() || 'Tanpa Judul',
      content: input.content || '',
      color: input.color,
      tags: input.tags || [],
      isPinned: Boolean(input.isPinned),
      isLocked: Boolean(input.isLocked),
      pinHash: input.pinHash,
      createdAt: now,
      updatedAt: now,
    };

    // 1. Optimistically display in memory
    set((s) => ({
      notes: [newNote, ...s.notes.filter((n) => n.id !== newNote.id)],
    }));

    // 2. Send immediately to server
    if (url) {
      createOnlineNote(newNote, url, state.syncToken).catch((err) => {
        console.warn('Failed to save note to server:', err);
      });
    }

    return newNote;
  },

  updateNote: (id: string, updates: UpdateNoteInput) => {
    const now = Date.now();
    const state = get();
    const url = getEffectiveServerUrl(state.serverUrl);

    // 1. Optimistic update in memory
    set((s) => ({
      notes: s.notes.map((note) =>
        note.id === id ? { ...note, ...updates, updatedAt: now } : note
      ),
    }));

    // 2. Debounce push to server to avoid network flood while typing
    if (updateDebounceTimers[id]) {
      clearTimeout(updateDebounceTimers[id]);
    }

    updateDebounceTimers[id] = setTimeout(() => {
      delete updateDebounceTimers[id];
      if (url) {
        updateOnlineNote(id, updates, url, state.syncToken).catch((err) => {
          console.warn('Failed to update note on server:', err);
        });
      }
    }, 250);
  },

  deleteNote: (id: string) => {
    const state = get();
    const url = getEffectiveServerUrl(state.serverUrl);

    // 1. Optimistic delete in memory
    set((s) => {
      const updatedSession = { ...s.sessionUnlockedContent };
      delete updatedSession[id];
      return {
        notes: s.notes.filter((n) => n.id !== id),
        sessionUnlockedContent: updatedSession,
      };
    });

    // 2. Immediately delete on server
    if (url) {
      deleteOnlineNote(id, url, state.syncToken).catch((err) => {
        console.warn('Failed to delete note on server:', err);
      });
    }
  },

  togglePin: (id: string) => {
    const state = get();
    const target = state.notes.find((n) => n.id === id);
    if (!target) return;

    const nextPinned = !target.isPinned;
    get().updateNote(id, { isPinned: nextPinned });
  },

  lockNote: (id: string, cipherText: string, pin?: string) => {
    const pinHashValue = pin ? hashPin(pin) : undefined;
    get().updateNote(id, {
      content: cipherText,
      isLocked: true,
      pinHash: pinHashValue,
    });
  },

  unlockNotePermanently: (id: string, plainText: string) => {
    get().updateNote(id, {
      content: plainText,
      isLocked: false,
      pinHash: undefined,
    });
  },

  handleRealtimeEvent: (type: string, payload?: any) => {
    if (!payload) return;

    if (type === 'note_created' && payload.note) {
      const newNote = payload.note as Note;
      set((s) => {
        if (s.notes.some((n) => n.id === newNote.id)) {
          return s; // already present
        }
        const updated = [newNote, ...s.notes];
        updated.sort((a, b) => {
          if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
          return b.updatedAt - a.updatedAt;
        });
        return { notes: updated, lastSyncTimestamp: Date.now() };
      });
    } else if (type === 'note_updated' && payload.note) {
      const updatedNote = payload.note as Note;
      set((s) => {
        const index = s.notes.findIndex((n) => n.id === updatedNote.id);
        let updated: Note[];
        if (index === -1) {
          updated = [updatedNote, ...s.notes];
        } else {
          updated = s.notes.map((n) => (n.id === updatedNote.id ? updatedNote : n));
        }
        updated.sort((a, b) => {
          if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
          return b.updatedAt - a.updatedAt;
        });
        return { notes: updated, lastSyncTimestamp: Date.now() };
      });
    } else if (type === 'note_deleted' && payload.id) {
      const deletedId = payload.id as string;
      set((s) => ({
        notes: s.notes.filter((n) => n.id !== deletedId),
        lastSyncTimestamp: Date.now(),
      }));
    } else if (type === 'notes_updated') {
      get().fetchNotes();
    }
  },
}));
