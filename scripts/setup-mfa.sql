-- MFA Database Setup Script
-- Run this script after Prisma migration to ensure all tables are created correctly

-- Create MFA related enums if they don't exist
DO $$ BEGIN
    CREATE TYPE "MfaType" AS ENUM ('TOTP', 'SMS', 'EMAIL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Update AuthType enum to include MFA types
DO $$ BEGIN
    ALTER TYPE "AuthType" ADD VALUE 'MFA_EMAIL';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TYPE "AuthType" ADD VALUE 'MFA_SMS';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TYPE "AuthType" ADD VALUE 'MFA_TOTP';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TYPE "AuthType" ADD VALUE 'PASSWORD_RESET';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create MfaSetup table
CREATE TABLE IF NOT EXISTS "MfaSetup" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "type" "MfaType" NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "secret" VARCHAR(255),
    "phone" VARCHAR(20),
    "email" VARCHAR(255),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "MfaSetup_pkey" PRIMARY KEY ("id")
);

-- Create MfaBackupCode table
CREATE TABLE IF NOT EXISTS "MfaBackupCode" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "code" VARCHAR(10) NOT NULL,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "usedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MfaBackupCode_pkey" PRIMARY KEY ("id")
);

-- Create LoginSession table
CREATE TABLE IF NOT EXISTS "LoginSession" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "sessionToken" VARCHAR(255) NOT NULL,
    "ipAddress" VARCHAR(45),
    "userAgent" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginSession_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraints
ALTER TABLE "MfaSetup" ADD CONSTRAINT "MfaSetup_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MfaBackupCode" ADD CONSTRAINT "MfaBackupCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LoginSession" ADD CONSTRAINT "LoginSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create unique constraints
ALTER TABLE "MfaSetup" ADD CONSTRAINT "user_mfa_type" UNIQUE ("userId", "type");
ALTER TABLE "MfaBackupCode" ADD CONSTRAINT "user_backup_code" UNIQUE ("userId", "code");
ALTER TABLE "LoginSession" ADD CONSTRAINT "LoginSession_sessionToken_key" UNIQUE ("sessionToken");

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "MfaSetup_userId_idx" ON "MfaSetup"("userId");
CREATE INDEX IF NOT EXISTS "MfaBackupCode_userId_idx" ON "MfaBackupCode"("userId");
CREATE INDEX IF NOT EXISTS "MfaBackupCode_code_idx" ON "MfaBackupCode"("code");
CREATE INDEX IF NOT EXISTS "LoginSession_userId_idx" ON "LoginSession"("userId");
CREATE INDEX IF NOT EXISTS "LoginSession_sessionToken_idx" ON "LoginSession"("sessionToken");
CREATE INDEX IF NOT EXISTS "LoginSession_expiresAt_idx" ON "LoginSession"("expiresAt");

-- Add comments for documentation
COMMENT ON TABLE "MfaSetup" IS 'Stores MFA setup information for users';
COMMENT ON TABLE "MfaBackupCode" IS 'Stores backup codes for MFA recovery';
COMMENT ON TABLE "LoginSession" IS 'Stores active login sessions for users';

COMMENT ON COLUMN "MfaSetup"."secret" IS 'TOTP secret key for authenticator apps';
COMMENT ON COLUMN "MfaSetup"."phone" IS 'Phone number for SMS MFA';
COMMENT ON COLUMN "MfaSetup"."email" IS 'Email for email MFA';
COMMENT ON COLUMN "MfaBackupCode"."code" IS '8-10 character backup code';
COMMENT ON COLUMN "LoginSession"."sessionToken" IS 'Unique session identifier';
COMMENT ON COLUMN "LoginSession"."ipAddress" IS 'IP address of the session';
COMMENT ON COLUMN "LoginSession"."userAgent" IS 'User agent string of the session'; 