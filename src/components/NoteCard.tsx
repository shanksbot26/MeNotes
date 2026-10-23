import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useColorScheme } from 'nativewind';
import { Pin, Trash2, Clock, Lock } from 'lucide-react-native';
import { Note } from '@/db/types';
import { formatRelativeDate } from '@/utils/date';
import { stripHtml } from '@/utils/text';

interface NoteCardProps {
  note: Note;
  onPress?: (note: Note) => void;
  onTogglePin: (id: string) => void;
  onDelete: (id: string) => void;
}

export function NoteCard({
  note,
  onPress,
  onTogglePin,
  onDelete,
}: NoteCardProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const isLocked = !!note.isLocked;
  const cleanExcerpt = isLocked ? '' : stripHtml(note.content);

  return (
    <Pressable
      onPress={() => onPress?.(note)}
      className="bg-white dark:bg-slate-800/90 rounded-2xl p-4 mb-3 border border-slate-200/90 dark:border-slate-700/80 shadow-sm active:scale-[0.99] transition-transform"
    >
      <View className="flex-row items-start justify-between gap-2 mb-1.5">
        <View className="flex-row items-center gap-2 flex-1">
          {isLocked && (
            <View className="w-5 h-5 rounded-md bg-amber-100 dark:bg-amber-950/80 items-center justify-center">
              <Lock size={12} color="#d97706" />
            </View>
          )}
          <Text
            numberOfLines={1}
            className="flex-1 text-base font-semibold text-slate-900 dark:text-slate-100"
          >
            {note.title || 'Tanpa Judul'}
          </Text>
        </View>

        <View className="flex-row items-center gap-1">
          <Pressable
            onPress={(e) => {
              e.stopPropagation?.();
              if ((e as any).nativeEvent?.stopPropagation) {
                (e as any).nativeEvent.stopPropagation();
              }
              onTogglePin(note.id);
            }}
            hitSlop={8}
            className={`p-1.5 rounded-lg ${
              note.isPinned
                ? 'bg-amber-100 dark:bg-amber-950/60'
                : 'hover:bg-slate-100 dark:hover:bg-slate-700/60'
            }`}
            accessibilityLabel={note.isPinned ? 'Lepas sematan' : 'Sematkan catatan'}
          >
            <Pin
              size={16}
              color={
                note.isPinned
                  ? '#d97706'
                  : isDark
                  ? '#64748b'
                  : '#94a3b8'
              }
              fill={note.isPinned ? '#d97706' : 'none'}
            />
          </Pressable>

          <Pressable
            onPress={(e) => {
              e.stopPropagation?.();
              if ((e as any).nativeEvent?.stopPropagation) {
                (e as any).nativeEvent.stopPropagation();
              }
              onDelete(note.id);
            }}
            hitSlop={8}
            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/50"
            accessibilityLabel="Hapus catatan"
          >
            <Trash2 size={16} color={isDark ? '#ef4444' : '#dc2626'} />
          </Pressable>
        </View>
      </View>

      {/* Note Content / Locked Privacy State */}
      {isLocked ? (
        <View className="flex-row items-center gap-2.5 py-2.5 px-3 bg-amber-50/70 dark:bg-amber-950/30 rounded-xl border border-amber-200/60 dark:border-amber-800/40 my-1 mb-2.5">
          <Lock size={15} color="#d97706" />
          <View className="flex-1">
            <Text className="text-xs font-semibold text-amber-900 dark:text-amber-200">
              Catatan Terkunci
            </Text>
            <Text className="text-[11px] text-amber-700/80 dark:text-amber-400/80">
              Ketuk untuk membuka dengan PIN atau Biometrik
            </Text>
          </View>
        </View>
      ) : (
        <Text
          numberOfLines={3}
          className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-3"
        >
          {cleanExcerpt || 'Tidak ada teks isi...'}
        </Text>
      )}

      {/* Footer Info */}
      <View className="flex-row items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700/60">
        <View className="flex-row items-center gap-1.5">
          <Clock size={12} color={isDark ? '#64748b' : '#94a3b8'} />
          <Text className="text-xs text-slate-400 dark:text-slate-500 font-medium">
            {formatRelativeDate(note.updatedAt || note.createdAt)}
          </Text>
        </View>

        {note.tags && note.tags.length > 0 && !isLocked && (
          <View className="flex-row items-center gap-1.5 flex-wrap">
            {note.tags.slice(0, 2).map((tag, idx) => (
              <View
                key={idx}
                className="bg-slate-100 dark:bg-slate-700/70 px-2 py-0.5 rounded-md"
              >
                <Text className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
                  #{tag}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </Pressable>
  );
}
