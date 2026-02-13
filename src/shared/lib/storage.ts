import { isSupabaseConfigured, supabase } from './supabase';

export const PRODUCT_IMAGES_BUCKET = 'product-images';

const sanitizeFileName = (name: string) =>
  name
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9._-]+/g, '')
    .slice(0, 120) || 'imagem';

const createObjectId = () => {
  try {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }
  } catch {
    // ignore
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export const uploadProductImages = async ({
  productId,
  files,
}: {
  productId: string;
  files: File[];
}): Promise<{ urls: string[]; errors: string[] }> => {
  if (!isSupabaseConfigured || !supabase) {
    return { urls: [], errors: ['Supabase nao configurado para upload de imagens.'] };
  }

  const safeProductId = productId.trim() || 'produto';
  const bucket = supabase.storage.from(PRODUCT_IMAGES_BUCKET);

  const urls: string[] = [];
  const errors: string[] = [];

  await Promise.all(
    files.map(async (file) => {
      const safeName = sanitizeFileName(file.name);
      const objectId = createObjectId();
      const objectPath = `${safeProductId}/${objectId}-${safeName}`;

      const { error } = await bucket.upload(objectPath, file, {
        upsert: false,
        contentType: file.type || undefined,
        cacheControl: '3600',
      });

      if (error) {
        errors.push(error.message);
        return;
      }

      const { data } = bucket.getPublicUrl(objectPath);
      if (!data?.publicUrl) {
        errors.push('Falha ao obter URL publica da imagem enviada.');
        return;
      }

      urls.push(data.publicUrl);
    })
  );

  return { urls, errors };
};

