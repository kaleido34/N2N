/*
  Warnings:

  - You are about to drop the column `content_id` on the `Metadata` table. All the data in the column will be lost.
  - Made the column `youtube_id` on table `Metadata` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Metadata" DROP CONSTRAINT "Metadata_content_id_fkey";

-- DropIndex
DROP INDEX "Metadata_content_id_key";

-- AlterTable
ALTER TABLE "DocumentContent" ADD COLUMN     "flashcards" JSONB,
ADD COLUMN     "mindmap" JSONB,
ADD COLUMN     "quiz" JSONB;

-- AlterTable
ALTER TABLE "Metadata" DROP COLUMN "content_id",
ALTER COLUMN "youtube_id" SET NOT NULL;
