import React from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'nativewind';
import {
  ArrowLeft,
  Server,
  Shield,
  FileText,
  Lock,
  Pin,
  Sparkles,
  CheckCircle2,
} from 'lucide-react-native';

import { useNotesStore } from '@/store/use-notes-store';
import { formatRelativeDate } from '@/utils/date';

export default function SettingsScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const notes = useNotesStore((state) => state.notes);
  const lastSyncTimestamp = useNotesStore((state) => state.lastSyncTimestamp);

  const totalNotes = notes.length;
  const lockedNotes = notes.filter((n) => n.isLocked).length;
  const pinnedNotes = notes.filter((n) => n.isPinned).length;

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      className="flex-1 bg-slate-50 dark:bg-slate-950"
    >
      <View className="flex-1 max-w-2xl mx-auto w-full">
        {/* Header */}
        <View className="flex-row items-center px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 active:opacity-70 mr-3"
            accessibilityLabel="Kembali"
          >
            <ArrowLeft size={20} color={isDark ? '#e2e8f0' : '#334155'} />
          </Pressable>
          <Text className="text-lg font-bold text-slate-900 dark:text-white">
            Pengaturan
          </Text>
        </View>

        {/* Content */}
        <ScrollView
          className="flex-1 px-4 py-4"
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Section: Automatic Realtime Sync Status */}
          <View className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/90 dark:border-slate-800 shadow-sm mb-4">
            <View className="flex-row items-center gap-2.5 mb-3">
              <View className="w-9 h-9 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 items-center justify-center">
                <Server size={18} color="#10b981" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-bold text-slate-900 dark:text-white">
                  Sinkronisasi Realtime
                </Text>
                <Text className="text-xs text-slate-500 dark:text-slate-400">
                  Otomatis terhubung antar semua perangkat
                </Text>
              </View>
              <View className="flex-row items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                <View className="w-2 h-2 rounded-full bg-emerald-500" />
                <Text className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                  Aktif
                </Text>
              </View>
            </View>

            <View className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/70 dark:border-slate-700/60 mb-3">
              <View className="flex-row items-center justify-between mb-1.5">
                <Text className="text-xs text-slate-500 dark:text-slate-400">
                  Mode Sinkronisasi:
                </Text>
                <Text className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  Full Realtime (SSE)
                </Text>
              </View>
              <View className="flex-row items-center justify-between">
                <Text className="text-xs text-slate-500 dark:text-slate-400">
                  Status Terakhir:
                </Text>
                <Text className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {lastSyncTimestamp
                    ? formatRelativeDate(lastSyncTimestamp)
                    : 'Sinkronisasi Otomatis'}
                </Text>
              </View>
            </View>

            <Text className="text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed">
              Catatan yang Anda buat, edit, atau hapus otomatis diperbarui secara instan di semua perangkat (PC Laptop, Tablet, & Ponsel) tanpa perlu pengaturan manual.
            </Text>
          </View>

          {/* Section: Storage Summary */}
          <View className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/90 dark:border-slate-800 shadow-sm mb-4">
            <Text className="text-sm font-bold text-slate-900 dark:text-white mb-3">
              Ringkasan Data Lokal
            </Text>

            <View className="flex-row items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
              <View className="flex-row items-center gap-2">
                <FileText size={16} color="#64748b" />
                <Text className="text-xs text-slate-600 dark:text-slate-300">
                  Total Catatan
                </Text>
              </View>
              <Text className="text-xs font-bold text-slate-900 dark:text-white">
                {totalNotes}
              </Text>
            </View>

            <View className="flex-row items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
              <View className="flex-row items-center gap-2">
                <Lock size={16} color="#d97706" />
                <Text className="text-xs text-slate-600 dark:text-slate-300">
                  Catatan Terkunci (AES-256)
                </Text>
              </View>
              <Text className="text-xs font-bold text-amber-600 dark:text-amber-400">
                {lockedNotes}
              </Text>
            </View>

            <View className="flex-row items-center justify-between py-2">
              <View className="flex-row items-center gap-2">
                <Pin size={16} color="#3b82f6" />
                <Text className="text-xs text-slate-600 dark:text-slate-300">
                  Catatan Disematkan
                </Text>
              </View>
              <Text className="text-xs font-bold text-blue-600 dark:text-blue-400">
                {pinnedNotes}
              </Text>
            </View>
          </View>

          {/* Section: Security Details */}
          <View className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/90 dark:border-slate-800 shadow-sm mb-4">
            <View className="flex-row items-center gap-2 mb-2">
              <Shield size={18} color="#10b981" />
              <Text className="text-sm font-bold text-slate-900 dark:text-white">
                Keamanan & Enkripsi
              </Text>
            </View>
            <Text className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-3">
              Catatan terkunci dienkripsi menggunakan algoritma standar militer **AES-256** (`crypto-js`). Kunci dekripsi dan PIN Anda hanya disimpan sementara di sesi memori perangkat dan tidak pernah dikirim dalam teks mentah ke database server.
            </Text>
            <View className="flex-row items-center gap-2 px-3 py-2 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200/60 dark:border-emerald-800/40">
              <CheckCircle2 size={14} color="#10b981" />
              <Text className="text-[11px] font-medium text-emerald-800 dark:text-emerald-300">
                Enkripsi AES-256 & Biometrik Aktif
              </Text>
            </View>
          </View>

          {/* App Info */}
          <View className="items-center py-4">
            <View className="flex-row items-center gap-1.5 mb-1">
              <Sparkles size={14} color="#10b981" />
              <Text className="text-xs font-bold text-slate-700 dark:text-slate-300">
                MeNotes App v1.0.0
              </Text>
            </View>
            <Text className="text-[11px] text-slate-400 dark:text-slate-500">
              Self-Hosted • Cross-Platform • End-to-End Encrypted
            </Text>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
