import { uploadAudioToCloudinary as uploadAudioToR2 } from './cloudinary-storage';

// Compatibility names retained while media storage is served from R2.
export async function uploadAudioToCloudinary(file: File): Promise<string | null> {
  try {
    return await uploadAudioToR2(file);
  } catch (error) {
    console.error('Error uploading audio to R2:', error);
    return null;
  }
}

export async function deleteAudioFromCloudinary(publicId: string): Promise<boolean> {
  void publicId;
  console.warn('Deleting media by storage key is not supported by the current API.');
  return false;
}
