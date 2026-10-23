import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { Sun, Moon, BookOpen, Settings } from 'lucide-react-native';

interface HeaderProps {
  totalNotes: number;
}

export function Header({ totalNotes }: HeaderProps) {
  const router = useRouter();
  const { colorScheme, toggleColorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <View className="flex-row items-center justify-between py-4 px-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
      <View className="flex-row items-center space-x-3 gap-2.5">
        <View className="w-10 h-10 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 items-center justify-center">
          <BookOpen size={22} color={isDark ? '#4ade80' : '#16a34a'} />
        </View>
        <View>
          <View className="flex-row items-center gap-2">
            <Text className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              MeNotes
            </Text>
            <View className="bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/60">
              <Text className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                {totalNotes} {totalNotes === 1 ? 'catatan' : 'catatan'}
              </Text>
            </View>
          </View>
          <Text className="text-xs text-slate-500 dark:text-slate-400">
            Catatan pintar, cepat & offline-first
          </Text>
        </View>
      </View>

      <View className="flex-row items-center gap-1.5">
        <Pressable
          onPress={() => router.push('/settings' as any)}
          className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 items-center justify-center active:opacity-70 transition-all border border-slate-200/60 dark:border-slate-700/60"
          accessibilityLabel="Buka Pengaturan"
        >
          <Settings size={18} color={isDark ? '#cbd5e1' : '#475569'} />
        </Pressable>

        <Pressable
          onPress={toggleColorScheme}
          className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 items-center justify-center active:opacity-70 transition-all border border-slate-200/60 dark:border-slate-700/60"
          accessibilityLabel={isDark ? 'Ganti ke Mode Terang' : 'Ganti ke Mode Gelap'}
        >
          {isDark ? (
            <Sun size={20} color="#fbbf24" />
          ) : (
            <Moon size={20} color="#475569" />
          )}
        </Pressable>
      </View>
    </View>
  );
}
