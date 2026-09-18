import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';

export interface UploadResult {
  url: string;           // public/signed URL
  thumbnailUrl?: string; // resized preview URL (images only)
  oemFileName: string;   // final filename applied at upload time
  provider: 's3' | 'local';
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3Client: S3Client | null;
  private readonly bucket: string;
  private readonly region: string;
  private readonly localUploadPath: string;
  private readonly useS3: boolean;

  constructor(private readonly config: ConfigService) {
    const keyId     = this.config.get<string>('AWS_ACCESS_KEY_ID');
    const secret    = this.config.get<string>('AWS_SECRET_ACCESS_KEY');
    this.bucket     = this.config.get<string>('AWS_S3_BUCKET') ?? '';
    this.region     = this.config.get<string>('AWS_REGION') ?? 'ap-southeast-2';
    this.localUploadPath = this.config.get<string>('LOCAL_UPLOAD_PATH') ?? './uploads';

    this.useS3 = !!(keyId && secret && this.bucket);

    if (this.useS3) {
      this.s3Client = new S3Client({
        region: this.region,
        credentials: { accessKeyId: keyId!, secretAccessKey: secret! },
      });
      this.logger.log(`StorageService: using AWS S3 (bucket: ${this.bucket}, region: ${this.region})`);
    } else {
      this.s3Client = null;
      this.ensureLocalDir(this.localUploadPath);
      this.ensureLocalDir(path.join(this.localUploadPath, 'thumbs'));
      this.logger.log(`StorageService: AWS keys not set — using local disk at "${this.localUploadPath}"`);
    }
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  /**
   * Upload a file buffer.
   * @param buffer     Raw file bytes
   * @param mimeType   MIME type (image/jpeg, video/mp4, application/pdf)
   * @param oemFileName OEM-compliant filename e.g. CR-98421FaultClose.jpg
   * @param caseId     Used as S3 folder prefix / local sub-folder
   */
  async uploadFile(
    buffer: Buffer,
    mimeType: string,
    oemFileName: string,
    caseId: string,
  ): Promise<UploadResult> {
    const isImage = mimeType.startsWith('image/');
    let thumbnailUrl: string | undefined;

    if (this.useS3) {
      const url = await this.uploadToS3(buffer, mimeType, oemFileName, caseId);

      if (isImage) {
        const thumbBuffer = await this.generateThumbnail(buffer);
        const thumbName = `thumbs/${oemFileName}`;
        thumbnailUrl = await this.uploadToS3(thumbBuffer, 'image/jpeg', thumbName, caseId);
      }

      return { url, thumbnailUrl, oemFileName, provider: 's3' };
    } else {
      const url = await this.saveToLocal(buffer, oemFileName, caseId);

      if (isImage) {
        const thumbBuffer = await this.generateThumbnail(buffer);
        thumbnailUrl = await this.saveToLocal(thumbBuffer, oemFileName, caseId, true);
      }

      return { url, thumbnailUrl, oemFileName, provider: 'local' };
    }
  }

  /** Delete a file by its stored URL */
  async deleteFile(url: string): Promise<void> {
    if (this.useS3 && this.s3Client) {
      const key = this.s3KeyFromUrl(url);
      if (!key) return;
      await this.s3Client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
    } else {
      const filePath = this.localPathFromUrl(url);
      if (filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
  }

  /** Generate a pre-signed S3 URL (S3 only; local URLs don't expire) */
  async getSignedUrl(storedUrl: string, expiresInSeconds = 86400): Promise<string> {
    if (!this.useS3 || !this.s3Client) return storedUrl;
    const key = this.s3KeyFromUrl(storedUrl);
    if (!key) return storedUrl;
    const cmd = new PutObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.s3Client, cmd, { expiresIn: expiresInSeconds });
  }

  // ─── S3 helpers ────────────────────────────────────────────────────────────

  private async uploadToS3(
    buffer: Buffer,
    mimeType: string,
    fileName: string,
    caseId: string,
  ): Promise<string> {
    const key = `cases/${caseId}/${fileName}`;
    await this.s3Client!.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
        // ACL removed — bucket policy should handle public access
      }),
    );
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
  }

  private s3KeyFromUrl(url: string): string | null {
    try {
      const u = new URL(url);
      return u.pathname.startsWith('/') ? u.pathname.slice(1) : u.pathname;
    } catch {
      return null;
    }
  }

  // ─── Local disk helpers ────────────────────────────────────────────────────

  private async saveToLocal(
    buffer: Buffer,
    oemFileName: string,
    caseId: string,
    isThumb = false,
  ): Promise<string> {
    const subDir = isThumb
      ? path.join(this.localUploadPath, 'thumbs', caseId)
      : path.join(this.localUploadPath, caseId);

    this.ensureLocalDir(subDir);
    const filePath = path.join(subDir, oemFileName);
    fs.writeFileSync(filePath, buffer);

    // Return a URL path that will be served by the static middleware
    const urlPath = isThumb
      ? `/uploads/thumbs/${caseId}/${oemFileName}`
      : `/uploads/${caseId}/${oemFileName}`;

    return urlPath;
  }

  private localPathFromUrl(url: string): string | null {
    if (!url.startsWith('/uploads/')) return null;
    return path.join(this.localUploadPath, url.replace('/uploads/', ''));
  }

  private ensureLocalDir(dir: string): void {
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    } catch (err: any) {
      this.logger.warn(`Could not create directory ${dir}: ${err?.message}`);
    }
  }

  // ─── Thumbnail generation (images only) ───────────────────────────────────

  private async generateThumbnail(buffer: Buffer): Promise<Buffer> {
    return sharp(buffer)
      .resize({ width: 400, withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();
  }
}
