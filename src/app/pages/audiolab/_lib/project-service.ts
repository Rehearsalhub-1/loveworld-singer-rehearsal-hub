import type {
  AudioLabProject,
  Track,
  CreateProjectInput,
  CreateTrackInput
} from '../_types';

// Collection name
const COLLECTION_NAME = 'audiolab_projects';

// PROJECT CRUD

/**
 * Create a new project
 */
export async function createProject(input: CreateProjectInput): Promise<{ success: boolean; id?: string; project?: AudioLabProject; error?: string }> {
  console.warn('[migration] project-service.ts: createProject — no JWT API route yet');
  void input;
  return { success: false, error: 'Project create unavailable during migration' };
}

/**
 * Listen for project updates in real-time
 */
export function onProjectUpdate(projectId: string, callback: (project: AudioLabProject | null) => void) {
  let active = true;
  getProject(projectId).then(p => {
    if (active) callback(p);
  });
  const interval = setInterval(async () => {
    if (!active) return;
    const p = await getProject(projectId);
    if (active) callback(p);
  }, 10000);

  return () => {
    active = false;
    clearInterval(interval);
  };
}

/**
 * Get a project by ID
 */
export async function getProject(id: string): Promise<AudioLabProject | null> {
  console.warn('[migration] project-service.ts: getProject — no JWT API route yet');
  void id;
  return null;
}

/**
 * Get all projects for a user
 */
export async function getUserProjects(userId: string, limitCount: number = 50): Promise<AudioLabProject[]> {
  console.warn('[migration] project-service.ts: getUserProjects — no JWT API route yet');
  void userId;
  void limitCount;
  return [];
}

/**
 * Update a project
 */
export async function updateProject(
  projectId: string,
  updates: Partial<Omit<AudioLabProject, 'id' | 'createdAt' | 'ownerId'>>
): Promise<{ success: boolean; error?: string }> {
  console.warn('[migration] project-service.ts: updateProject — no JWT API route yet');
  void projectId;
  void updates;
  return { success: false, error: 'Project update unavailable during migration' };
}

/**
 * Delete a project
 */
export async function deleteProject(projectId: string): Promise<{ success: boolean; error?: string }> {
  console.warn('[migration] project-service.ts: deleteProject — no JWT API route yet');
  void projectId;
  return { success: false, error: 'Project delete unavailable during migration' };
}

// TRACK MANAGEMENT

/**
 * Add a track to a project
 */
export async function addTrack(
  projectId: string,
  input: CreateTrackInput
): Promise<{ success: boolean; track?: Track; error?: string }> {
  console.warn('[migration] project-service.ts: addTrack — no JWT API route yet');
  void projectId;
  void input;
  return { success: false, error: 'Add track unavailable during migration' };
}

/**
 * Update a track in a project
 */
export async function updateTrack(
  projectId: string,
  trackId: string,
  updates: Partial<Omit<Track, 'id'>>
): Promise<{ success: boolean; error?: string }> {
  console.warn('[migration] project-service.ts: updateTrack — no JWT API route yet');
  void projectId;
  void trackId;
  void updates;
  return { success: false, error: 'Update track unavailable during migration' };
}

/**
 * Delete a track from a project
 */
export async function deleteTrack(
  projectId: string,
  trackId: string
): Promise<{ success: boolean; error?: string }> {
  console.warn('[migration] project-service.ts: deleteTrack — no JWT API route yet');
  void projectId;
  void trackId;
  return { success: false, error: 'Delete track unavailable during migration' };
}

/**
 * Update track audio URL (after upload to Cloudinary)
 */
export async function updateTrackAudio(
  projectId: string,
  trackId: string,
  audioUrl: string,
  duration: number,
  waveform?: number[]
): Promise<{ success: boolean; error?: string }> {
  return updateTrack(projectId, trackId, {
    audioUrl,
    duration,
    waveform,
    recordedAt: new Date()
  });
}

// COLLABORATOR MANAGEMENT

/**
 * Add a collaborator to a project
 */
export async function addCollaborator(
  projectId: string,
  userId: string,
  projectName?: string,
  inviterName?: string
): Promise<{ success: boolean; error?: string }> {
  console.warn('[migration] project-service.ts: addCollaborator — no JWT API route yet');
  void projectId;
  void userId;
  void projectName;
  void inviterName;
  return { success: false, error: 'Add collaborator unavailable during migration' };
}

/**
 * Remove a collaborator from a project
 */
export async function removeCollaborator(
  projectId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  console.warn('[migration] project-service.ts: removeCollaborator — no JWT API route yet');
  void projectId;
  void userId;
  return { success: false, error: 'Remove collaborator unavailable during migration' };
}

// HELPER FUNCTIONS

/**
 * Generate waveform data from audio buffer
 */
export function generateWaveform(audioBuffer: AudioBuffer, samples: number = 100): number[] {
  const channelData = audioBuffer.getChannelData(0);
  const blockSize = Math.floor(channelData.length / samples);
  const waveform: number[] = [];

  for (let i = 0; i < samples; i++) {
    let sum = 0;
    for (let j = 0; j < blockSize; j++) {
      sum += Math.abs(channelData[i * blockSize + j]);
    }
    waveform.push(sum / blockSize);
  }

  // Normalize to 0-100
  const max = Math.max(...waveform);
  return waveform.map(v => Math.round((v / max) * 100));
}
