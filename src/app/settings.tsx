import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Switch,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'nativewind';
import {
  ArrowLeft,
  Server,
  KeyRound,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Shield,
  FileText,
  Lock,
  Pin,
  Sparkles,
} from 'lucide-react-native';

import { useNotesStore } from '@/store/use-notes-store';
import { testServerConnection, syncNotesWithServer, formatServerUrl } from '@/utils/sync';
import { formatRelativeDate } from '@/utils/date';

export default function SettingsScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const notes = useNotesStore((state) => state.notes);
  const serverUrl = useNotesStore((state) => state.serverUrl);
  const syncToken = useNotesStore((state) => state.syncToken);
  const autoSync = useNotesStore((state) => state.autoSync);
  const lastSyncTimestamp = useNotesStore((state) => state.lastSyncTimestamp);
  const isSyncing = useNotesStore((state) => state.isSyncing);

  const setServerConfig = useNotesStore((state) => state.setServerConfig);
  const setSyncStatus = useNotesStore((state) => state.setSyncStatus);
  const mergeServerNotes = useNotesStore((state) => state.mergeServerNotes);

  const [inputUrl, setInputUrl] = useState(serverUrl);
  const [inputToken, setInputToken] = useState(syncToken);
  const [inputAutoSync, setInputAutoSync] = useState(autoSync);

  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    tested: boolean;
    success: boolean;
    message: string;
  } | null>(null);

  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  const totalNotes = notes.length;
  const lockedNotes = notes.filter((n) => n.isLocked).length;
  const pinnedNotes = notes.filter((n) => n.isPinned).length;

  const handleSaveConfig = () => {
    setServerConfig(inputUrl, inputToken, inputAutoSync);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    setSyncFeedback(null);

    handleSaveConfig();
    const result = await testServerConnection(inputUrl, inputToken);

    setIsTesting(false);
    setTestResult({
      tested: true,
      success: result.success,
      message: result.message,
    });
  };

  const handleManualSync = async () => {
    handleSaveConfig();

    const targetUrl = formatServerUrl(inputUrl);
    if (!targetUrl) {
      setSyncFeedback('Silakan isi URL Server terlebih dahulu.');
      return;
    }

    setSyncStatus(true);
    setSyncFeedback(null);

    try {
      const result = await syncNotesWithServer({
        serverUrl: targetUrl,
        token: inputToken,
        localNotes: notes,
        lastSyncTimestamp: lastSyncTimestamp || 0,
      });

      if (result.success) {
        mergeServerNotes(result.serverNotes as any);
        setSyncStatus(false, result.syncTimestamp);
        setSyncFeedback(
          `Sinkronisasi berhasil! (${result.serverNotes.length} catatan diperbarui)`
        );
      }
    } catch (err: any) {
      setSyncStatus(false);
      setSyncFeedback(err.message || 'Sinkronisasi gagal.');
    }
  };

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      className="flex-1 bg-slate-50 dark:bg-slate-950"
    >
      <View className="flex-1 w-full max-w-2xl mx-auto">
        {/* Header Bar */}
        <View className="flex-row items-center justify-between px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
          <View className="flex-row items-center gap-3">
            <Pressable
              onPress={() => router.back()}
              hitSlop={8}
              className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 active:opacity-70"
            >
              <ArrowLeft size={20} color={isDark ? '#e2e8f0' : '#334155'} />
            </Pressable>
            <Text className="text-lg font-bold text-slate-900 dark:text-white">
              Pengaturan & Server Sync
            </Text>
          </View>
        </View>

        {/* Content */}
        <ScrollView
          className="flex-1 px-4 py-4"
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Section: Server Sync Configuration */}
          <View className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/90 dark:border-slate-800 shadow-sm mb-4">
            <View className="flex-row items-center gap-2.5 mb-4">
              <View className="w-9 h-9 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 items-center justify-center">
                <Server size={18} color="#10b981" />
              </View>
              <View>
                <Text className="text-base font-bold text-slate-900 dark:text-white">
                  Server Mandiri (Self-Hosted)
                </Text>
                <Text className="text-xs text-slate-500 dark:text-slate-400">
                  Sinkronkan catatan ke backend Express + SQLite Anda
                </Text>
              </View>
            </View>

            {/* Input Server URL */}
            <View className="mb-3">
              <Text className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                Custom Server URL
              </Text>
              <View className="flex-row items-center bg-slate-50 dark:bg-slate-800/80 rounded-2xl px-3.5 border border-slate-200 dark:border-slate-700">
                <TextInput
                  value={inputUrl}
                  onChangeText={(val) => {
                    setInputUrl(val);
                    setTestResult(null);
                  }}
                  onBlur={handleSaveConfig}
                  placeholder="Contoh: http://192.168.1.100:3000"
                  placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
                  autoCapitalize="none"
                  autoCorrect={false}
                  className="flex-1 text-sm text-slate-900 dark:text-white py-3 font-mono"
                  style={{ outlineStyle: 'none' } as any}
                />
              </View>
              <Text className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                Alamat IP lokal atau domain publik server self-hosted Anda.
              </Text>
            </View>

            {/* Input Sync Token */}
            <View className="mb-4">
              <Text className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                Sync Secret / Token (Opsional)
              </Text>
              <View className="flex-row items-center bg-slate-50 dark:bg-slate-800/80 rounded-2xl px-3.5 border border-slate-200 dark:border-slate-700">
                <KeyRound size={16} color={isDark ? '#64748b' : '#94a3b8'} style={{ marginRight: 8 }} />
                <TextInput
                  value={inputToken}
                  onChangeText={(val) => {
                    setInputToken(val);
                    setTestResult(null);
                  }}
                  onBlur={handleSaveConfig}
                  placeholder="Isi jika server menggunakan SYNC_SECRET"
                  placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  className="flex-1 text-sm text-slate-900 dark:text-white py-3 font-mono"
                  style={{ outlineStyle: 'none' } as any}
                />
              </View>
            </View>

            {/* Auto-Sync Toggle */}
            <View className="flex-row items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 mb-4">
              <View className="flex-1 mr-3">
                <Text className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Sinkronisasi Otomatis
                </Text>
                <Text className="text-[11px] text-slate-500 dark:text-slate-400">
                  Sinkronkan secara berkala saat membuka aplikasi
                </Text>
              </View>
              <Switch
                value={inputAutoSync}
                onValueChange={(val) => {
                  setInputAutoSync(val);
                  setServerConfig(inputUrl, inputToken, val);
                }}
                thumbColor={inputAutoSync ? '#10b981' : '#94a3b8'}
                trackColor={{ false: '#cbd5e1', true: '#a7f3d0' }}
              />
            </View>

            {/* Connection Test Result Feedback */}
            {testResult && (
              <View
                className={`flex-row items-start gap-2.5 p-3 rounded-2xl mb-4 border ${
                  testResult.success
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800'
                    : 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 size={16} color="#10b981" style={{ marginTop: 2 }} />
                ) : (
                  <AlertCircle size={16} color="#ef4444" style={{ marginTop: 2 }} />
                )}
                <Text
                  className={`text-xs font-medium flex-1 ${
                    testResult.success
                      ? 'text-emerald-800 dark:text-emerald-300'
                      : 'text-red-800 dark:text-red-300'
                  }`}
                >
                  {testResult.message}
                </Text>
              </View>
            )}

            {/* Action Buttons: Test & Sync */}
            <View className="flex-row items-center gap-2.5">
              <Pressable
                onPress={handleTestConnection}
                disabled={isTesting || isSyncing}
                className="flex-1 py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 items-center justify-center flex-row gap-2"
              >
                {isTesting ? (
                  <ActivityIndicator size="small" color="#10b981" />
                ) : (
                  <Text className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Uji Koneksi
                  </Text>
                )}
              </Pressable>

              <Pressable
                onPress={handleManualSync}
                disabled={isTesting || isSyncing}
                className="flex-1 py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 items-center justify-center flex-row gap-2 shadow-sm"
              >
                {isSyncing ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <RefreshCw size={14} color="#ffffff" />
                    <Text className="text-xs font-bold text-white">
                      Sinkronkan Sekarang
                    </Text>
                  </>
                )}
              </Pressable>
            </View>

            {/* Sync Feedback Message */}
            {syncFeedback && (
              <Text className="text-xs text-center text-slate-500 dark:text-slate-400 mt-3 font-medium">
                {syncFeedback}
              </Text>
            )}

            {/* Last Sync Info */}
            <View className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 flex-row items-center justify-between">
              <Text className="text-[11px] text-slate-400">
                Terakhir disinkronkan:
              </Text>
              <Text className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                {lastSyncTimestamp
                  ? formatRelativeDate(lastSyncTimestamp)
                  : 'Belum pernah sinkron'}
              </Text>
            </View>
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

          {/* Section: About MeNotes */}
          <View className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/90 dark:border-slate-800 shadow-sm">
            <View className="flex-row items-center gap-2 mb-2">
              <Sparkles size={16} color="#10b981" />
              <Text className="text-sm font-bold text-slate-900 dark:text-white">
                MeNotes v1.0.0
              </Text>
            </View>
            <Text className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-3">
              Aplikasi catatan modern cross-platform (Web, Android, iOS) berbasis Expo Router, Tiptap DOM Editor, dan arsitektur Offline-First yang aman.
            </Text>
            <View className="flex-row items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-3 py-2 rounded-xl">
              <Shield size={14} color="#10b981" />
              <Text className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                Zero-Knowledge Encryption: Catatan terkunci selalu disimpan dalam bentuk ciphertext di server.
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

