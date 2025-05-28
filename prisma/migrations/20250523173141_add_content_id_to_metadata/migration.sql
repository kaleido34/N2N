/*
  Warnings:

  - A unique constraint covering the columns `[content_id]` on the table `Metadata` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Metadata" ADD COLUMN     "content_id" TEXT,
ALTER COLUMN "youtube_id" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Metadata_content_id_key" ON "Metadata"("content_id");

-- AddForeignKey
ALTER TABLE "Metadata" ADD CONSTRAINT "Metadata_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "Content"("content_id") ON DELETE CASCADE ON UPDATE CASCADE;
