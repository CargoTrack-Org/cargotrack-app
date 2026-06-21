import fs from 'fs';
import path from 'path';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import { config } from '../config';

export interface StorageProvider {
  upload(fileBuffer: Buffer, fileName: string): Promise<string>;
  download(fileName: string): Promise<Buffer>;
  delete(fileName: string): Promise<void>;
  getFilePath(fileName: string): string;
}

export class LocalStorageProvider implements StorageProvider {
  private uploadDir: string;

  constructor() {
    this.uploadDir = config.uploadDir;
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async upload(fileBuffer: Buffer, fileName: string): Promise<string> {
    const filePath = path.join(this.uploadDir, fileName);
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, fileBuffer);
    return fileName;
  }

  async download(fileName: string): Promise<Buffer> {
    const filePath = path.join(this.uploadDir, fileName);
    if (!fs.existsSync(filePath)) {
      throw new Error('File not found');
    }
    return fs.readFileSync(filePath);
  }

  async delete(fileName: string): Promise<void> {
    const filePath = path.join(this.uploadDir, fileName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  getFilePath(fileName: string): string {
    return path.join(this.uploadDir, fileName);
  }
}

export class S3StorageProvider implements StorageProvider {
  private client: S3Client;
  private bucket: string;

  constructor() {
    const region = process.env.AWS_DEFAULT_REGION;
    const bucket = process.env.S3_BUCKET;

    if (!region) {
      throw new Error('[S3StorageProvider] AWS_DEFAULT_REGION environment variable is not set');
    }
    if (!bucket) {
      throw new Error('[S3StorageProvider] S3_BUCKET environment variable is not set');
    }

    this.bucket = bucket;
    this.client = new S3Client({ region });

    console.log(`[S3StorageProvider] Initialised — bucket: ${this.bucket}, region: ${region}`);
  }

  async upload(fileBuffer: Buffer, fileName: string): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: fileName,
      Body: fileBuffer,
    });

    try {
      await this.client.send(command);
      console.log(`[S3StorageProvider] Uploaded: ${fileName}`);
      return fileName;
    } catch (error) {
      console.error(`[S3StorageProvider] Upload failed for key "${fileName}":`, error);
      throw new Error(`Failed to upload file to S3: ${fileName}`);
    }
  }

  async download(fileName: string): Promise<Buffer> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: fileName,
    });

    try {
      const response = await this.client.send(command);

      if (!response.Body) {
        throw new Error('Empty response body from S3');
      }

      const stream = response.Body as Readable;
      const chunks: Buffer[] = [];

      return new Promise<Buffer>((resolve, reject) => {
        stream.on('data', (chunk: Buffer) => chunks.push(chunk));
        stream.on('end', () => resolve(Buffer.concat(chunks)));
        stream.on('error', reject);
      });
    } catch (error) {
      console.error(`[S3StorageProvider] Download failed for key "${fileName}":`, error);
      throw new Error(`Failed to download file from S3: ${fileName}`);
    }
  }

  async delete(fileName: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: fileName,
    });

    try {
      await this.client.send(command);
      console.log(`[S3StorageProvider] Deleted: ${fileName}`);
    } catch (error) {
      console.error(`[S3StorageProvider] Delete failed for key "${fileName}":`, error);
      throw new Error(`Failed to delete file from S3: ${fileName}`);
    }
  }

  getFilePath(fileName: string): string {
    return `s3://${this.bucket}/${fileName}`;
  }
}

function createStorageProvider(): StorageProvider {
  if (process.env.S3_BUCKET && process.env.AWS_DEFAULT_REGION) {
    console.log('[storage] Using S3StorageProvider');
    return new S3StorageProvider();
  }
  console.log('[storage] Using LocalStorageProvider');
  return new LocalStorageProvider();
}

export const storageProvider: StorageProvider = createStorageProvider();
