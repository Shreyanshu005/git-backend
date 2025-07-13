/*
  Warnings:

  - You are about to drop the column `testSeriesId` on the `Purchase` table. All the data in the column will be lost.
  - Made the column `courseId` on table `Purchase` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Purchase" DROP CONSTRAINT "Purchase_courseId_fkey";

-- DropForeignKey
ALTER TABLE "Purchase" DROP CONSTRAINT "Purchase_testSeriesId_fkey";

-- AlterTable
ALTER TABLE "Purchase" DROP COLUMN "testSeriesId",
ALTER COLUMN "courseId" SET NOT NULL;

-- CreateTable
CREATE TABLE "TestSeriesPurchase" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "testSeriesId" TEXT NOT NULL,
    "purchasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL,

    CONSTRAINT "TestSeriesPurchase_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "TestSeriesPurchase" ADD CONSTRAINT "TestSeriesPurchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestSeriesPurchase" ADD CONSTRAINT "TestSeriesPurchase_testSeriesId_fkey" FOREIGN KEY ("testSeriesId") REFERENCES "TestSeries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
