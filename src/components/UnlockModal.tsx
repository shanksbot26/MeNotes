import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useColorScheme } from 'nativewind';
import { Lock, Eye, EyeOff, X, Fingerprint, KeyRound } from 'lucide-react-native';
import {
  checkBiometricsAvailable,
  authenticateWithBiometrics,
  getBiometricPin,
  BiometricStatus,
} from '@/utils/biometrics';
import { decryptNoteContent } from '@/utils/crypto';

interface UnlockModalProps {
  visible: boolean;
  noteId: string;
  noteTitle: string;
  cipherText: string;
  onClose: () => void;
  onUnlockSuccess: (decryptedContent: string, pin: string) => void;
}

export function UnlockModal({
  visible,
  noteId,
  noteTitle,
  cipherText,
  onClose,
  onUnlockSuccess,
}: UnlockModalProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [biometricStatus, setBiometricStatus] = useState<BiometricStatus>({
    hasHardware: false,
    isEnrolled: false,
    biometricType: 'none',
  });

  useEffect(() => {
    if (visible) {
      setPin('');
      setErrorMessage('');
      setIsLoading(false);
      checkBiometricsAvailable().then((status) => {
        setBiometricStatus(status);
        // Automatically attempt biometric prompt if enrolled on mobile
        if (status.isEnrolled) {
          triggerBiometricUnlock();
        }
      });
    }
  }, [visible]);

  const triggerBiometricUnlock = async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const authenticated = await authenticateWithBiometrics(
        `Buka Catatan "${noteTitle || 'Terkunci'}"`
      );

      if (authenticated) {
        const savedPin = await getBiometricPin(noteId);
        if (savedPin) {
          const decrypted = decryptNoteContent(cipherText, savedPin);
          onUnlockSuccess(decrypted, savedPin);
          onClose();
          return;
        } else {
          setErrorMessage(
            'Biometrik berhasil, namun PIN belum tersimpan. Silakan masukkan PIN sekali untuk verifikasi.'
          );
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Verifikasi biometrik gagal.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnlockWithPin = () => {
    setErrorMessage('');

    if (!pin || pin.trim().length === 0) {
      setErrorMessage('Silakan masukkan PIN atau Password.');
      return;
    }

    try {
      setIsLoading(true);
      const decrypted = decryptNoteContent(cipherText, pin.trim());
      onUnlockSuccess(decrypted, pin.trim());
      onClose();
    } catch (err: any) {
      setErrorMessage('PIN atau Password tidak sesuai.');
    } finally {
      setIsLoading(false);
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
        <View className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl">
          {/* Header */}
          <View className="items-center mb-5">
            <View className="w-14 h-14 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 items-center justify-center mb-3 border border-amber-500/20">
              <Lock size={26} color="#d97706" />
            </View>
            <Text className="text-lg font-bold text-slate-900 dark:text-white text-center">
              Catatan Terkunci
            </Text>
            <Text
              numberOfLines={1}
              className="text-xs text-slate-500 dark:text-slate-400 text-center max-w-[220px] mt-0.5"
            >
              {noteTitle || 'Tanpa Judul'}
            </Text>
          </View>

          {/* Close button */}
          <Pressable
            onPress={onClose}
            hitSlop={8}
            className="absolute top-4 right-4 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X size={18} color={isDark ? '#94a3b8' : '#64748b'} />
          </Pressable>

          {/* Biometrics Quick Action on Mobile */}
          {biometricStatus.isEnrolled && (
            <Pressable
              onPress={triggerBiometricUnlock}
              disabled={isLoading}
              className="flex-row items-center justify-center gap-2.5 py-3 px-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 mb-4 active:scale-[0.98] transition-transform"
            >
              <Fingerprint size={20} color={isDark ? '#4ade80' : '#16a34a'} />
              <Text className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                Buka dengan Sidik Jari / Wajah
              </Text>
            </Pressable>
          )}

          {/* Divider if Biometrics is shown */}
          {biometricStatus.isEnrolled && (
            <View className="flex-row items-center gap-2 mb-4">
              <View className="flex-1 h-[1px] bg-slate-200 dark:bg-slate-800" />
              <Text className="text-[11px] font-medium text-slate-400">
                ATAU DENGAN PIN
              </Text>
              <View className="flex-1 h-[1px] bg-slate-200 dark:bg-slate-800" />
            </View>
          )}

          {/* PIN Input Form */}
          <View className="space-y-3 gap-2">
            <View className="flex-row items-center bg-slate-50 dark:bg-slate-800 rounded-2xl px-3.5 border border-slate-200 dark:border-slate-700">
              <KeyRound size={16} color={isDark ? '#94a3b8' : '#64748b'} className="mr-2" />
              <TextInput
                value={pin}
                onChangeText={setPin}
                secureTextEntry={!showPin}
                placeholder="Masukkan PIN / Password"
                placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
                className="flex-1 text-sm text-slate-900 dark:text-white py-3"
                style={{ outlineStyle: 'none' } as any}
                onSubmitEditing={handleUnlockWithPin}
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

            {/* Error Message */}
            {errorMessage.length > 0 && (
              <Text className="text-xs text-red-500 dark:text-red-400 text-center mt-1">
                {errorMessage}
              </Text>
            )}
          </View>

          {/* Action Buttons */}
          <View className="flex-row items-center justify-end gap-2 pt-4 mt-2">
            <Pressable
              onPress={onClose}
              disabled={isLoading}
              className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 items-center"
            >
              <Text className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Batal
              </Text>
            </Pressable>

            <Pressable
              onPress={handleUnlockWithPin}
              disabled={isLoading}
              className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 shadow-sm items-center justify-center flex-row gap-1.5"
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text className="text-sm font-semibold text-white">
                  Buka Kunci
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

