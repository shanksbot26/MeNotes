import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Header } from '@/components/Header';
import { SearchBar } from '@/components/SearchBar';
import { NoteCard } from '@/components/NoteCard';
import { EmptyState } from '@/components/EmptyState';
import { FloatingActionButton } from '@/components/FloatingActionButton';
import { UnlockModal } from '@/components/UnlockModal';
import { useNotesStore } from '@/store/use-notes-store';
import { Note } from '@/db/types';
import { Pin } from 'lucide-react-native';

export default function HomeScreen() {
  const router = useRouter();

  const notes = useNotesStore((state) => state.notes);
  const searchQuery = useNotesStore((state) => state.searchQuery);
  const setSearchQuery = useNotesStore((state) => state.setSearchQuery);
  const deleteNote = useNotesStore((state) => state.deleteNote);
  const togglePin = useNotesStore((state) => state.togglePin);
  const sessionUnlockedContent = useNotesStore((state) => state.sessionUnlockedContent);
  const setSessionUnlockedContent = useNotesStore((state) => state.setSessionUnlockedContent);

  const serverUrl = useNotesStore((state) => state.serverUrl);
  const autoSync = useNotesStore((state) => state.autoSync);
  const triggerSync = useNotesStore((state) => state.triggerSync);

  const [unlockTarget, setUnlockTarget] = useState<Note | null>(null);

  // Background Live Sync & Window Focus Listener for Realtime Sync
  useEffect(() => {
    if (!serverUrl || !autoSync) return;

    // Initial sync
    triggerSync().catch(() => {});

    // Periodic poll every 5 seconds for live multi-device updates
    const pollInterval = setInterval(() => {
      triggerSync().catch(() => {});
    }, 5000);

    // Sync on window focus / app return
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const handleWindowFocus = () => {
        triggerSync().catch(() => {});
      };
      window.addEventListener('focus', handleWindowFocus);
      return () => {
        clearInterval(pollInterval);
        window.removeEventListener('focus', handleWindowFocus);
      };
    } else {
      let sub: any = null;
      try {
        const { AppState } = require('react-native');
        sub = AppState.addEventListener('change', (nextState: string) => {
          if (nextState === 'active') {
            triggerSync().catch(() => {});
          }
        });
      } catch (e) {
        // Fallback for environments without AppState
      }

      return () => {
        clearInterval(pollInterval);
        sub?.remove();
      };
    }
  }, [serverUrl, autoSync, triggerSync]);

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
          showsVerticalScrollIndicator={false}
        >
          {filteredNotes.length === 0 ? (
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
                          onDelete={deleteNote}
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
                          onDelete={deleteNote}
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
      </View>
    </SafeAreaView>
  );
}
