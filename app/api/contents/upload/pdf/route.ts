import { NextRequest } from "next/server";
import * as pdfjsLib from "pdfjs-dist";
import prisma from "@/lib/prisma";
import { v4 as uuid } from "uuid";

export const config = {
  api: {
    bodyParser: false,
  },
};

async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  const loadingTask = pdfjsLib.getDocument({ data: buffer });
  const pdf = await loadingTask.promise;
  let text = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map((item: any) => item.str).join(" ") + "\n";
  }
  return text;
}

export async function POST(req: NextRequest) {
  // Parse multipart form
  const formData = await req.formData();
  const file = formData.get("file");
  const userId = formData.get("userId");
  const spaceId = formData.get("spaceId");

  if (!file || !(file instanceof Blob)) {
    return new Response("No file uploaded", { status: 400 });
  }
  if (!userId || typeof userId !== "string") {
    return new Response("No userId provided", { status: 400 });
  }

  // If no spaceId, find or create a Default space for this user
  let finalSpaceId = typeof spaceId === "string" && spaceId ? spaceId : undefined;
  if (!finalSpaceId) {
    let defaultSpace = await prisma.space.findFirst({
      where: {
        user_id: userId,
        space_name: "Default",
      },
    });
    if (!defaultSpace) {
      defaultSpace = await prisma.space.create({
        data: {
          user_id: userId,
          space_name: "Default",
        },
      });
    }
    finalSpaceId = defaultSpace.space_id;
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Extract text from PDF using pdfjs-dist
  const text = await extractTextFromPDF(buffer);

  // Create new content/lesson in DB
  const contentId = uuid();
  const docId = uuid();
  const filename = (file as File).name || "uploaded.pdf";
  await prisma.content.create({
    data: {
      content_id: contentId,
      content_type: "DOCUMENT_CONTENT",
      documentContent: {
        create: {
          filename: filename,
          file_url: "", // (optional: upload to S3 or similar)
          doc_id: docId,
          hash: docId, // (for now, use docId as hash)
          text: text, // Store extracted PDF text
        },
      },
      users: {
        create: {
          user_id: userId,
        },
      },
      spaces: {
        create: {
          space_id: finalSpaceId,
        },
      },
    },
  });

  // Ensure userContent relation exists (fix for summary API)
  await prisma.userContent.upsert({
    where: {
      user_id_content_id: {
        user_id: userId,
        content_id: contentId,
      },
    },
    update: {},
    create: {
      user_id: userId,
      content_id: contentId,
    },
  });

  // Optionally, store the extracted text somewhere (e.g., in a separate table or as metadata)
  // For now, you can use the documentContent table or add a new field if needed

  return new Response(JSON.stringify({ contentId, spaceId: finalSpaceId }), { status: 200 });
}