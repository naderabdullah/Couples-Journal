// utils/imageCompression.ts
import * as FileSystem from 'expo-file-system/legacy';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

interface CompressionResult {
  uri: string;
  width: number;
  height: number;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
}

export const compressImage = async (uri: string): Promise<CompressionResult> => {
  try {
    console.log('Starting compression for:', uri);
    
    // Get original file info
    const fileInfo = await FileSystem.getInfoAsync(uri);
    console.log('File info:', fileInfo);
    const originalSize = fileInfo.exists ? (fileInfo as any).size : 0;
    console.log('Original size:', originalSize);

    // Define max dimensions (adjust based on your needs)
    const maxWidth = 1200;
    const maxHeight = 1200;

    // Compress and resize image
    // Note: manipulateAsync automatically maintains aspect ratio
    console.log('Starting manipulateAsync...');
    const manipulatedImage = await manipulateAsync(
      uri,
      [
        {
          resize: {
            width: maxWidth,
            height: maxHeight,
          },
        },
      ],
      {
        compress: 0.7, // 0-1, where 1 is max quality
        format: SaveFormat.JPEG, // Convert to JPEG for better compression
      }
    );
    console.log('Manipulation complete:', manipulatedImage);

    // Get compressed file size
    const compressedFileInfo = await FileSystem.getInfoAsync(manipulatedImage.uri);
    const compressedSize = compressedFileInfo.exists ? (compressedFileInfo as any).size : 0;

    // Calculate compression ratio
    const compressionRatio = originalSize > 0 
      ? ((originalSize - compressedSize) / originalSize) * 100 
      : 0;

    return {
      uri: manipulatedImage.uri,
      width: manipulatedImage.width,
      height: manipulatedImage.height,
      originalSize,
      compressedSize,
      compressionRatio,
    };
  } catch (error) {
    console.error('Image compression error details:', error);
    console.error('Error stack:', (error as Error).stack);
    throw new Error('Failed to compress image: ' + (error as Error).message);
  }
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};