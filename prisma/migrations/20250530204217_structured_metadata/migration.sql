/*
  Warnings:

  - You are about to drop the column `flashcards` on the `DocumentContent` table. All the data in the column will be lost.
  - You are about to drop the column `mindmap` on the `DocumentContent` table. All the data in the column will be lost.
  - You are about to drop the column `quiz` on the `DocumentContent` table. All the data in the column will be lost.
  - You are about to drop the column `summary` on the `DocumentContent` table. All the data in the column will be lost.
  - You are about to drop the column `youtube_id` on the `Metadata` table. All the data in the column will be lost.
  - You are about to drop the `ChatRoom` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Message` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[content_id]` on the table `Metadata` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `content_id` to the `Metadata` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ContentType" ADD VALUE 'AUDIO_CONTENT';
ALTER TYPE "ContentType" ADD VALUE 'IMAGE_CONTENT';

-- DropForeignKey
ALTER TABLE "ChatRoom" DROP CONSTRAINT "ChatRoom_content_id_fkey";

-- DropForeignKey
ALTER TABLE "ChatRoom" DROP CONSTRAINT "ChatRoom_user_id_fkey";

-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_chatroom_id_fkey";

-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_parent_id_fkey";

-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_user_id_fkey";

-- DropForeignKey
ALTER TABLE "Metadata" DROP CONSTRAINT "Metadata_youtube_id_fkey";

-- DropIndex
DROP INDEX "Metadata_youtube_id_key";

-- AlterTable
ALTER TABLE "DocumentContent" DROP COLUMN "flashcards",
DROP COLUMN "mindmap",
DROP COLUMN "quiz",
DROP COLUMN "summary";

-- AlterTable
ALTER TABLE "Metadata" DROP COLUMN "youtube_id",
ADD COLUMN     "audio_summary" TEXT,
ADD COLUMN     "content_id" TEXT NOT NULL;

-- DropTable
DROP TABLE "ChatRoom";

-- DropTable
DROP TABLE "Message";

-- CreateTable
CREATE TABLE "AudioContent" (
    "content_id" TEXT NOT NULL,
    "audio_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "audio_url" TEXT NOT NULL,
    "duration" INTEGER,
    "transcript" JSONB,

    CONSTRAINT "AudioContent_pkey" PRIMARY KEY ("content_id")
);

-- CreateTable
CREATE TABLE "ImageContent" (
    "content_id" TEXT NOT NULL,
    "image_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "image_url" TEXT NOT NULL,
    "text" TEXT,

    CONSTRAINT "ImageContent_pkey" PRIMARY KEY ("content_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AudioContent_audio_id_key" ON "AudioContent"("audio_id");

-- CreateIndex
CREATE UNIQUE INDEX "ImageContent_image_id_key" ON "ImageContent"("image_id");

-- CreateIndex
CREATE UNIQUE INDEX "Metadata_content_id_key" ON "Metadata"("content_id");

-- AddForeignKey
ALTER TABLE "AudioContent" ADD CONSTRAINT "AudioContent_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "Content"("content_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImageContent" ADD CONSTRAINT "ImageContent_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "Content"("content_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Metadata" ADD CONSTRAINT "Metadata_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "Content"("content_id") ON DELETE CASCADE ON UPDATE CASCADE;
