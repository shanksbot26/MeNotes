import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, Platform, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Header } from '@/components/Header';
import { SearchBar } from '@/components/SearchBar';
import { NoteCard } from '@/components/NoteCard';
import { EmptyState } from '@/components/EmptyState';
import { FloatingActionButton } from '@/components/FloatingActionButton';
import { UnlockModal } from '@/components/UnlockModal';
import { useNotesStore, getEffectiveServerUrl } from '@/store/use-notes-store';
import { listenRealtimeSyncEvents } from '@/utils/sync';
import { Note } from '@/db/types';
import { Pin } from 'lucide-react-native';

export default function HomeScreen() {
  const router = useRouter();

  const notes = useNotesStore((state) => state.notes);
  const isLoading = useNotesStore((state) => state.isLoading);
  const searchQuery = useNotesStore((state) => state.searchQuery);
  const setSearchQuery = useNotesStore((state) => state.setSearchQuery);
  const deleteNote = useNotesStore((state) => state.deleteNote);
  const togglePin = useNotesStore((state) => state.togglePin);
  const sessionUnlockedContent = useNotesStore((state) => state.sessionUnlockedContent);
  const setSessionUnlockedContent = useNotesStore((state) => state.setSessionUnlockedContent);

  const serverUrl = useNotesStore((state) => state.serverUrl);
  const syncToken = useNotesStore((state) => state.syncToken);
  const fetchNotes = useNotesStore((state) => state.fetchNotes);
  const handleRealtimeEvent = useNotesStore((state) => state.handleRealtimeEvent);

  const [unlockTarget, setUnlockTarget] = useState<Note | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Note | null>(null);

  // Initial Fetch & Realtime SSE Listener (Zero-latency instant updates across all devices!)
  useEffect(() => {
    // 1. Initial fetch from online server
    fetchNotes().catch(() => {});

    const effectiveUrl = getEffectiveServerUrl(serverUrl);

    // 2. Realtime SSE connection (broadcasts note_created, note_updated, note_deleted directly)
    const cleanupSse = listenRealtimeSyncEvents(effectiveUrl, syncToken, (type, payload) => {
      handleRealtimeEvent(type, payload);
    });

    // 3. Sync on window focus / app return
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const handleWindowFocus = () => {
        fetchNotes().catch(() => {});
      };
      window.addEventListener('focus', handleWindowFocus);
      return () => {
        cleanupSse();
        window.removeEventListener('focus', handleWindowFocus);
      };
    } else {
      let sub: any = null;
      try {
        const { AppState } = require('react-native');
        sub = AppState.addEventListener('change', (nextState: string) => {
          if (nextState === 'active') {
            fetchNotes().catch(() => {});
          }
        });
      } catch (e) {
        // Fallback for environments without AppState
      }

      return () => {
        cleanupSse();
        sub?.remove();
      };
    }
  }, [serverUrl, syncToken, fetchNotes, handleRealtimeEvent]);

  const handleDeleteNote = useCallback(
    (id: string) => {
      const targetNote = notes.find((n) => n.id === id);
      if (!targetNote) return;

      // JIKA CATATAN TERKUNCI: Wajib verifikasi PIN terlebih dahulu sebelum boleh dihapus!
      if (targetNote.isLocked) {
        setDeleteTarget(targetNote);
        return;
      }

      const noteTitle = targetNote.title || 'catatan ini';
      const proceed = () => {
        deleteNote(id);
      };

      if (Platform.OS === 'web') {
        if (window.confirm(`Apakah Anda yakin ingin menghapus "${noteTitle}"?`)) {
          proceed();
        }
      } else {
        Alert.alert(
          'Hapus Catatan',
          `Apakah Anda yakin ingin menghapus "${noteTitle}"?`,
          [
            { text: 'Batal', style: 'cancel' },
            { text: 'Hapus', style: 'destructive', onPress: proceed },
          ]
        );
      }
    },
    [notes, deleteNote]
  );

  // Filter notes based on search query
  const filteredNotes = useMemo(() => {
    if (!searchQuery.trim()) return notes;
    const q = searchQuery.toLowerCase().trim();
    return notes.filter((note) => {
      const matchTitle = note.title.toLowerCase().includes(q);
      const matchTags = note.tags?.some((tag) => tag.toLowerCase().includes(q));
      // For locked notes, don't search ciphertext unless unlocked in session
      const contentToSearch = note.isLocked
        ? sessionUnlockedContent[note.id] || ''
        : note.content;
      const matchContent = contentToSearch.toLowerCase().includes(q);

      return matchTitle || matchContent || matchTags;
    });
  }, [notes, searchQuery, sessionUnlockedContent]);

  // Separate pinned and non-pinned
  const pinnedNotes = useMemo(
    () => filteredNotes.filter((n) => n.isPinned),
    [filteredNotes]
  );
  const regularNotes = useMemo(
    () => filteredNotes.filter((n) => !n.isPinned),
    [filteredNotes]
  );

  const handleOpenNote = (note: Note) => {
    // If note is locked, always prompt for PIN/Biometric
    if (note.isLocked) {
      setUnlockTarget(note);
      return;
    }
    router.push(`/note/${note.id}` as any);
  };

  const handleCreateNewNote = () => {
    router.push('/note/new' as any);
  };

  const handleUnlockSuccess = (decryptedContent: string) => {
    if (unlockTarget) {
      setSessionUnlockedContent(unlockTarget.id, decryptedContent);
      const targetId = unlockTarget.id;
      setUnlockTarget(null);
      router.push(`/note/${targetId}` as any);
    }
  };

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      className="flex-1 bg-slate-50 dark:bg-slate-950"
    >
      {/* Responsive Container: Max-w-6xl with nice padding on PC */}
      <View className="flex-1 w-full max-w-6xl mx-auto px-2 sm:px-4 md:px-8">
        {/* App Header */}
        <Header totalNotes={notes.length} />

        {/* Search Bar */}
        <SearchBar value={searchQuery} onChangeText={setSearchQuery} />

        {/* Notes List Content */}
        <ScrollView
          className="flex-1 px-2 sm:px-4 pt-2"
          contentContainerStyle={{ paddingBottom: 100 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {isLoading && notes.length === 0 ? (
            <View className="py-20 items-center justify-center">
              <ActivityIndicator size="large" color="#10b981" />
              <Text className="mt-4 text-sm text-slate-400">
                Memuat catatan dari server...
              </Text>
            </View>
          ) : filteredNotes.length === 0 ? (
            <EmptyState
              isSearch={searchQuery.length > 0}
              onAddNew={handleCreateNewNote}
            />
          ) : (
            <>
              {/* Pinned Notes Section */}
              {pinnedNotes.length > 0 && (
                <View className="mb-6">
                  <View className="flex-row items-center gap-1.5 mb-3 px-1">
                    <Pin size={15} color="#d97706" />
                    <Text className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                      Disematkan ({pinnedNotes.length})
                    </Text>
                  </View>
                  {/* Responsive Grid for PC Web (1 col mobile, 2 col tablet, 3 col desktop) */}
                  <View className="flex-row flex-wrap gap-3.5">
                    {pinnedNotes.map((note) => (
                      <View
                        key={note.id}
                        className="w-full md:w-[calc(50%-7px)] lg:w-[calc(33.333%-10px)]"
                      >
                        <NoteCard
                          note={note}
                          onPress={handleOpenNote}
                          onTogglePin={togglePin}
                          onDelete={handleDeleteNote}
                        />
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Regular Notes Section */}
              {regularNotes.length > 0 && (
                <View className="mb-6">
                  {pinnedNotes.length > 0 && (
                    <Text className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 px-1">
                      Catatan Lainnya ({regularNotes.length})
                    </Text>
                  )}
                  {/* Responsive Grid for PC Web (1 col mobile, 2 col tablet, 3 col desktop) */}
                  <View className="flex-row flex-wrap gap-3.5">
                    {regularNotes.map((note) => (
                      <View
                        key={note.id}
                        className="w-full md:w-[calc(50%-7px)] lg:w-[calc(33.333%-10px)]"
                      >
                        <NoteCard
                          note={note}
                          onPress={handleOpenNote}
                          onTogglePin={togglePin}
                          onDelete={handleDeleteNote}
                        />
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </>
          )}
        </ScrollView>

        {/* Floating Action Button */}
        <FloatingActionButton onPress={handleCreateNewNote} />

        {/* Unlock Modal for Locked Notes */}
        {unlockTarget && (
          <UnlockModal
            visible={!!unlockTarget}
            noteId={unlockTarget.id}
            noteTitle={unlockTarget.title}
            cipherText={unlockTarget.content}
            onClose={() => setUnlockTarget(null)}
            onUnlockSuccess={handleUnlockSuccess}
          />
        )}

        {/* Unlock Modal for DELETING Locked Notes (Requires correct PIN!) */}
        {deleteTarget && (
          <UnlockModal
            visible={!!deleteTarget}
            noteId={deleteTarget.id}
            noteTitle={`Hapus: ${deleteTarget.title}`}
            cipherText={deleteTarget.content}
            onClose={() => setDeleteTarget(null)}
            onUnlockSuccess={() => {
              const idToDelete = deleteTarget.id;
              setDeleteTarget(null);
              deleteNote(idToDelete);
            }}
          />
        )}
      </View>
    </SafeAreaView>
  );
}
