import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SupabaseConfigValidator {
  private readonly logger = new Logger(SupabaseConfigValidator.name);

  constructor(private readonly configService: ConfigService) {}

  public validateConfig(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check required environment variables
    const requiredVars = ['SUPABASE_PROJECT_URL', 'SUPABASE_SERVICE_ROLE_KEY'];

    for (const varName of requiredVars) {
      const value = this.configService.get<string>(varName);
      if (!value) {
        errors.push(`Missing required environment variable: ${varName}`);
      } else if (varName === 'SUPABASE_PROJECT_URL' && !this.isValidUrl(value)) {
        errors.push(`Invalid SUPABASE_PROJECT_URL format: ${value}`);
      } else if (varName === 'SUPABASE_SERVICE_ROLE_KEY' && !this.isValidServiceKey(value)) {
        errors.push(`Invalid SUPABASE_SERVICE_ROLE_KEY format`);
      }
    }

    const isValid = errors.length === 0;

    if (!isValid) {
      this.logger.error('Supabase configuration validation failed:', errors);
    } else {
      this.logger.log('Supabase configuration validation passed');
    }

    return { isValid, errors };
  }

  private isValidUrl(url: string): boolean {
    try {
      const parsedUrl = new URL(url);
      return parsedUrl.protocol === 'https:' && parsedUrl.hostname.includes('supabase');
    } catch {
      return false;
    }
  }

  private isValidServiceKey(key: string): boolean {
    // Supabase service role keys typically start with 'eyJ' (JWT format)
    return key.length > 100 && key.startsWith('eyJ');
  }

  public getConfigSummary(): Record<string, any> {
    const url = this.configService.get<string>('SUPABASE_PROJECT_URL');
    const key = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');

    return {
      url: url ? `${url.substring(0, 30)}...` : 'NOT_SET',
      keyLength: key ? key.length : 0,
      keyPrefix: key ? key.substring(0, 10) + '...' : 'NOT_SET',
    };
  }
}
