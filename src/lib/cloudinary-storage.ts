const BACKEND_URL = (process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || 'https://rehearsalhub-api-production-6a17.up.railway.app').replace(/\/+$/, '');

function getAuthHeader(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = sessionStorage.getItem('jwt') || localStorage.getItem('jwt');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Universal media upload to Cloudflare R2 via rehearsalhub-api
 */
export async function uploadToCloudinary(file: File, onProgress?: (progress: number) => void, folder: string = 'general'): Promise<string> {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);

    const authHeaders = getAuthHeader();
    const endpoint = Object.keys(authHeaders).length > 0 ? `${BACKEND_URL}/api/upload` : `${BACKEND_URL}/api/upload/public`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        ...authHeaders,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload Failed: HTTP ${response.status}`);
    }

    const data = await response.json();
    if (onProgress) onProgress(100);
    
    return data.data?.url || data.url;
  } catch (error) {
    console.error('[Storage] Upload Error:', error);
    throw error;
  }
}

export const uploadImageToCloudinary = async (file: File, onProgress?: (p: number) => void) => 
  uploadToCloudinary(file, onProgress, 'profile_pictures');

export const uploadAudioToCloudinary = async (file: File, onProgress?: (p: number) => void) => 
  uploadToCloudinary(file, onProgress, 'song_audio');

export const deleteFromCloudinary = async (publicId: string, _resourceType?: string): Promise<boolean> => {
  try {
    const authHeaders = getAuthHeader();
    const response = await fetch(`${BACKEND_URL}/api/media/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({ publicId, key: publicId })
    });
    return response.ok;
  } catch (error) {
    console.error('[Storage] Delete error:', error);
    return false;
  }
};

export const getFileType = (fileNameOrMime: string): 'image' | 'audio' | 'video' | 'document' => {
  if (!fileNameOrMime) return 'document';
  const str = fileNameOrMime.toLowerCase();
  
  // Check MIME types first
  if (str.startsWith('image/')) return 'image';
  if (str.startsWith('audio/')) return 'audio';
  if (str.startsWith('video/')) return 'video';

  // Check extensions
  const extension = str.split('.').pop() || '';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(extension)) return 'image';
  if (['mp3', 'wav', 'm4a', 'aac', 'ogg', 'flac', 'wma', 'm4r', 'amr', '3gp', '3gpp'].includes(extension)) return 'audio';
  if (['mp4', 'mov', 'avi', 'wmv', 'flv', 'mkv', 'webm'].includes(extension)) return 'video';
  
  return 'document';
};

export const createCloudinaryMedia = async (mediaData: any, _zoneId?: string): Promise<any> => {
  return mediaData;
};
