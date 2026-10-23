import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Note, CreateNoteInput, UpdateNoteInput, ThemeMode } from '@/db/types';
import { generateId } from '@/utils/id';

interface NotesState {
  notes: Note[];
  searchQuery: string;
  themeMode: ThemeMode;
  isHydrated: boolean;
  // In-memory cache for decrypted content during active session (not stored to disk)
  sessionUnlockedContent: Record<string, string>;

  // Self-hosted Server Sync Configuration
  serverUrl: string;
  syncToken: string;
  autoSync: boolean;
  lastSyncTimestamp: number | null;
  isSyncing: boolean;

  setSearchQuery: (query: string) => void;
  setThemeMode: (mode: ThemeMode) => void;
  setHydrated: (state: boolean) => void;

  setSessionUnlockedContent: (id: string, content: string) => void;
  clearSessionUnlockedContent: (id: string) => void;

  setServerConfig: (url: string, token: string, autoSync?: boolean) => void;
  setSyncStatus: (isSyncing: boolean, timestamp?: number) => void;
  mergeServerNotes: (serverNotes: (Note & { deletedAt?: number })[]) => void;

  addNote: (input: CreateNoteInput) => Note;
  updateNote: (id: string, updates: UpdateNoteInput) => void;
  deleteNote: (id: string) => void;
  togglePin: (id: string) => void;
  lockNote: (id: string, cipherText: string) => void;
  unlockNotePermanently: (id: string, plainText: string) => void;
}

const INITIAL_NOTES: Note[] = [
  {
    id: 'welcome-note-1',
    title: '📌 Selamat Datang di MeNotes!',
    content: 'Ini adalah aplikasi catatan cross-platform (Android, iOS, dan Web) yang cepat dan siap digunakan secara offline.\n\nCoba sematkan (pin), edit, atau kunci catatan rahasia Anda dengan AES-256.',
    isPinned: true,
    isLocked: false,
    createdAt: Date.now() - 3600000,
    updatedAt: Date.now() - 3600000,
    tags: ['Info', 'Penting'],
  },
  {
    id: 'welcome-note-2',
    title: '💡 Fitur Utama MeNotes',
    content: '- Desain modern dengan Tailwind CSS (NativeWind)\n- Rich Text Editor Tiptap (Heading, Checklist, Tabel)\n- Kunci catatan per-item dengan enkripsi AES-256 dan Biometrik\n- Sinkronisasi mandiri ke server pribadi Anda (Self-Hosted)',
    isPinned: false,
    isLocked: false,
    createdAt: Date.now() - 1800000,
    updatedAt: Date.now() - 1800000,
    tags: ['Fitur'],
  },
];

export const useNotesStore = create<NotesState>()(
  persist(
    (set, get) => ({
      notes: INITIAL_NOTES,
      searchQuery: '',
      themeMode: 'system',
      isHydrated: false,
      sessionUnlockedContent: {},

      serverUrl: '',
      syncToken: '',
      autoSync: true,
      lastSyncTimestamp: null,
      isSyncing: false,

      setSearchQuery: (query: string) => set({ searchQuery: query }),

      setThemeMode: (mode: ThemeMode) => set({ themeMode: mode }),

      setHydrated: (state: boolean) => set({ isHydrated: state }),

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

      setServerConfig: (url: string, token: string, autoSync = true) => {
        set({ serverUrl: url.trim(), syncToken: token.trim(), autoSync });
      },

      setSyncStatus: (isSyncing: boolean, timestamp?: number) => {
        set((state) => ({
          isSyncing,
          lastSyncTimestamp: timestamp !== undefined ? timestamp : state.lastSyncTimestamp,
        }));
      },

      mergeServerNotes: (serverNotes) => {
        set((state) => {
          let updatedNotes = [...state.notes];

          for (const sNote of serverNotes) {
            // Check for deletion tombstone
            if (sNote.deletedAt) {
              updatedNotes = updatedNotes.filter((n) => n.id !== sNote.id);
              continue;
            }

            const localIndex = updatedNotes.findIndex((n) => n.id === sNote.id);

            if (localIndex === -1) {
              // Add note received from server
              updatedNotes.unshift({
                id: sNote.id,
                title: sNote.title,
                content: sNote.content,
                createdAt: sNote.createdAt,
                updatedAt: sNote.updatedAt,
                isPinned: Boolean(sNote.isPinned),
                isLocked: Boolean(sNote.isLocked),
                color: sNote.color,
                tags: sNote.tags || [],
              });
            } else {
              // Apply Last-Write-Wins (LWW)
              const localNote = updatedNotes[localIndex];
              if (sNote.updatedAt > localNote.updatedAt) {
                updatedNotes[localIndex] = {
                  ...localNote,
                  title: sNote.title,
                  content: sNote.content,
                  updatedAt: sNote.updatedAt,
                  isPinned: Boolean(sNote.isPinned),
                  isLocked: Boolean(sNote.isLocked),
                  color: sNote.color,
                  tags: sNote.tags || [],
                };
              }
            }
          }

          // Sort by isPinned and updatedAt
          updatedNotes.sort((a, b) => {
            if (a.isPinned !== b.isPinned) {
              return a.isPinned ? -1 : 1;
            }
            return b.updatedAt - a.updatedAt;
          });

          return { notes: updatedNotes };
        });
      },

      addNote: (input: CreateNoteInput) => {
        const now = Date.now();
        const newNote: Note = {
          id: generateId(),
          title: input.title.trim(),
          content: input.content.trim(),
          color: input.color,
          tags: input.tags || [],
          isPinned: input.isPinned ?? false,
          isLocked: input.isLocked ?? false,
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          notes: [newNote, ...state.notes],
        }));

        return newNote;
      },

      updateNote: (id: string, updates: UpdateNoteInput) => {
        set((state) => ({
          notes: state.notes.map((note) =>
            note.id === id
              ? { ...note, ...updates, updatedAt: Date.now() }
              : note
          ),
        }));
      },

      deleteNote: (id: string) => {
        set((state) => {
          const updatedSession = { ...state.sessionUnlockedContent };
          delete updatedSession[id];
          return {
            notes: state.notes.filter((note) => note.id !== id),
            sessionUnlockedContent: updatedSession,
          };
        });
      },

      togglePin: (id: string) => {
        set((state) => ({
          notes: state.notes.map((note) =>
            note.id === id
              ? { ...note, isPinned: !note.isPinned, updatedAt: Date.now() }
              : note
          ),
        }));
      },

      lockNote: (id: string, cipherText: string) => {
        set((state) => ({
          notes: state.notes.map((note) =>
            note.id === id
              ? { ...note, content: cipherText, isLocked: true, updatedAt: Date.now() }
              : note
          ),
        }));
      },

      unlockNotePermanently: (id: string, plainText: string) => {
        set((state) => {
          const updatedSession = { ...state.sessionUnlockedContent };
          delete updatedSession[id];
          return {
            notes: state.notes.map((note) =>
              note.id === id
                ? { ...note, content: plainText, isLocked: false, updatedAt: Date.now() }
                : note
            ),
            sessionUnlockedContent: updatedSession,
          };
        });
      },
    }),
    {
      name: '@menotes_store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        // Persist notes and settings, exclude session keys and temporary loading
        notes: state.notes,
        searchQuery: state.searchQuery,
        themeMode: state.themeMode,
        serverUrl: state.serverUrl,
        syncToken: state.syncToken,
        autoSync: state.autoSync,
        lastSyncTimestamp: state.lastSyncTimestamp,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    }
  )
);
