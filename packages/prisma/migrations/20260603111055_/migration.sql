/*
  Warnings:

  - You are about to drop the column `requested_by` on the `servicerequests` table. All the data in the column will be lost.
  - You are about to alter the column `status` on the `servicerequests` table. The data in that column could be lost. The data in that column will be cast from `VarChar(50)` to `Enum(EnumId(15))`.
  - Added the required column `apartment_id` to the `ServiceRequests` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `ServiceRequests` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `servicerequests` DROP FOREIGN KEY `ServiceRequests_requested_by_fkey`;

-- AlterTable
ALTER TABLE `apartments` ADD COLUMN `deleted_at` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `buildings` ADD COLUMN `deleted_at` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `contracts` ADD COLUMN `deleted_at` DATETIME(3) NULL,
    ADD COLUMN `electricity_price` DECIMAL(10, 2) NOT NULL DEFAULT 3500,
    ADD COLUMN `furniture_handover` TEXT NULL,
    ADD COLUMN `initial_electricity` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    ADD COLUMN `initial_water` DECIMAL(10, 2) NULL,
    ADD COLUMN `occupants_count` INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN `soNguoiO` INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN `termination_notice_days` INTEGER NOT NULL DEFAULT 30,
    ADD COLUMN `water_price_per_month` DECIMAL(15, 2) NOT NULL DEFAULT 100000;

-- AlterTable
ALTER TABLE `invoices` ADD COLUMN `deleted_at` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `servicerequests` DROP COLUMN `requested_by`,
    ADD COLUMN `apartment_id` INTEGER NOT NULL,
    ADD COLUMN `contract_id` INTEGER NULL,
    ADD COLUMN `priority` ENUM('LOW', 'NORMAL', 'HIGH', 'URGENT') NOT NULL DEFAULT 'NORMAL',
    ADD COLUMN `requester_name` VARCHAR(100) NULL,
    ADD COLUMN `requester_phone` VARCHAR(20) NULL,
    ADD COLUMN `resolved_at` DATETIME(3) NULL,
    ADD COLUMN `source` ENUM('INTERNAL', 'PUBLIC_FORM') NOT NULL DEFAULT 'INTERNAL',
    ADD COLUMN `title` VARCHAR(200) NOT NULL,
    ADD COLUMN `type` ENUM('MAINTENANCE', 'CLEANING', 'COMPLAINT', 'OTHER') NOT NULL DEFAULT 'MAINTENANCE',
    MODIFY `status` ENUM('PENDING', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CANCELLED') NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE `tenants` ADD COLUMN `deleted_at` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `utilityreadings` ADD COLUMN `soNguoiO` INTEGER NOT NULL DEFAULT 1,
    MODIFY `water_prev` DECIMAL(10, 2) NULL,
    MODIFY `water_curr` DECIMAL(10, 2) NULL,
    MODIFY `water_unit_price` DECIMAL(10, 2) NULL;

-- CreateTable
CREATE TABLE `ApartmentTokens` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `apartment_id` INTEGER NOT NULL,
    `token` VARCHAR(16) NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ApartmentTokens_apartment_id_key`(`apartment_id`),
    UNIQUE INDEX `ApartmentTokens_token_key`(`token`),
    INDEX `ApartmentTokens_apartment_id_idx`(`apartment_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuditLogs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `actor_id` INTEGER NOT NULL,
    `actor_name` VARCHAR(100) NOT NULL,
    `action` VARCHAR(50) NOT NULL,
    `resource_type` VARCHAR(50) NOT NULL,
    `resource_id` INTEGER NULL,
    `old_data` JSON NULL,
    `new_data` JSON NULL,
    `ip_address` VARCHAR(45) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AuditLogs_actor_id_idx`(`actor_id`),
    INDEX `AuditLogs_resource_type_resource_id_idx`(`resource_type`, `resource_id`),
    INDEX `AuditLogs_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Notifications` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `message` TEXT NOT NULL,
    `type` VARCHAR(50) NOT NULL,
    `entity_type` VARCHAR(50) NULL,
    `entity_id` INTEGER NULL,
    `is_read` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Notifications_user_id_is_read_idx`(`user_id`, `is_read`),
    INDEX `Notifications_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `ServiceRequests_apartment_id_idx` ON `ServiceRequests`(`apartment_id`);

-- CreateIndex
CREATE INDEX `ServiceRequests_contract_id_idx` ON `ServiceRequests`(`contract_id`);

-- CreateIndex
CREATE INDEX `ServiceRequests_status_idx` ON `ServiceRequests`(`status`);

-- AddForeignKey
ALTER TABLE `ServiceRequests` ADD CONSTRAINT `ServiceRequests_apartment_id_fkey` FOREIGN KEY (`apartment_id`) REFERENCES `Apartments`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ServiceRequests` ADD CONSTRAINT `ServiceRequests_contract_id_fkey` FOREIGN KEY (`contract_id`) REFERENCES `Contracts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ApartmentTokens` ADD CONSTRAINT `ApartmentTokens_apartment_id_fkey` FOREIGN KEY (`apartment_id`) REFERENCES `Apartments`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
