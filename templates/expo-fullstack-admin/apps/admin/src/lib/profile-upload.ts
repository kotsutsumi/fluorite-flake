import { uploadBuffer } from '@/lib/storage';

export async function saveProfileImage(file: File, userId: string) {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const extension = file.name.split('.').pop()?.toLowerCase() || 'png';
    const filename = `profiles/${userId}-${Date.now()}.${extension}`;
    return uploadBuffer(buffer, filename, file.type || 'application/octet-stream');
}
