import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useColorScheme } from 'nativewind';
import { Lock, Eye, EyeOff, X, ShieldCheck, Fingerprint } from 'lucide-react-native';
import { checkBiometricsAvailable, saveBiometricPin, BiometricStatus } from '@/utils/biometrics';
import { encryptNoteContent } from '@/utils/crypto';

interface LockModalProps {
  visible: boolean;
  noteId: string;
  noteTitle: string;
  currentContent: string;
  onClose: () => void;
  onLockSuccess: (cipherText: string, pin: string) => void;
}

export function LockModal({
  visible,
  noteId,
  noteTitle,
  currentContent,
  onClose,
  onLockSuccess,
}: LockModalProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [allowBiometric, setAllowBiometric] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [biometricStatus, setBiometricStatus] = useState<BiometricStatus>({
    hasHardware: false,
    isEnrolled: false,
    biometricType: 'none',
  });

  useEffect(() => {
    if (visible) {
      setPin('');
      setConfirmPin('');
      setErrorMessage('');
      checkBiometricsAvailable().then(setBiometricStatus);
    }
  }, [visible]);

  const handleLock = async () => {
    setErrorMessage('');

    if (!pin || pin.trim().length < 4) {
      setErrorMessage('PIN/Password minimal 4 karakter.');
      return;
    }

    if (pin !== confirmPin) {
      setErrorMessage('Konfirmasi PIN tidak cocok.');
      return;
    }

    try {
      // Encrypt with AES-256
      const cipherText = encryptNoteContent(currentContent, pin.trim());

      // Save biometric key if enabled and hardware is available
      if (allowBiometric && biometricStatus.isEnrolled) {
        await saveBiometricPin(noteId, pin.trim());
      }

      onLockSuccess(cipherText, pin.trim());
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal mengenkripsi catatan.');
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 bg-black/60 items-center justify-center p-4"
      >
        <View className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-2xl">
          {/* Header */}
          <View className="flex-row items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
            <View className="flex-row items-center gap-2.5">
              <View className="w-9 h-9 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 items-center justify-center">
                <Lock size={18} color="#d97706" />
              </View>
              <View>
                <Text className="text-base font-bold text-slate-900 dark:text-white">
                  Kunci Catatan
                </Text>
                <Text
                  numberOfLines={1}
                  className="text-xs text-slate-500 dark:text-slate-400 max-w-[190px]"
                >
                  {noteTitle || 'Tanpa Judul'}
                </Text>
              </View>
            </View>

            <Pressable
              onPress={onClose}
              hitSlop={8}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X size={18} color={isDark ? '#94a3b8' : '#64748b'} />
            </Pressable>
          </View>

          {/* Info Badge */}
          <View className="flex-row items-center gap-2 bg-emerald-50 dark:bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-100 dark:border-emerald-900/40 mb-3.5">
            <ShieldCheck size={16} color={isDark ? '#4ade80' : '#16a34a'} />
            <Text className="text-xs text-emerald-800 dark:text-emerald-300 font-medium flex-1">
              Data dienkripsi dengan AES-256 dan hanya dapat dibuka dengan PIN Anda.
            </Text>
          </View>

          {/* Form */}
          <View className="space-y-3 gap-2.5">
            <View>
              <Text className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                PIN / Password Baru
              </Text>
              <View className="flex-row items-center bg-slate-50 dark:bg-slate-800 rounded-xl px-3 border border-slate-200 dark:border-slate-700">
                <TextInput
                  value={pin}
                  onChangeText={setPin}
                  secureTextEntry={!showPin}
                  placeholder="Minimal 4 digit/karakter"
                  placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
                  className="flex-1 text-sm text-slate-900 dark:text-white py-2.5"
                  style={{ outlineStyle: 'none' } as any}
                />
                <Pressable
                  onPress={() => setShowPin(!showPin)}
                  hitSlop={8}
                  className="p-1"
                >
                  {showPin ? (
                    <EyeOff size={16} color={isDark ? '#cbd5e1' : '#64748b'} />
                  ) : (
                    <Eye size={16} color={isDark ? '#cbd5e1' : '#64748b'} />
                  )}
                </Pressable>
              </View>
            </View>

            <View>
              <Text className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Konfirmasi PIN / Password
              </Text>
              <View className="flex-row items-center bg-slate-50 dark:bg-slate-800 rounded-xl px-3 border border-slate-200 dark:border-slate-700">
                <TextInput
                  value={confirmPin}
                  onChangeText={setConfirmPin}
                  secureTextEntry={!showPin}
                  placeholder="Ulangi PIN/Password"
                  placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
                  className="flex-1 text-sm text-slate-900 dark:text-white py-2.5"
                  style={{ outlineStyle: 'none' } as any}
                />
              </View>
            </View>

            {/* Biometric Toggle if supported */}
            {biometricStatus.isEnrolled && (
              <View className="flex-row items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80 mt-1">
                <View className="flex-row items-center gap-2 flex-1">
                  <Fingerprint size={18} color="#10b981" />
                  <View>
                    <Text className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      Buka dengan Biometrik
                    </Text>
                    <Text className="text-[10px] text-slate-400">
                      Sidik Jari / Wajah di perangkat ini
                    </Text>
                  </View>
                </View>
                <Switch
                  value={allowBiometric}
                  onValueChange={setAllowBiometric}
                  thumbColor={allowBiometric ? '#10b981' : '#94a3b8'}
                  trackColor={{ false: '#cbd5e1', true: '#a7f3d0' }}
                />
              </View>
            )}

            {/* Error Message */}
            {errorMessage.length > 0 && (
              <Text className="text-xs text-red-500 dark:text-red-400 mt-1">
                {errorMessage}
              </Text>
            )}
          </View>

          {/* Action Buttons */}
          <View className="flex-row items-center justify-end gap-2 pt-4 mt-3 border-t border-slate-100 dark:border-slate-800">
            <Pressable
              onPress={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"
            >
              <Text className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Batal
              </Text>
            </Pressable>

            <Pressable
              onPress={handleLock}
              className="flex-row items-center gap-1.5 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 active:bg-amber-800 shadow-sm"
            >
              <Lock size={15} color="#ffffff" />
              <Text className="text-sm font-semibold text-white">
                Kunci Catatan
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

