-- CreateTable
CREATE TABLE "TestSeries" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "startDate" TEXT NOT NULL,
    "features" TEXT[],
    "price" INTEGER NOT NULL,
    "originalPrice" INTEGER NOT NULL,
    "discount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TestSeries_pkey" PRIMARY KEY ("id")
);
