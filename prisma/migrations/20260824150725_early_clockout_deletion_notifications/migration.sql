-- CreateEnum
CREATE TYPE "DeletionRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ClockOutStatus" AS ENUM ('EARLY', 'ON_TIME');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('NETWORK_IP_CHANGED', 'EMPLOYEE_DELETION_REQUESTED');

-- AlterTable
ALTER TABLE "attendance_records" ADD COLUMN     "clockOutStatus" "ClockOutStatus",
ADD COLUMN     "earlyClockOutReason" VARCHAR(400);

-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "employee_deletion_requests" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "reason" VARCHAR(500) NOT NULL,
    "status" "DeletionRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_deletion_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "targetRole" "AdminRole" NOT NULL,
    "officeId" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "employee_deletion_requests_employeeId_idx" ON "employee_deletion_requests"("employeeId");

-- CreateIndex
CREATE INDEX "employee_deletion_requests_status_idx" ON "employee_deletion_requests"("status");

-- CreateIndex
CREATE INDEX "notifications_targetRole_read_createdAt_idx" ON "notifications"("targetRole", "read", "createdAt");

-- CreateIndex
CREATE INDEX "notifications_type_officeId_createdAt_idx" ON "notifications"("type", "officeId", "createdAt");

-- CreateIndex
CREATE INDEX "employees_isDeleted_idx" ON "employees"("isDeleted");

-- AddForeignKey
ALTER TABLE "employee_deletion_requests" ADD CONSTRAINT "employee_deletion_requests_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_deletion_requests" ADD CONSTRAINT "employee_deletion_requests_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_deletion_requests" ADD CONSTRAINT "employee_deletion_requests_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "offices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
