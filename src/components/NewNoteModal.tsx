import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useColorScheme } from 'nativewind';
import { X, Check, Pin } from 'lucide-react-native';
import { CreateNoteInput } from '@/db/types';

interface NewNoteModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (note: CreateNoteInput) => void;
}

export function NewNoteModal({ visible, onClose, onSave }: NewNoteModalProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [tagInput, setTagInput] = useState('');

  const handleSave = () => {
    if (!title.trim() && !content.trim()) {
      return;
    }

    const tags = tagInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    onSave({
      title: title.trim() || 'Tanpa Judul',
      content: content.trim(),
      isPinned,
      tags,
    });

    // Reset fields
    setTitle('');
    setContent('');
    setIsPinned(false);
    setTagInput('');
    onClose();
  };

  const handleClose = () => {
    setTitle('');
    setContent('');
    setIsPinned(false);
    setTagInput('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 bg-black/50 justify-center items-center p-4"
      >
        <View className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-2xl max-h-[90%]">
          {/* Header */}
          <View className="flex-row items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
            <Text className="text-lg font-bold text-slate-900 dark:text-white">
              Catatan Baru
            </Text>
            <View className="flex-row items-center gap-2">
              <Pressable
                onPress={() => setIsPinned(!isPinned)}
                className={`p-2 rounded-xl border ${
                  isPinned
                    ? 'bg-amber-100 border-amber-300 dark:bg-amber-950/60 dark:border-amber-700'
                    : 'bg-slate-100 border-slate-200 dark:bg-slate-800 dark:border-slate-700'
                }`}
              >
                <Pin
                  size={16}
                  color={
                    isPinned
                      ? '#d97706'
                      : isDark
                      ? '#94a3b8'
                      : '#64748b'
                  }
                  fill={isPinned ? '#d97706' : 'none'}
                />
              </Pressable>

              <Pressable
                onPress={handleClose}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              >
                <X size={16} color={isDark ? '#cbd5e1' : '#475569'} />
              </Pressable>
            </View>
          </View>

          {/* Form */}
          <ScrollView showsVerticalScrollIndicator={false}>
            <View className="space-y-4 gap-3.5">
              <View>
                <Text className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                  Judul Catatan
                </Text>
                <TextInput
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Misal: Rencana Mingguan..."
                  placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
                  className="bg-slate-50 dark:bg-slate-800/80 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 font-medium"
                  style={{ outlineStyle: 'none' } as any}
                />
              </View>

              <View>
                <Text className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                  Isi Catatan
                </Text>
                <TextInput
                  value={content}
                  onChangeText={setContent}
                  placeholder="Tuliskan detail catatan Anda di sini..."
                  placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                  className="bg-slate-50 dark:bg-slate-800/80 rounded-xl p-3.5 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 min-h-[140px]"
                  style={{ outlineStyle: 'none' } as any}
                />
              </View>

              <View>
                <Text className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                  Tags (Pisahkan dengan koma)
                </Text>
                <TextInput
                  value={tagInput}
                  onChangeText={setTagInput}
                  placeholder="Kerja, Ide, Pribadi"
                  placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
                  className="bg-slate-50 dark:bg-slate-800/80 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 text-sm"
                  style={{ outlineStyle: 'none' } as any}
                />
              </View>
            </View>
          </ScrollView>

          {/* Actions */}
          <View className="flex-row items-center justify-end gap-2.5 pt-4 mt-3 border-t border-slate-100 dark:border-slate-800">
            <Pressable
              onPress={handleClose}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"
            >
              <Text className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Batal
              </Text>
            </Pressable>

            <Pressable
              onPress={handleSave}
              className="flex-row items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 shadow-sm"
            >
              <Check size={16} color="#ffffff" />
              <Text className="text-sm font-semibold text-white">
                Simpan Catatan
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

