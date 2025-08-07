-- CreateTable
CREATE TABLE "avsar_registrations" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(100) NOT NULL,
    "phone" VARCHAR(15) NOT NULL,
    "college" TEXT NOT NULL,
    "enrollment" VARCHAR(10) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "activity" TEXT NOT NULL,
    "design_exp" TEXT NOT NULL,
    "skills" TEXT NOT NULL,
    "commitment" TEXT NOT NULL,
    "sop" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "avsar_registrations_pkey" PRIMARY KEY ("id")
);
