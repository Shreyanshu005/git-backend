-- CreateTable
CREATE TABLE "scholarships" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "eligibility" TEXT[],
    "benefits" TEXT[],
    "applicationDeadline" TIMESTAMP(3) NOT NULL,
    "totalSeats" INTEGER NOT NULL,
    "availableSeats" INTEGER NOT NULL,
    "image" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scholarships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scholarship_applications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "scholarshipId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "remarks" TEXT,
    "documents" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scholarship_applications_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "scholarship_applications" ADD CONSTRAINT "scholarship_applications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scholarship_applications" ADD CONSTRAINT "scholarship_applications_scholarshipId_fkey" FOREIGN KEY ("scholarshipId") REFERENCES "scholarships"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
