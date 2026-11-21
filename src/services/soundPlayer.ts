import { Audio } from 'expo-av';
import { Vibration } from 'react-native';
import { DEFAULT_ALARM_BASE64 } from '../utils/defaultAudio';

let activeSound: Audio.Sound | null = null;
let previewSoundObj: Audio.Sound | null = null;
let isAudioModeConfigured = false;

export async function configureAudioMode() {
  if (isAudioModeConfigured) return;
  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: true,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: false,
      playThroughEarpieceAndroid: false,
    });
    isAudioModeConfigured = true;
  } catch (err) {
    console.warn('Failed to configure audio mode:', err);
  }
}

/**
 * Starts ringing the alarm: plays sound on loop and vibrates device continuously.
 */
export async function startAlarmRing(customSoundUri?: string | null): Promise<void> {
  await stopAlarmRing(); // Ensure any previous sound/vibration is stopped
  await configureAudioMode();

  // Start continuous vibration pattern: [vibrate 800ms, pause 400ms]
  Vibration.vibrate([800, 400], true);

  try {
    const sound = new Audio.Sound();
    activeSound = sound;

    if (customSoundUri) {
      await sound.loadAsync(
        { uri: customSoundUri },
        { shouldPlay: true, isLooping: true, volume: 1.0 }
      );
    } else {
      // Fallback default alarm sound
      await sound.loadAsync(
        { uri: DEFAULT_ALARM_BASE64 },
        { shouldPlay: true, isLooping: true, volume: 1.0 }
      );
    }

    await sound.playAsync();
  } catch (err) {
    console.error('Error starting alarm sound:', err);
    // If custom audio fails (e.g. invalid format), try fallback
    try {
      if (customSoundUri && activeSound) {
        await activeSound.unloadAsync();
        const fallbackSound = new Audio.Sound();
        activeSound = fallbackSound;
        await fallbackSound.loadAsync(
          { uri: DEFAULT_ALARM_BASE64 },
          { shouldPlay: true, isLooping: true, volume: 1.0 }
        );
        await fallbackSound.playAsync();
      }
    } catch (fallbackErr) {
      console.error('Error playing fallback sound:', fallbackErr);
    }
  }
}

/**
 * Stops alarm sound and cancels device vibration.
 */
export async function stopAlarmRing(): Promise<void> {
  Vibration.cancel();

  if (activeSound) {
    try {
      await activeSound.stopAsync();
      await activeSound.unloadAsync();
    } catch (err) {
      console.warn('Error stopping sound:', err);
    } finally {
      activeSound = null;
    }
  }
}

/**
 * Plays a preview of a selected sound.
 */
export async function playPreview(uri: string): Promise<void> {
  await stopPreview();
  await configureAudioMode();

  try {
    const sound = new Audio.Sound();
    previewSoundObj = sound;
    await sound.loadAsync({ uri }, { shouldPlay: true, isLooping: false, volume: 1.0 });
    await sound.playAsync();
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        stopPreview();
      }
    });
  } catch (err) {
    console.warn('Failed to preview sound:', err);
  }
}

/**
 * Stops sound preview.
 */
export async function stopPreview(): Promise<void> {
  if (previewSoundObj) {
    try {
      await previewSoundObj.stopAsync();
      await previewSoundObj.unloadAsync();
    } catch {
      // Ignore cleanup error
    } finally {
      previewSoundObj = null;
    }
  }
}
