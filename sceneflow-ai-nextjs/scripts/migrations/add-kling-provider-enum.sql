-- Allow encrypted Kling API keys on user_provider_configs.
ALTER TYPE "enum_user_provider_configs_provider_name" ADD VALUE IF NOT EXISTS 'KLING';
