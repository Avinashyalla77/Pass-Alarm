import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { Alarm } from '../types/alarm';

const STORAGE_KEY = '@passalarm_alarms_v1';
const MASTER_KEY_STORAGE = '@passalarm_master_key_v1';
const MASTER_HINT_STORAGE = '@passalarm_master_hint_v1';

export async function getStoredAlarms(): Promise<Alarm[]> {
  try {
    const json = await AsyncStorage.getItem(STORAGE_KEY);
    if (!json) return [];
    return JSON.parse(json) as Alarm[];
  } catch (err) {
    console.error('Failed to load alarms:', err);
    return [];
  }
}

export async function saveAlarms(alarms: Alarm[]): Promise<boolean> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(alarms));
    return true;
  } catch (err) {
    console.error('Failed to save alarms:', err);
    return false;
  }
}

export async function getSavedMasterKey(): Promise<{ key: string; hint?: string }> {
  try {
    const key = await AsyncStorage.getItem(MASTER_KEY_STORAGE);
    const hint = await AsyncStorage.getItem(MASTER_HINT_STORAGE);
    return { key: key || '', hint: hint || undefined };
  } catch {
    return { key: '' };
  }
}

export async function saveMasterKey(key: string, hint?: string): Promise<void> {
  try {
    await AsyncStorage.setItem(MASTER_KEY_STORAGE, key);
    if (hint) {
      await AsyncStorage.setItem(MASTER_HINT_STORAGE, hint);
    }
  } catch (err) {
    console.warn('Failed to save master key:', err);
  }
}

/**
 * Copies a user-picked audio file to the permanent app document directory
 * so it remains accessible even after device temp directory cleanups.
 */
export async function persistAudioFile(sourceUri: string, originalName: string): Promise<string> {
  try {
    const documentDir = FileSystem.documentDirectory;
    if (!documentDir) {
      return sourceUri;
    }

    const soundsDir = `${documentDir}alarm_sounds/`;
    const dirInfo = await FileSystem.getInfoAsync(soundsDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(soundsDir, { intermediates: true });
    }

    const sanitizedName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const targetUri = `${soundsDir}${Date.now()}_${sanitizedName}`;

    await FileSystem.copyAsync({
      from: sourceUri,
      to: targetUri,
    });

    return targetUri;
  } catch (err) {
    console.warn('Could not copy audio to document directory, falling back to source URI:', err);
    return sourceUri;
  }
}
