-- First add the new column as nullable
ALTER TABLE "ebooks" ADD COLUMN "fileUrl" TEXT;

-- Copy data from pdfUrl to fileUrl
UPDATE "ebooks" SET "fileUrl" = "pdfUrl";

-- Make the column required
ALTER TABLE "ebooks" ALTER COLUMN "fileUrl" SET NOT NULL;

-- Drop the old column
ALTER TABLE "ebooks" DROP COLUMN "pdfUrl";
