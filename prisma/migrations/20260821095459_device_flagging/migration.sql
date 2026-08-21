-- AlterTable
ALTER TABLE "attendance_records" ADD COLUMN     "clockInDeviceId" TEXT,
ADD COLUMN     "clockOutDeviceId" TEXT;

-- CreateTable
CREATE TABLE "attendance_device_flags" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "attendanceRecordId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "previousEmployeeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed" BOOLEAN NOT NULL DEFAULT false,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,

    CONSTRAINT "attendance_device_flags_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "attendance_device_flags_deviceId_idx" ON "attendance_device_flags"("deviceId");

-- CreateIndex
CREATE INDEX "attendance_device_flags_reviewed_createdAt_idx" ON "attendance_device_flags"("reviewed", "createdAt");

-- CreateIndex
CREATE INDEX "attendance_records_clockInDeviceId_idx" ON "attendance_records"("clockInDeviceId");

-- AddForeignKey
ALTER TABLE "attendance_device_flags" ADD CONSTRAINT "attendance_device_flags_attendanceRecordId_fkey" FOREIGN KEY ("attendanceRecordId") REFERENCES "attendance_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_device_flags" ADD CONSTRAINT "attendance_device_flags_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_device_flags" ADD CONSTRAINT "attendance_device_flags_previousEmployeeId_fkey" FOREIGN KEY ("previousEmployeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_device_flags" ADD CONSTRAINT "attendance_device_flags_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
