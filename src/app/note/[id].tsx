import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  TextInput,
  Pressable,
  Text,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useColorScheme } from 'nativewind';
import {
  ArrowLeft,
  Pin,
  Trash2,
  Check,
  CheckCircle2,
  Lock,
  Unlock,
} from 'lucide-react-native';

import { useNotesStore } from '@/store/use-notes-store';
import { generateId } from '@/utils/id';
import { encryptNoteContent } from '@/utils/crypto';
import { removeBiometricPin } from '@/utils/biometrics';
import TiptapEditorDom from '@/components/editor/tiptap-editor-dom';
import { LockModal } from '@/components/LockModal';
import { UnlockModal } from '@/components/UnlockModal';

export default function NoteEditorScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const notes = useNotesStore((state) => state.notes);
  const addNote = useNotesStore((state) => state.addNote);
  const updateNote = useNotesStore((state) => state.updateNote);
  const deleteNote = useNotesStore((state) => state.deleteNote);
  const togglePin = useNotesStore((state) => state.togglePin);
  const lockNoteInStore = useNotesStore((state) => state.lockNote);
  const unlockNotePermanentlyInStore = useNotesStore(
    (state) => state.unlockNotePermanently
  );
  const sessionUnlockedContent = useNotesStore(
    (state) => state.sessionUnlockedContent
  );
  const setSessionUnlockedContent = useNotesStore(
    (state) => state.setSessionUnlockedContent
  );
  const clearSessionUnlockedContent = useNotesStore(
    (state) => state.clearSessionUnlockedContent
  );

  const existingNote = notes.find((n) => n.id === id);

  const [currentId, setCurrentId] = useState<string>(() => {
    return existingNote ? existingNote.id : id === 'new' ? generateId() : (id as string);
  });

  const [title, setTitle] = useState<string>(() => {
    return existingNote ? existingNote.title : '';
  });

  const [isPinned, setIsPinned] = useState<boolean>(() => {
    return existingNote ? existingNote.isPinned : false;
  });

  const [isLocked, setIsLocked] = useState<boolean>(() => {
    return existingNote ? !!existingNote.isLocked : false;
  });

  // Check if note is locked and requires in-screen unlock
  const [needsUnlock, setNeedsUnlock] = useState<boolean>(() => {
    if (existingNote && existingNote.isLocked) {
      return !sessionUnlockedContent[existingNote.id];
    }
    return false;
  });

  const [content, setContent] = useState<string>(() => {
    if (!existingNote) return '';
    if (existingNote.isLocked) {
      return sessionUnlockedContent[existingNote.id] || '';
    }
    return existingNote.content;
  });

  // Synchronize state immediately whenever id parameter changes (e.g. user clicks another note)
  useEffect(() => {
    if (!id) return;

    if (id === 'new') {
      const newId = generateId();
      setCurrentId(newId);
      setTitle('');
      setContent('');
      setIsPinned(false);
      setIsLocked(false);
      setNeedsUnlock(false);
      isCreatedInStoreRef.current = false;
      activePinRef.current = null;
    } else {
      const targetNote = notes.find((n) => n.id === id);
      if (targetNote) {
        setCurrentId(targetNote.id);
        setTitle(targetNote.title);
        setIsPinned(!!targetNote.isPinned);
        setIsLocked(!!targetNote.isLocked);
        isCreatedInStoreRef.current = true;

        if (targetNote.isLocked && !sessionUnlockedContent[targetNote.id]) {
          setNeedsUnlock(true);
          setContent('');
        } else {
          setNeedsUnlock(false);
          setContent(
            targetNote.isLocked
              ? sessionUnlockedContent[targetNote.id] || ''
              : targetNote.content
          );
        }
      }
    }
  }, [id]);

  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');
  const [showLockModal, setShowLockModal] = useState<boolean>(false);
  const [showDeleteUnlockModal, setShowDeleteUnlockModal] = useState<boolean>(false);
  const isCreatedInStoreRef = useRef<boolean>(!!existingNote);
  const activePinRef = useRef<string | null>(null);

  // Sync title and content changes to store
  const persistChanges = useCallback(
    (newTitle: string, newContent: string, pinned: boolean, locked: boolean) => {
      setSaveStatus('saving');

      // If locked and we have an active pin, encrypt content for store persistence
      let contentToPersist = newContent;
      if (locked && activePinRef.current) {
        try {
          contentToPersist = encryptNoteContent(newContent, activePinRef.current);
        } catch (e) {
          console.warn('Failed to re-encrypt on auto-save:', e);
        }
      }

      if (!isCreatedInStoreRef.current) {
        addNote({
          id: currentId,
          title: newTitle.trim() || 'Tanpa Judul',
          content: contentToPersist,
          isPinned: pinned,
          isLocked: locked,
        });
        isCreatedInStoreRef.current = true;
      } else {
        updateNote(currentId, {
          title: newTitle.trim() || 'Tanpa Judul',
          content: contentToPersist,
          isPinned: pinned,
          isLocked: locked,
        });
      }

      // Keep plain text in session cache if locked
      if (locked) {
        setSessionUnlockedContent(currentId, newContent);
      }

      setTimeout(() => {
        setSaveStatus('saved');
      }, 300);
    },
    [addNote, updateNote, currentId, setSessionUnlockedContent]
  );

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    persistChanges(newTitle, content, isPinned, isLocked);
  };

  const handleContentChange = async (html: string) => {
    setContent(html);
    persistChanges(title, html, isPinned, isLocked);
  };

  const handleTogglePin = () => {
    const nextPinned = !isPinned;
    setIsPinned(nextPinned);
    if (isCreatedInStoreRef.current) {
      togglePin(currentId);
    } else {
      persistChanges(title, content, nextPinned, isLocked);
    }
  };

  const handleLockClick = () => {
    if (!isLocked) {
      setShowLockModal(true);
    } else {
      // Prompt to unlock permanently
      const confirmRemoveLock = () => {
        unlockNotePermanentlyInStore(currentId, content);
        removeBiometricPin(currentId);
        setIsLocked(false);
        activePinRef.current = null;
      };

      if (Platform.OS === 'web') {
        if (
          window.confirm(
            'Apakah Anda ingin membuka kunci permanen (menghapus enkripsi) untuk catatan ini?'
          )
        ) {
          confirmRemoveLock();
        }
      } else {
        Alert.alert(
          'Buka Kunci Permanen',
          'Apakah Anda ingin menghapus enkripsi dan PIN dari catatan ini?',
          [
            { text: 'Batal', style: 'cancel' },
            {
              text: 'Buka Permanen',
              style: 'destructive',
              onPress: confirmRemoveLock,
            },
          ]
        );
      }
    }
  };

  const handleLockSuccess = (cipherText: string, pin: string) => {
    setIsLocked(true);
    activePinRef.current = pin;
    if (!isCreatedInStoreRef.current) {
      addNote({
        id: currentId,
        title: title.trim() || 'Tanpa Judul',
        content: cipherText,
        isPinned,
        isLocked: true,
      });
      isCreatedInStoreRef.current = true;
    }
    lockNoteInStore(currentId, cipherText, pin);
    setSessionUnlockedContent(currentId, content);
  };

  const handleInScreenUnlockSuccess = (decrypted: string, pin: string) => {
    setContent(decrypted);
    setSessionUnlockedContent(currentId, decrypted);
    activePinRef.current = pin;
    setNeedsUnlock(false);
  };

  const handleDelete = () => {
    // Jika catatan terkunci dan belum diverifikasi PIN di sesi ini, wajib verifikasi PIN!
    if (isLocked && !activePinRef.current && existingNote) {
      setShowDeleteUnlockModal(true);
      return;
    }

    const executeDelete = () => {
      deleteNote(currentId);
      removeBiometricPin(currentId);
      router.back();
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Apakah Anda yakin ingin menghapus catatan ini?')) {
        executeDelete();
      }
    } else {
      Alert.alert(
        'Hapus Catatan',
        'Apakah Anda yakin ingin menghapus catatan ini?',
        [
          { text: 'Batal', style: 'cancel' },
          { text: 'Hapus', style: 'destructive', onPress: executeDelete },
        ]
      );
    }
  };

  const handleBack = () => {
    // If empty title and empty content on new note, don't keep blank note
    if (
      !title.trim() &&
      (!content || content === '<p></p>') &&
      isCreatedInStoreRef.current &&
      !isLocked
    ) {
      deleteNote(currentId);
    }

    // Always clear session unlocked state when leaving so note is locked on Home Screen
    if (isLocked) {
      clearSessionUnlockedContent(currentId);
    }

    router.back();
  };

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      className="flex-1 bg-white dark:bg-slate-950"
    >
      {/* Top Header Bar with responsive PC max-width */}
      <View className="w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <View className="max-w-4xl mx-auto w-full flex-row items-center justify-between px-3 md:px-6 py-2.5">
          <View className="flex-row items-center gap-2 flex-1">
            <Pressable
              onPress={handleBack}
              hitSlop={8}
              className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 active:opacity-70"
              accessibilityLabel="Kembali ke Beranda"
            >
              <ArrowLeft size={20} color={isDark ? '#e2e8f0' : '#334155'} />
            </Pressable>

            <TextInput
              value={title}
              onChangeText={handleTitleChange}
              placeholder="Judul Catatan..."
              placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
              className="flex-1 text-base md:text-lg font-bold text-slate-900 dark:text-white px-2 py-1"
              style={{ outlineStyle: 'none' } as any}
            />
          </View>

          <View className="flex-row items-center gap-1.5 ml-2">
            {/* Save Status Indicator */}
            <View className="flex-row items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800/80 mr-1">
              <CheckCircle2
                size={12}
                color={saveStatus === 'saved' ? '#10b981' : '#f59e0b'}
              />
              <Text className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                {saveStatus === 'saved' ? 'Tersimpan' : 'Menyimpan...'}
              </Text>
            </View>

            {/* Lock / Encrypt Button */}
            <Pressable
              onPress={handleLockClick}
              hitSlop={8}
              className={`p-2 rounded-xl border ${
                isLocked
                  ? 'bg-amber-100 border-amber-300 dark:bg-amber-950/60 dark:border-amber-700'
                  : 'bg-slate-100 border-slate-200/80 dark:bg-slate-800 dark:border-slate-700/80'
              }`}
              accessibilityLabel={isLocked ? 'Catatan Terkunci' : 'Kunci Catatan'}
            >
              {isLocked ? (
                <Lock size={16} color="#d97706" />
              ) : (
                <Unlock size={16} color={isDark ? '#94a3b8' : '#64748b'} />
              )}
            </Pressable>

            {/* Pin Button */}
            <Pressable
              onPress={handleTogglePin}
              hitSlop={8}
              className={`p-2 rounded-xl border ${
                isPinned
                  ? 'bg-amber-100 border-amber-300 dark:bg-amber-950/60 dark:border-amber-700'
                  : 'bg-slate-100 border-slate-200/80 dark:bg-slate-800 dark:border-slate-700/80'
              }`}
              accessibilityLabel={isPinned ? 'Lepas sematan' : 'Sematkan catatan'}
            >
              <Pin
                size={16}
                color={isPinned ? '#d97706' : isDark ? '#94a3b8' : '#64748b'}
                fill={isPinned ? '#d97706' : 'none'}
              />
            </Pressable>

            {/* Delete Button */}
            <Pressable
              onPress={handleDelete}
              hitSlop={8}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-950/50 border border-slate-200/80 dark:border-slate-700/80"
              accessibilityLabel="Hapus catatan"
            >
              <Trash2 size={16} color={isDark ? '#ef4444' : '#dc2626'} />
            </Pressable>

            {/* Finish / Save Button */}
            <Pressable
              onPress={handleBack}
              hitSlop={8}
              className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800"
              accessibilityLabel="Selesai"
            >
              <Check size={16} color="#ffffff" strokeWidth={2.5} />
            </Pressable>
          </View>
        </View>
      </View>

      {/* Editor Content Area / Locked Prompt with responsive desktop container */}
      {needsUnlock && existingNote ? (
        <View className="flex-1 items-center justify-center p-6 bg-slate-50 dark:bg-slate-950">
          <View className="w-16 h-16 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 items-center justify-center mb-4 border border-amber-500/20">
            <Lock size={32} color="#d97706" />
          </View>
          <Text className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1">
            Catatan Terkunci
          </Text>
          <Text className="text-sm text-slate-500 dark:text-slate-400 text-center max-w-xs mb-5">
            Catatan ini dienkripsi dengan AES-256. Masukkan PIN atau gunakan Biometrik untuk membukanya.
          </Text>
          <Pressable
            onPress={() => setNeedsUnlock(true)}
            className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800"
          >
            <Text className="text-sm font-semibold text-white">
              Buka Kunci Catatan
            </Text>
          </Pressable>

          <UnlockModal
            visible={needsUnlock}
            noteId={currentId}
            noteTitle={title}
            cipherText={existingNote.content}
            onClose={() => router.back()}
            onUnlockSuccess={handleInScreenUnlockSuccess}
          />
        </View>
      ) : (
        <View className="flex-1 w-full bg-white dark:bg-slate-950">
          <TiptapEditorDom
            noteId={currentId}
            initialContent={content}
            isDarkMode={isDark}
            onContentChange={handleContentChange}
            dom={{ matchContents: false }}
          />
        </View>
      )}

      {/* Lock Modal */}
      <LockModal
        visible={showLockModal}
        noteId={currentId}
        noteTitle={title}
        currentContent={content}
        onClose={() => setShowLockModal(false)}
        onLockSuccess={handleLockSuccess}
      />

      {/* Unlock Modal for Deleting Locked Note */}
      {showDeleteUnlockModal && existingNote && (
        <UnlockModal
          visible={showDeleteUnlockModal}
          noteId={currentId}
          noteTitle={`Hapus: ${title || 'Catatan Terkunci'}`}
          cipherText={existingNote.content}
          onClose={() => setShowDeleteUnlockModal(false)}
          onUnlockSuccess={() => {
            setShowDeleteUnlockModal(false);
            deleteNote(currentId);
            removeBiometricPin(currentId);
            router.back();
          }}
        />
      )}
    </SafeAreaView>
  );
}
