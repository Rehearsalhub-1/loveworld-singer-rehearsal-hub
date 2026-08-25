/**
 * AUDIOLAB UPLOAD SERVICE
 * 
 * Handles uploading audio recordings to Cloudflare R2 via rehearsalhub-api
 */

import { updateTrackAudio } from './project-service';

const BACKEND_URL = (process.env.NEXT_PUBLIC_BACKEND_URL || '').replace(/\/+$/, '');

function getAuthHeader(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = sessionStorage.getItem('jwt') || localStorage.getItem('jwt');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

interface UploadResult {
  success: boolean;
  url?: string;
  publicId?: string;
  duration?: number;
  error?: string;
}

/**
 * Upload audio blob to Cloudflare R2
 */
export async function uploadRecording(
  blob: Blob,
  fileName: string,
  projectId?: string,
  trackId?: string,
  _zoneId?: string
): Promise<UploadResult> {
  try {
    const formData = new FormData();
    formData.append('file', blob, fileName);
    formData.append('folder', `audiolab/${projectId || 'recordings'}`);

    const authHeaders = getAuthHeader();
    const endpoint = `${BACKEND_URL}/api/upload`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        ...authHeaders,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: `Upload failed (${response.status}): ${errorText}` };
    }

    const data = await response.json();
    const uploadedUrl = data.data?.url || data.url;

    if (projectId && trackId) {
      await updateTrackAudio(
        projectId,
        trackId,
        uploadedUrl,
        0
      );
    }

    return {
      success: true,
      url: uploadedUrl,
      publicId: data.data?.key || fileName,
      duration: 0,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
}

/**
 * Upload recording with progress callback
 */
export async function uploadRecordingWithProgress(
  blob: Blob,
  fileName: string,
  onProgress: (percent: number) => void,
  projectId?: string,
  trackId?: string,
  _zoneId?: string
): Promise<UploadResult> {
  try {
    const formData = new FormData();
    formData.append('file', blob, fileName);
    formData.append('folder', `audiolab/${projectId || 'recordings'}`);

    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          onProgress(percent);
        }
      });
      
      xhr.addEventListener('load', async () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          let data;
          try {
            data = JSON.parse(xhr.responseText);
          } catch {
            resolve({ success: false, error: 'Invalid response from server' });
            return;
          }
          
          const uploadedUrl = data.data?.url || data.url;
          if (projectId && trackId) {
            await updateTrackAudio(projectId, trackId, uploadedUrl, 0);
          }
          
          resolve({
            success: true,
            url: uploadedUrl,
            publicId: data.data?.key || fileName,
            duration: 0,
          });
        } else {
          resolve({ success: false, error: 'Upload failed' });
        }
      });
      
      xhr.addEventListener('error', () => {
        resolve({ success: false, error: 'Network error' });
      });
      
      const token = typeof window !== 'undefined' ? (sessionStorage.getItem('jwt') || localStorage.getItem('jwt')) : null;
      xhr.open('POST', `${BACKEND_URL}/api/upload`);
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }
      xhr.send(formData);
    });
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
}

/**
 * Generate a unique filename for recording
 */
export function generateRecordingFileName(projectName?: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const prefix = projectName?.replace(/\s+/g, '_').toLowerCase() || 'recording';
  return `${prefix}_${timestamp}.webm`;
}
