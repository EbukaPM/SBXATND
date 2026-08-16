-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'HR', 'VIEWER');

-- CreateEnum
CREATE TYPE "EmploymentStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'EXITED');

-- CreateEnum
CREATE TYPE "NetworkStatus" AS ENUM ('VERIFIED', 'STALE', 'UNVERIFIED', 'DISABLED');

-- CreateEnum
CREATE TYPE "ClockInStatus" AS ENUM ('EARLY', 'ON_TIME', 'LATE', 'MISSED_CLOCK_OUT', 'ABSENT', 'MANUALLY_ADJUSTED');

-- CreateEnum
CREATE TYPE "AttendanceType" AS ENUM ('REGULAR', 'WEEKEND_OVERTIME', 'HOLIDAY_OVERTIME');

-- CreateEnum
CREATE TYPE "VerificationMethod" AS ENUM ('NETWORK', 'QR_NETWORK', 'QR_ONLY', 'MANUAL_ADMIN');

-- CreateEnum
CREATE TYPE "QrStatus" AS ENUM ('SCHEDULED', 'ACTIVE', 'EXPIRED', 'DEACTIVATED');

-- CreateEnum
CREATE TYPE "QrSessionStatus" AS ENUM ('ACTIVE', 'USED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "AttendanceMode" AS ENUM ('NETWORK_ONLY', 'QR_AND_NETWORK', 'QR_ONLY');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'VIEWER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offices" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'Africa/Lagos',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "offices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employees" (
    "id" TEXT NOT NULL,
    "employeeNumber" TEXT NOT NULL,
    "attendanceIdLookup" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "middleName" TEXT,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "departmentId" TEXT,
    "jobTitle" TEXT,
    "employmentStatus" "EmploymentStatus" NOT NULL DEFAULT 'ACTIVE',
    "dateEmployed" TIMESTAMP(3),
    "profilePhotoUrl" TEXT,
    "officeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_id_history" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "oldIdHash" TEXT NOT NULL,
    "changedById" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_id_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "office_networks" (
    "id" TEXT NOT NULL,
    "officeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "currentPublicIp" TEXT,
    "cidr" TEXT,
    "status" "NetworkStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "agentId" TEXT,
    "registrationTokenHash" TEXT,
    "registrationTokenUsedAt" TIMESTAMP(3),
    "agentSigningSecret" TEXT,
    "lastVerifiedAt" TIMESTAMP(3),
    "failMode" TEXT NOT NULL DEFAULT 'FAIL_CLOSED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "office_networks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "network_heartbeats" (
    "id" TEXT NOT NULL,
    "officeNetworkId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "sourceIp" TEXT NOT NULL,
    "reportedIp" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "network_heartbeats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "holidays" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "holidays_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_records" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "officeId" TEXT NOT NULL,
    "attendanceDate" DATE NOT NULL,
    "clockIn" TIMESTAMP(3),
    "clockOut" TIMESTAMP(3),
    "clockInStatus" "ClockInStatus",
    "attendanceType" "AttendanceType" NOT NULL DEFAULT 'REGULAR',
    "minutesLate" INTEGER NOT NULL DEFAULT 0,
    "totalMinutesWorked" INTEGER,
    "clockInIp" TEXT,
    "clockOutIp" TEXT,
    "clockInUserAgent" TEXT,
    "clockOutUserAgent" TEXT,
    "clockInNetworkId" TEXT,
    "clockOutNetworkId" TEXT,
    "clockInQrId" TEXT,
    "clockOutQrId" TEXT,
    "verificationMethod" "VerificationMethod",
    "manualAdjustment" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_corrections" (
    "id" TEXT NOT NULL,
    "attendanceRecordId" TEXT NOT NULL,
    "changedById" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "field" TEXT NOT NULL,
    "originalValue" TEXT,
    "newValue" TEXT,
    "reason" TEXT NOT NULL,
    "ipAddress" TEXT,

    CONSTRAINT "attendance_corrections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_qr_codes" (
    "id" TEXT NOT NULL,
    "officeId" TEXT NOT NULL,
    "attendanceDate" DATE NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "tokenIdentifier" TEXT NOT NULL,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "status" "QrStatus" NOT NULL DEFAULT 'SCHEDULED',
    "pdfUrl" TEXT,
    "pngUrl" TEXT,
    "generatedById" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deactivatedById" TEXT,
    "deactivatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_qr_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qr_attendance_sessions" (
    "id" TEXT NOT NULL,
    "qrCodeId" TEXT NOT NULL,
    "officeId" TEXT NOT NULL,
    "sessionTokenHash" TEXT NOT NULL,
    "sourceIp" TEXT NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "status" "QrSessionStatus" NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "qr_attendance_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_settings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "companyName" TEXT NOT NULL DEFAULT 'Company',
    "logoUrl" TEXT,
    "primaryColor" TEXT NOT NULL DEFAULT '#0F766E',
    "secondaryColor" TEXT NOT NULL DEFAULT '#0EA5E9',
    "accentColor" TEXT NOT NULL DEFAULT '#F59E0B',
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_settings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "timezone" TEXT NOT NULL DEFAULT 'Africa/Lagos',
    "workStart" TEXT NOT NULL DEFAULT '09:00',
    "gracePeriodMinutes" INTEGER NOT NULL DEFAULT 15,
    "workEnd" TEXT NOT NULL DEFAULT '17:00',
    "attendanceMode" "AttendanceMode" NOT NULL DEFAULT 'QR_AND_NETWORK',
    "weekendIsOvertime" BOOLEAN NOT NULL DEFAULT true,
    "holidayIsOvertime" BOOLEAN NOT NULL DEFAULT true,
    "qrSessionMinutes" INTEGER NOT NULL DEFAULT 10,
    "networkHeartbeatIntervalMinutes" INTEGER NOT NULL DEFAULT 10,
    "networkStaleThresholdMinutes" INTEGER NOT NULL DEFAULT 30,
    "kioskResetSeconds" INTEGER NOT NULL DEFAULT 5,
    "crossOfficeAttendance" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resourceId" TEXT,
    "oldValue" TEXT,
    "newValue" TEXT,
    "reason" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rate_limit_buckets" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "lockedUntil" TIMESTAMP(3),

    CONSTRAINT "rate_limit_buckets_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_tokenHash_key" ON "sessions"("tokenHash");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "departments_name_key" ON "departments"("name");

-- CreateIndex
CREATE UNIQUE INDEX "employees_employeeNumber_key" ON "employees"("employeeNumber");

-- CreateIndex
CREATE UNIQUE INDEX "employees_attendanceIdLookup_key" ON "employees"("attendanceIdLookup");

-- CreateIndex
CREATE UNIQUE INDEX "employees_email_key" ON "employees"("email");

-- CreateIndex
CREATE INDEX "employees_officeId_idx" ON "employees"("officeId");

-- CreateIndex
CREATE INDEX "employees_departmentId_idx" ON "employees"("departmentId");

-- CreateIndex
CREATE INDEX "employees_employmentStatus_idx" ON "employees"("employmentStatus");

-- CreateIndex
CREATE INDEX "attendance_id_history_employeeId_idx" ON "attendance_id_history"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "office_networks_agentId_key" ON "office_networks"("agentId");

-- CreateIndex
CREATE INDEX "office_networks_officeId_idx" ON "office_networks"("officeId");

-- CreateIndex
CREATE INDEX "network_heartbeats_officeNetworkId_createdAt_idx" ON "network_heartbeats"("officeNetworkId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "holidays_date_key" ON "holidays"("date");

-- CreateIndex
CREATE INDEX "attendance_records_officeId_attendanceDate_idx" ON "attendance_records"("officeId", "attendanceDate");

-- CreateIndex
CREATE INDEX "attendance_records_attendanceDate_idx" ON "attendance_records"("attendanceDate");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_records_employeeId_attendanceDate_key" ON "attendance_records"("employeeId", "attendanceDate");

-- CreateIndex
CREATE INDEX "attendance_corrections_attendanceRecordId_idx" ON "attendance_corrections"("attendanceRecordId");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_qr_codes_tokenHash_key" ON "attendance_qr_codes"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_qr_codes_tokenIdentifier_key" ON "attendance_qr_codes"("tokenIdentifier");

-- CreateIndex
CREATE INDEX "attendance_qr_codes_officeId_attendanceDate_idx" ON "attendance_qr_codes"("officeId", "attendanceDate");

-- CreateIndex
CREATE INDEX "attendance_qr_codes_officeId_attendanceDate_status_idx" ON "attendance_qr_codes"("officeId", "attendanceDate", "status");

-- CreateIndex
CREATE UNIQUE INDEX "qr_attendance_sessions_sessionTokenHash_key" ON "qr_attendance_sessions"("sessionTokenHash");

-- CreateIndex
CREATE INDEX "qr_attendance_sessions_qrCodeId_idx" ON "qr_attendance_sessions"("qrCodeId");

-- CreateIndex
CREATE INDEX "qr_attendance_sessions_expiresAt_idx" ON "qr_attendance_sessions"("expiresAt");

-- CreateIndex
CREATE INDEX "audit_logs_resource_resourceId_idx" ON "audit_logs"("resource", "resourceId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "offices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_id_history" ADD CONSTRAINT "attendance_id_history_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "office_networks" ADD CONSTRAINT "office_networks_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "offices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "network_heartbeats" ADD CONSTRAINT "network_heartbeats_officeNetworkId_fkey" FOREIGN KEY ("officeNetworkId") REFERENCES "office_networks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "offices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_corrections" ADD CONSTRAINT "attendance_corrections_attendanceRecordId_fkey" FOREIGN KEY ("attendanceRecordId") REFERENCES "attendance_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_corrections" ADD CONSTRAINT "attendance_corrections_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_qr_codes" ADD CONSTRAINT "attendance_qr_codes_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "offices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_qr_codes" ADD CONSTRAINT "attendance_qr_codes_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_qr_codes" ADD CONSTRAINT "attendance_qr_codes_deactivatedById_fkey" FOREIGN KEY ("deactivatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qr_attendance_sessions" ADD CONSTRAINT "qr_attendance_sessions_qrCodeId_fkey" FOREIGN KEY ("qrCodeId") REFERENCES "attendance_qr_codes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qr_attendance_sessions" ADD CONSTRAINT "qr_attendance_sessions_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "offices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
