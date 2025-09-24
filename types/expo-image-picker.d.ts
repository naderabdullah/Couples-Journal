// types/expo-image-picker.d.ts
// This file provides type declarations for the new MediaType API

import 'expo-image-picker';

declare module 'expo-image-picker' {
  export enum MediaType {
    IMAGE = 'image',
    VIDEO = 'video',
  }
  
  // Ensure the MediaTypeOptions is marked as deprecated
  /**
   * @deprecated Use MediaType or an array of MediaType instead
   */
  export const MediaTypeOptions: {
    All: 'All';
    Videos: 'Videos';
    Images: 'Images';
  };
}