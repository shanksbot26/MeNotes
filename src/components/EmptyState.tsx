import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useColorScheme } from 'nativewind';
import { FileText, Plus, SearchX } from 'lucide-react-native';

interface EmptyStateProps {
  isSearch?: boolean;
  onAddNew?: () => void;
}

export function EmptyState({ isSearch = false, onAddNew }: EmptyStateProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  if (isSearch) {
    return (
      <View className="items-center justify-center py-16 px-6">
        <View className="w-16 h-16 rounded-3xl bg-slate-100 dark:bg-slate-800 items-center justify-center mb-4">
          <SearchX size={32} color={isDark ? '#94a3b8' : '#64748b'} />
        </View>
        <Text className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-1 text-center">
          Catatan tidak ditemukan
        </Text>
        <Text className="text-sm text-slate-500 dark:text-slate-400 text-center max-w-xs">
          Coba gunakan kata kunci lain untuk mencari judul atau isi catatan Anda.
        </Text>
      </View>
    );
  }

  return (
    <View className="items-center justify-center py-16 px-6">
      <View className="w-20 h-20 rounded-3xl bg-emerald-50 dark:bg-emerald-950/40 items-center justify-center mb-4 border border-emerald-100 dark:border-emerald-900/40">
        <FileText size={36} color={isDark ? '#4ade80' : '#16a34a'} />
      </View>
      <Text className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1 text-center">
        Belum ada catatan
      </Text>
      <Text className="text-sm text-slate-500 dark:text-slate-400 text-center max-w-xs mb-5">
        Mulai menulis ide, to-do list, atau memo harian Anda sekarang.
      </Text>

      {onAddNew && (
        <Pressable
          onPress={onAddNew}
          className="flex-row items-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 px-5 py-3 rounded-xl shadow-sm"
        >
          <Plus size={18} color="#ffffff" />
          <Text className="text-sm font-semibold text-white">
            Buat Catatan Pertama
          </Text>
        </Pressable>
      )}
    </View>
  );
}

