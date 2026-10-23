import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const BIOMETRIC_STORAGE_KEY = '@menotes_biometric_pins';

export interface BiometricStatus {
  hasHardware: boolean;
  isEnrolled: boolean;
  biometricType: 'fingerprint' | 'facial' | 'biometric' | 'none';
}

/**
 * Check if the device has biometric hardware and if the user has enrolled.
 */
export async function checkBiometricsAvailable(): Promise<BiometricStatus> {
  if (Platform.OS === 'web') {
    return {
      hasHardware: false,
      isEnrolled: false,
      biometricType: 'none',
    };
  }

  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (!hasHardware) {
      return { hasHardware: false, isEnrolled: false, biometricType: 'none' };
    }

    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    if (!isEnrolled) {
      return { hasHardware: true, isEnrolled: false, biometricType: 'none' };
    }

    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    let biometricType: BiometricStatus['biometricType'] = 'biometric';

    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      biometricType = 'facial';
    } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      biometricType = 'fingerprint';
    }

    return {
      hasHardware: true,
      isEnrolled: true,
      biometricType,
    };
  } catch (error) {
    console.warn('Error checking biometrics:', error);
    return { hasHardware: false, isEnrolled: false, biometricType: 'none' };
  }
}

/**
 * Prompt user for biometric authentication.
 */
export async function authenticateWithBiometrics(
  promptMessage = 'Buka Catatan Terkunci'
): Promise<boolean> {
  if (Platform.OS === 'web') {
    return false;
  }

  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      fallbackLabel: 'Gunakan PIN',
      cancelLabel: 'Batal',
      disableDeviceFallback: false,
    });

    return result.success;
  } catch (error) {
    console.warn('Biometric authentication failed:', error);
    return false;
  }
}

/**
 * Securely store PIN for a note to allow biometric unlocking on this device.
 */
export async function saveBiometricPin(noteId: string, pin: string): Promise<void> {
  try {
    const data = await AsyncStorage.getItem(BIOMETRIC_STORAGE_KEY);
    const map: Record<string, string> = data ? JSON.parse(data) : {};
    map[noteId] = pin;
    await AsyncStorage.setItem(BIOMETRIC_STORAGE_KEY, JSON.stringify(map));
  } catch (err) {
    console.error('Failed to save biometric PIN:', err);
  }
}

/**
 * Retrieve saved PIN for a note when biometric authentication succeeds.
 */
export async function getBiometricPin(noteId: string): Promise<string | null> {
  try {
    const data = await AsyncStorage.getItem(BIOMETRIC_STORAGE_KEY);
    if (!data) return null;
    const map: Record<string, string> = JSON.parse(data);
    return map[noteId] || null;
  } catch (err) {
    console.error('Failed to get biometric PIN:', err);
    return null;
  }
}

/**
 * Remove saved PIN for a note when lock is removed or note is deleted.
 */
export async function removeBiometricPin(noteId: string): Promise<void> {
  try {
    const data = await AsyncStorage.getItem(BIOMETRIC_STORAGE_KEY);
    if (!data) return;
    const map: Record<string, string> = JSON.parse(data);
    delete map[noteId];
    await AsyncStorage.setItem(BIOMETRIC_STORAGE_KEY, JSON.stringify(map));
  } catch (err) {
    console.error('Failed to remove biometric PIN:', err);
  }
}

