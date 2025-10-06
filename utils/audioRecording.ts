// utils/audioRecording.ts
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';

export interface RecordingResult {
  uri: string;
  duration: number; // in milliseconds
  size: number; // in bytes
}

export const requestAudioPermissions = async (): Promise<boolean> => {
  try {
    const { status } = await Audio.requestPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Error requesting audio permissions:', error);
    return false;
  }
};

export const startRecording = async (): Promise<Audio.Recording> => {
  try {
    // Request permissions
    const hasPermission = await requestAudioPermissions();
    if (!hasPermission) {
      throw new Error('Audio recording permission not granted');
    }

    // Set audio mode for recording
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });

    // Create and start recording
    const { recording } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY
    );

    return recording;
  } catch (error) {
    console.error('Failed to start recording:', error);
    throw error;
  }
};

export const stopRecording = async (
  recording: Audio.Recording
): Promise<RecordingResult> => {
  try {
    // Get status and duration before stopping
    const status = await recording.getStatusAsync();
    const duration = status.durationMillis || 0;

    // Stop and unload the recording
    await recording.stopAndUnloadAsync();
    
    // Reset audio mode
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
    });

    const uri = recording.getURI();
    if (!uri) {
      throw new Error('Recording URI is null');
    }

    // Get file info
    const fileInfo = await FileSystem.getInfoAsync(uri);
    const size = fileInfo.exists ? (fileInfo as any).size : 0;

    return {
      uri,
      duration,
      size,
    };
  } catch (error) {
    console.error('Failed to stop recording:', error);
    throw error;
  }
};

export const formatDuration = (milliseconds: number): string => {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

export const playAudio = async (uri: string): Promise<Audio.Sound> => {
  try {
    // Set audio mode to allow playback even in silent mode
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });

    const { sound } = await Audio.Sound.createAsync(
      { uri },
      { shouldPlay: true }
    );
    return sound;
  } catch (error) {
    console.error('Failed to play audio:', error);
    throw error;
  }
};