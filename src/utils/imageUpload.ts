export interface UploadResult {
  success: boolean
  url?: string
  error?: string
}

export async function uploadProfileImage(file: File, _userId: string): Promise<UploadResult> {
  try {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return { success: false, error: 'Invalid file type. Please upload a JPEG, PNG, or WebP image.' }
    }
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      return { success: false, error: 'File size too large. Please upload an image smaller than 5MB.' }
    }

    const { uploadImageToCloudinary } = await import('@/lib/cloudinary-storage')
    const uploadResult = await uploadImageToCloudinary(file)
    if (!uploadResult) {
      return { success: false, error: 'Failed to upload image to Cloudinary' }
    }
    return { success: true, url: uploadResult }
  } catch (error) {
    console.error('Unexpected error during upload:', error)
    return { success: false, error: 'An unexpected error occurred during upload.' }
  }
}

export async function deleteProfileImage(_imageUrl: string): Promise<boolean> {
  console.warn('[migration] deleteProfileImage — Cloudinary destroy not wired yet')
  return true
}

export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Invalid file type. Please upload a JPEG, PNG, or WebP image.' }
  }
  const maxSize = 5 * 1024 * 1024
  if (file.size > maxSize) {
    return { valid: false, error: 'File size too large. Please upload an image smaller than 5MB.' }
  }
  return { valid: true }
}

export async function uploadBannerImage(file: File, _pageId: number | string): Promise<UploadResult> {
  try {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return { success: false, error: 'Invalid file type. Please upload a JPEG, PNG, or WebP image.' }
    }
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      return { success: false, error: 'File size too large. Please upload an image smaller than 5MB.' }
    }

    const { uploadImageToCloudinary } = await import('@/lib/cloudinary-storage')
    const publicUrl = await uploadImageToCloudinary(file)
    if (!publicUrl) {
      return { success: false, error: 'Failed to upload banner to Cloudinary' }
    }
    return { success: true, url: publicUrl }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred during upload.'
    console.error('Unexpected error during banner upload:', error)
    return { success: false, error: message }
  }
}
