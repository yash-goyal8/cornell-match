import { supabase } from '@/integrations/supabase/client';

/**
 * Uploads an avatar image to storage and returns the public URL.
 * File is stored at: avatars/{userId}/avatar.{ext}
 */
export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop() || 'jpg';
  const filePath = `${userId}/avatar.${ext}`;

  const { error } = await supabase.storage
    .from('avatars')
    .upload(filePath, file, { upsert: true });

  if (error) throw error;

  const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
  // Append cache-buster to force refresh after update
  return `${data.publicUrl}?t=${Date.now()}`;
}

/**
 * Converts a base64 data URL to a File object for upload.
 */
export function dataUrlToFile(dataUrl: string, filename = 'avatar.jpg'): File {
  const [header, base64] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
  const bytes = atob(base64);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new File([arr], filename, { type: mime });
}
