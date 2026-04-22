import { randomUUID } from 'crypto';

const SUPABASE_URL = process.env.SUPABASE_URL ?? '';
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? '';

/**
 * Thin Supabase Storage wrapper using native fetch — no SDK dependency needed.
 * Uploads a base64-encoded image and returns its public URL, or null on failure.
 */
export class StorageService {
  /**
   * Frontend to'g'ridan-to'g'ri rasm yuklashi uchun Pre-signed URL yaratish.
   * Buni API orqali frontendga beramiz, frontend o'zi Supabase-ga PUT qiladi.
   */
  static async createSignedUploadUrl(bucket: 'receipts' | 'deliveries' | 'menu', ext: 'jpg' | 'png' = 'jpg'): Promise<{ uploadUrl: string, publicUrl: string } | null> {
    if (!SUPABASE_URL || !SUPABASE_KEY) return null;

    try {
      const filename = `${Date.now()}-${randomUUID()}.${ext}`;
      const url = `${SUPABASE_URL}/storage/v1/object/upload/sign/${bucket}/${filename}`;

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${SUPABASE_KEY}`,
          apikey: SUPABASE_KEY,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        console.error(`[StorageService] Presigned URL failed (${res.status}):`, body);
        return null;
      }

      const data = await res.json();
      return {
        uploadUrl: `${SUPABASE_URL}${data.url}`,
        publicUrl: `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${filename}`
      };
    } catch (err) {
      console.error(`[StorageService] Presigned URL error:`, err);
      return null;
    }
  }

  /**
   * Upload a base64 image to Supabase Storage.
   * @param base64Str  Raw or data-URL base64 string
   * @param bucket     'receipts' | 'deliveries' | 'menu'
   */
  static async uploadBase64(
    base64Str: string,
    bucket: 'receipts' | 'deliveries' | 'menu',
  ): Promise<string | null> {
    if (!base64Str || !SUPABASE_URL || !SUPABASE_KEY) return null;

    try {
      // Strip optional data-URL prefix
      const base64Data = base64Str.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      const isPng = base64Str.includes('image/png');
      const ext = isPng ? 'png' : 'jpg';
      const filename = `${Date.now()}-${randomUUID()}.${ext}`;
      const contentType = `image/${ext}`;

      const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${bucket}/${filename}`;

      const res = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${SUPABASE_KEY}`,
          apikey: SUPABASE_KEY,
          'Content-Type': contentType,
          'Cache-Control': '3600',
          'x-upsert': 'true',
        },
        body: buffer,
      });

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        console.error(`[StorageService] Upload failed (${res.status}):`, body);
        return null;
      }

      return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${filename}`;
    } catch (err) {
      console.error(`[StorageService] ${bucket} upload error:`, err);
      return null;
    }
  }
}
