import { Global, Module } from '@nestjs/common';
import { SupabaseService } from './supabase.service';
import { SupabaseConfigValidator } from './supabase-config.validator';

@Global()
@Module({
  providers: [SupabaseService, SupabaseConfigValidator],
  exports: [SupabaseService],
})
export class SupabaseModule {}
