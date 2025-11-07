import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { SupabaseConfig } from './supabase.interface';
import { SupabaseConfigValidator } from './supabase-config.validator';
import { createHash } from 'node:crypto';

@Injectable()
export class SupabaseService implements OnModuleInit {
  private readonly logger = new Logger(SupabaseService.name);
  private readonly uploadCache = new Map<string, string>();
  private readonly CACHE_MAX_SIZE = 1000;
  private readonly BUCKET_NAME = 'cdn';
  private supabase: SupabaseClient;
  private config: SupabaseConfig;
  private rootPath: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly configValidator: SupabaseConfigValidator,
  ) {
    this.config = {
      url: this.configService.getOrThrow<string>('SUPABASE_PROJECT_URL'),
      key: this.configService.getOrThrow<string>('SUPABASE_SERVICE_ROLE_KEY'),
      options: {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
        },
      },
    };

    this.rootPath = `${this.config.url}/storage/v1/object/public/cdn/`;
  }

  async onModuleInit() {
    try {
      // Validate configuration first
      const { isValid, errors } = this.configValidator.validateConfig();
      if (!isValid) {
        throw new Error(`Supabase configuration invalid: ${errors.join(', ')}`);
      }

      this.logger.log('Configuration summary:', this.configValidator.getConfigSummary());

      this.supabase = createClient(this.config.url, this.config.key, this.config.options);
      this.logger.log('Supabase client initialized successfully');

      // Test connection and bucket access
      await this.testConnection();
    } catch (error) {
      this.logger.error('Failed to initialize Supabase client', error);
      throw error;
    }
  }

  private async testConnection(): Promise<void> {
    try {
      // Test bucket access
      const { error } = await this.supabase.storage.from(this.BUCKET_NAME).list('', { limit: 1 });

      if (error) {
        // If bucket doesn't exist, try to create it
        if (error.message.includes('not found') || error.message.includes('does not exist')) {
          this.logger.warn(`Bucket '${this.BUCKET_NAME}' not found, attempting to create...`);
          await this.createBucketIfNotExists();
          return;
        }

        this.logger.error(`Bucket '${this.BUCKET_NAME}' access test failed:`, error);
        throw new Error(`Cannot access bucket '${this.BUCKET_NAME}': ${error.message}`);
      }

      this.logger.log(`Bucket '${this.BUCKET_NAME}' access test successful`);
    } catch (error) {
      this.logger.error('Supabase connection test failed:', error);
      throw error;
    }
  }

  private async createBucketIfNotExists(): Promise<void> {
    try {
      const { data: _data, error } = await this.supabase.storage.createBucket(this.BUCKET_NAME, {
        public: true,
        allowedMimeTypes: [
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/webp',
          'application/pdf',
          'text/plain',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ],
        fileSizeLimit: 10 * 1024 * 1024, // 10MB
      });

      if (error) {
        this.logger.error(`Failed to create bucket '${this.BUCKET_NAME}':`, error);
        throw new Error(`Cannot create bucket '${this.BUCKET_NAME}': ${error.message}`);
      }

      this.logger.log(`Bucket '${this.BUCKET_NAME}' created successfully`);
    } catch (error) {
      this.logger.error('Failed to create bucket:', error);
      throw error;
    }
  }

  public getClient(): SupabaseClient {
    return this.supabase;
  }

  public isInitialized(): boolean {
    return !!this.supabase;
  }

  public async uploadFile(
    file: Express.Multer.File,
    options?: { contentType?: string },
  ): Promise<{ data: any; path: string; error: any }> {
    // Validate input
    if (!file || !file.buffer) {
      const error = new Error('Invalid file: missing file or buffer');
      this.logger.error('Upload validation failed:', error.message);
      return { data: null, path: '', error };
    }

    if (!this.supabase) {
      const error = new Error('Supabase client not initialized');
      this.logger.error('Upload failed:', error.message);
      return { data: null, path: '', error };
    }

    const fileHash = createHash('md5').update(file.buffer).digest('hex');
    const cachedPath = this.uploadCache.get(fileHash);

    if (cachedPath) {
      this.logger.log(`File found in cache: ${cachedPath}`);
      return { data: null, path: cachedPath, error: null };
    }

    // Sanitize filename
    const sanitizedFilename = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const path = `${Date.now()}-${sanitizedFilename}`;
    const fullPath = this.getPublicUrl(path);

    try {
      // Add retry logic for network issues
      let retryCount = 0;
      const maxRetries = 3;
      let lastError: any = null;

      while (retryCount < maxRetries) {
        try {
          const uploadOptions = {
            contentType: options?.contentType || file.mimetype,
            cacheControl: '3600',
            upsert: false,
            ...options,
          };

          const { data, error } = await this.supabase.storage
            .from(this.BUCKET_NAME)
            .upload(path, file.buffer, uploadOptions);

          if (error) {
            this.logger.error(`Upload error for bucket (attempt ${retryCount + 1}):`, {
              error: error.message,
              path,
              fileSize: file.buffer.length,
              contentType: uploadOptions.contentType,
            });

            // If it's a network error, retry
            if (error.message.includes('fetch failed') || error.message.includes('network')) {
              lastError = error;
              retryCount++;
              if (retryCount < maxRetries) {
                this.logger.log(`Retrying upload in ${retryCount * 1000}ms...`);
                await new Promise((resolve) => setTimeout(resolve, retryCount * 1000));
                continue;
              }
            }

            return { data, path: fullPath, error };
          }

          this.logger.log(`File uploaded successfully to ${path} (attempt ${retryCount + 1})`);

          // Cache successful upload
          if (this.uploadCache.size >= this.CACHE_MAX_SIZE) {
            const firstKey = this.uploadCache.keys().next().value;
            this.uploadCache.delete(firstKey);
          }
          this.uploadCache.set(fileHash, fullPath);

          return { data, path: fullPath, error: null };
        } catch (attemptError) {
          lastError = attemptError;
          retryCount++;

          if (retryCount < maxRetries) {
            this.logger.warn(`Upload attempt ${retryCount} failed, retrying...`, attemptError);
            await new Promise((resolve) => setTimeout(resolve, retryCount * 1000));
          }
        }
      }

      // All retries failed
      this.logger.error(`Upload failed after ${maxRetries} attempts:`, lastError);
      return { data: null, path: fullPath, error: lastError };
    } catch (error) {
      this.logger.error('Upload exception for bucket:', {
        error: error.message,
        stack: error.stack,
        path,
        fileSize: file.buffer?.length,
        bucketName: this.BUCKET_NAME,
      });
      return { data: null, path: fullPath, error };
    }
  }

  public async downloadFile(path: string): Promise<{ data: Blob | null; error: any }> {
    try {
      const { data, error } = await this.supabase.storage.from(this.BUCKET_NAME).download(path);

      if (error) {
        this.logger.error('Download error for bucket:', error);
      }

      return { data, error };
    } catch (error) {
      this.logger.error('Download exception for bucket:', error);
      return { data: null, error };
    }
  }

  public async deleteFile(fullPath: string): Promise<{ data: any; error: any }> {
    const path = this.extractUrl(fullPath);
    if (!path) {
      return { data: null, error: 'Path do not match for cdn url' };
    }

    try {
      const { data, error } = await this.supabase.storage.from(this.BUCKET_NAME).remove([path]);

      if (error) {
        this.logger.error('Delete file error for bucket:', error);
      } else {
        this.logger.log(`File deleted successfully from ${path}`);
      }

      return { data, error };
    } catch (error) {
      this.logger.error('Delete file exception for bucket:', error);
      return { data: null, error };
    }
  }

  // private helper
  private getPublicUrl(path: string): string {
    return `${this.rootPath}${path}`;
  }

  private extractUrl(url: string): string | null {
    const match = new URL(url).pathname.match(/\/cdn\/(.+)$/);
    return match ? match[1] : null;
  }
}
