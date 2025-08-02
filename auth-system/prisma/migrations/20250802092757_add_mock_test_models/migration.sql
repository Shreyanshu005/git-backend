/*
  Warnings:

  - You are about to drop the `scholarship_applications` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `scholarships` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "CoursePurchase" DROP CONSTRAINT "CoursePurchase_courseId_fkey";

-- DropForeignKey
ALTER TABLE "TestSeriesPurchase" DROP CONSTRAINT "TestSeriesPurchase_testSeriesId_fkey";

-- DropForeignKey
ALTER TABLE "scholarship_applications" DROP CONSTRAINT "scholarship_applications_scholarshipId_fkey";

-- DropForeignKey
ALTER TABLE "scholarship_applications" DROP CONSTRAINT "scholarship_applications_userId_fkey";

-- DropTable
DROP TABLE "scholarship_applications";

-- DropTable
DROP TABLE "scholarships";

-- CreateTable
CREATE TABLE "mock_tests" (
    "id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mock_tests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mock_test_questions" (
    "id" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "questionText" TEXT NOT NULL,
    "options" TEXT[],
    "correctAnswer" INTEGER NOT NULL,
    "questionNumber" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mock_test_questions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mock_tests_expiresAt_idx" ON "mock_tests"("expiresAt");

-- CreateIndex
CREATE INDEX "mock_test_questions_testId_idx" ON "mock_test_questions"("testId");

-- AddForeignKey
ALTER TABLE "TestSeriesPurchase" ADD CONSTRAINT "TestSeriesPurchase_testSeriesId_fkey" FOREIGN KEY ("testSeriesId") REFERENCES "TestSeries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoursePurchase" ADD CONSTRAINT "CoursePurchase_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mock_tests" ADD CONSTRAINT "mock_tests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mock_test_questions" ADD CONSTRAINT "mock_test_questions_testId_fkey" FOREIGN KEY ("testId") REFERENCES "mock_tests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
