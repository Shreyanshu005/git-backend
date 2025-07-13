-- DropForeignKey
ALTER TABLE "Purchase" DROP CONSTRAINT "Purchase_courseId_fkey";

-- AlterTable
ALTER TABLE "Purchase" ADD COLUMN     "testSeriesId" TEXT,
ALTER COLUMN "courseId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_testSeriesId_fkey" FOREIGN KEY ("testSeriesId") REFERENCES "TestSeries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
