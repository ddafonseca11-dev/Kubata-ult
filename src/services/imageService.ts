import { supabase, STORAGE_BUCKET } from '@/lib/supabase';
import type { PropertyImage } from '@/types';

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function validateImageFile(file: File): { valid: boolean; error?: string } {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, error: 'Formato não suportado. Use JPG, PNG ou WEBP.' };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: 'Imagem demasiado grande. Máximo 10MB.' };
  }
  return { valid: true };
}

export async function uploadPropertyImage(
  file: File,
  userId: string,
  propertyId: string
): Promise<{ url: string; storagePath: string } | null> {
  const validation = validateImageFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const fileName = `${userId}/${propertyId}/${crypto.randomUUID()}.${ext}`;
  const fullPath = `${STORAGE_BUCKET}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(fileName, file, {
      contentType: file.type,
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) throw uploadError;

  const { data: urlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(fileName);

  return {
    url: urlData.publicUrl,
    storagePath: fullPath,
  };
}

export async function saveImageRecord(
  propertyId: string,
  url: string,
  storagePath: string | null,
  sortOrder = 0,
  isPrimary = false
): Promise<PropertyImage> {
  const { data, error } = await supabase
    .from('property_images')
    .insert({
      property_id: propertyId,
      url,
      storage_path: storagePath,
      sort_order: sortOrder,
      is_primary: isPrimary,
    })
    .select()
    .single();
  if (error) throw error;
  return data as PropertyImage;
}

export async function deleteImage(image: PropertyImage): Promise<void> {
  // If image has a storage_path, delete from Storage
  if (image.storage_path) {
    const pathParts = image.storage_path.split('/');
    // Remove bucket name from path (first segment)
    const filePath = pathParts.slice(1).join('/');
    if (filePath) {
      const { error: storageError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .remove([filePath]);
      // Don't throw if file doesn't exist — just continue
      if (storageError && !storageError.message.includes('not found')) {
        console.warn('Storage delete warning:', storageError.message);
      }
    }
  }

  // Delete the database record
  const { error } = await supabase
    .from('property_images')
    .delete()
    .eq('id', image.id);
  if (error) throw error;
}

export async function setPrimaryImage(propertyId: string, imageId: string): Promise<void> {
  // Unset all primary flags for this property
  await supabase
    .from('property_images')
    .update({ is_primary: false })
    .eq('property_id', propertyId);

  // Set the new primary
  const { error } = await supabase
    .from('property_images')
    .update({ is_primary: true })
    .eq('id', imageId);
  if (error) throw error;
}

export async function reorderImages(propertyId: string, imageIds: string[]): Promise<void> {
  const updates = imageIds.map((id, index) =>
    supabase.from('property_images').update({ sort_order: index }).eq('id', id)
  );
  await Promise.all(updates);
}
