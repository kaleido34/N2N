ALTER TABLE "DocumentContent" ADD COLUMN IF NOT EXISTS "summary" TEXT;
ALTER TABLE "DocumentContent" ADD COLUMN IF NOT EXISTS "transcript" JSONB;
