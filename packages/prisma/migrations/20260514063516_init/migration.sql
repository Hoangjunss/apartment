-- CreateTable
CREATE TABLE `Users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(255) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `full_name` VARCHAR(100) NOT NULL,
    `phone` VARCHAR(20) NULL,
    `role` ENUM('ADMIN', 'MANAGER', 'TECHNICIAN', 'RECEPTIONIST') NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `last_login_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Buildings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(20) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `address` TEXT NOT NULL,
    `total_floors` INTEGER NOT NULL,
    `description` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Buildings_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Floors` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `building_id` INTEGER NOT NULL,
    `floor_number` INTEGER NOT NULL,
    `description` VARCHAR(255) NULL,

    INDEX `Floors_building_id_idx`(`building_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Apartments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `floor_id` INTEGER NOT NULL,
    `apartment_code` VARCHAR(20) NOT NULL,
    `room_type` ENUM('STUDIO', 'ONE_BR', 'TWO_BR', 'THREE_BR') NOT NULL,
    `area_sqm` DECIMAL(6, 2) NOT NULL,
    `max_occupants` INTEGER NOT NULL,
    `base_price` DECIMAL(15, 2) NOT NULL,
    `deposit_amount` DECIMAL(15, 2) NOT NULL,
    `status` ENUM('AVAILABLE', 'OCCUPIED', 'MAINTENANCE', 'RESERVED') NOT NULL DEFAULT 'AVAILABLE',
    `description` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Apartments_apartment_code_key`(`apartment_code`),
    INDEX `Apartments_floor_id_idx`(`floor_id`),
    INDEX `Apartments_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ApartmentFurniture` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `apartment_id` INTEGER NOT NULL,
    `item_name` VARCHAR(100) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `condition` ENUM('NEW', 'GOOD', 'WORN') NOT NULL,
    `note` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ApartmentFurniture_apartment_id_idx`(`apartment_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ApartmentStatusLogs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `apartment_id` INTEGER NOT NULL,
    `old_status` ENUM('AVAILABLE', 'OCCUPIED', 'MAINTENANCE', 'RESERVED') NOT NULL,
    `new_status` ENUM('AVAILABLE', 'OCCUPIED', 'MAINTENANCE', 'RESERVED') NOT NULL,
    `changed_by` INTEGER NOT NULL,
    `reason` TEXT NULL,
    `changed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ApartmentStatusLogs_apartment_id_idx`(`apartment_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Tenants` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `full_name` VARCHAR(100) NOT NULL,
    `national_id` VARCHAR(20) NOT NULL,
    `national_id_issued_date` DATE NOT NULL,
    `national_id_issued_place` VARCHAR(255) NOT NULL,
    `date_of_birth` DATE NOT NULL,
    `gender` ENUM('MALE', 'FEMALE', 'OTHER') NOT NULL,
    `phone` VARCHAR(20) NOT NULL,
    `email` VARCHAR(255) NULL,
    `permanent_address` TEXT NOT NULL,
    `nationality` VARCHAR(100) NOT NULL DEFAULT 'Việt Nam',
    `occupation` VARCHAR(100) NULL,
    `avatar_url` VARCHAR(512) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Tenants_national_id_key`(`national_id`),
    INDEX `Tenants_national_id_idx`(`national_id`),
    INDEX `Tenants_phone_idx`(`phone`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Contracts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `contract_code` VARCHAR(30) NOT NULL,
    `tenant_id` INTEGER NOT NULL,
    `apartment_id` INTEGER NOT NULL,
    `start_date` DATE NOT NULL,
    `end_date` DATE NOT NULL,
    `monthly_rent` DECIMAL(15, 2) NOT NULL,
    `deposit_amount` DECIMAL(15, 2) NOT NULL,
    `payment_due_day` INTEGER NOT NULL,
    `status` ENUM('ACTIVE', 'EXPIRING_SOON', 'EXPIRED', 'TERMINATED') NOT NULL DEFAULT 'ACTIVE',
    `termination_reason` TEXT NULL,
    `notes` TEXT NULL,
    `created_by` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Contracts_contract_code_key`(`contract_code`),
    INDEX `Contracts_tenant_id_idx`(`tenant_id`),
    INDEX `Contracts_apartment_id_idx`(`apartment_id`),
    INDEX `Contracts_status_idx`(`status`),
    INDEX `Contracts_end_date_idx`(`end_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ContractRenewals` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `contract_id` INTEGER NOT NULL,
    `old_end_date` DATE NOT NULL,
    `new_end_date` DATE NOT NULL,
    `new_monthly_rent` DECIMAL(15, 2) NOT NULL,
    `notes` TEXT NULL,
    `renewed_by` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ContractRenewals_contract_id_idx`(`contract_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TemporaryRegistrations` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tenant_id` INTEGER NOT NULL,
    `apartment_id` INTEGER NOT NULL,
    `type` ENUM('TEMPORARY_RESIDENCE', 'TEMPORARY_ABSENCE') NOT NULL,
    `start_date` DATE NOT NULL,
    `end_date` DATE NOT NULL,
    `destination` VARCHAR(255) NULL,
    `reason` TEXT NULL,
    `submitted_by` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `TemporaryRegistrations_tenant_id_idx`(`tenant_id`),
    INDEX `TemporaryRegistrations_apartment_id_idx`(`apartment_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Services` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `type` ENUM('CLEANING', 'LAUNDRY', 'INTERNET', 'CABLE_TV', 'OTHER') NOT NULL,
    `unit_price` DECIMAL(15, 2) NOT NULL,
    `unit` VARCHAR(30) NOT NULL,
    `description` TEXT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ServiceSubscriptions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `contract_id` INTEGER NOT NULL,
    `service_id` INTEGER NOT NULL,
    `status` ENUM('ACTIVE', 'CANCELLED') NOT NULL DEFAULT 'ACTIVE',
    `quantity` INTEGER NOT NULL DEFAULT 1,
    `note` TEXT NULL,
    `subscribed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ServiceSubscriptions_contract_id_idx`(`contract_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UtilityReadings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `apartment_id` INTEGER NOT NULL,
    `billing_month` VARCHAR(7) NOT NULL,
    `electricity_prev` DECIMAL(10, 2) NOT NULL,
    `electricity_curr` DECIMAL(10, 2) NOT NULL,
    `water_prev` DECIMAL(10, 2) NOT NULL,
    `water_curr` DECIMAL(10, 2) NOT NULL,
    `electricity_unit_price` DECIMAL(10, 2) NOT NULL,
    `water_unit_price` DECIMAL(10, 2) NOT NULL,
    `recorded_by` INTEGER NOT NULL,
    `recorded_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `UtilityReadings_apartment_id_idx`(`apartment_id`),
    UNIQUE INDEX `UtilityReadings_apartment_id_billing_month_key`(`apartment_id`, `billing_month`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Invoices` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `invoice_code` VARCHAR(30) NOT NULL,
    `contract_id` INTEGER NOT NULL,
    `apartment_id` INTEGER NOT NULL,
    `billing_month` VARCHAR(7) NOT NULL,
    `rent_amount` DECIMAL(15, 2) NOT NULL,
    `electricity_amount` DECIMAL(15, 2) NOT NULL,
    `water_amount` DECIMAL(15, 2) NOT NULL,
    `service_amount` DECIMAL(15, 2) NOT NULL,
    `other_amount` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `total_amount` DECIMAL(15, 2) NOT NULL,
    `status` ENUM('UNPAID', 'PARTIALLY_PAID', 'PAID', 'OVERDUE') NOT NULL DEFAULT 'UNPAID',
    `due_date` DATE NOT NULL,
    `created_by` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Invoices_invoice_code_key`(`invoice_code`),
    INDEX `Invoices_status_idx`(`status`),
    INDEX `Invoices_due_date_idx`(`due_date`),
    UNIQUE INDEX `Invoices_contract_id_billing_month_key`(`contract_id`, `billing_month`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Payments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `invoice_id` INTEGER NOT NULL,
    `amount` DECIMAL(15, 2) NOT NULL,
    `payment_method` ENUM('CASH', 'BANK_TRANSFER') NOT NULL,
    `payment_date` DATE NOT NULL,
    `reference_number` VARCHAR(100) NULL,
    `note` TEXT NULL,
    `recorded_by` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Payments_invoice_id_idx`(`invoice_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ServiceRequests` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `requested_by` INTEGER NOT NULL,
    `assigned_to` INTEGER NULL,
    `description` TEXT NOT NULL,
    `status` VARCHAR(50) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `ServiceRequests_requested_by_idx`(`requested_by`),
    INDEX `ServiceRequests_assigned_to_idx`(`assigned_to`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Floors` ADD CONSTRAINT `Floors_building_id_fkey` FOREIGN KEY (`building_id`) REFERENCES `Buildings`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Apartments` ADD CONSTRAINT `Apartments_floor_id_fkey` FOREIGN KEY (`floor_id`) REFERENCES `Floors`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ApartmentFurniture` ADD CONSTRAINT `ApartmentFurniture_apartment_id_fkey` FOREIGN KEY (`apartment_id`) REFERENCES `Apartments`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ApartmentStatusLogs` ADD CONSTRAINT `ApartmentStatusLogs_apartment_id_fkey` FOREIGN KEY (`apartment_id`) REFERENCES `Apartments`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ApartmentStatusLogs` ADD CONSTRAINT `ApartmentStatusLogs_changed_by_fkey` FOREIGN KEY (`changed_by`) REFERENCES `Users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Contracts` ADD CONSTRAINT `Contracts_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `Tenants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Contracts` ADD CONSTRAINT `Contracts_apartment_id_fkey` FOREIGN KEY (`apartment_id`) REFERENCES `Apartments`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Contracts` ADD CONSTRAINT `Contracts_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `Users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ContractRenewals` ADD CONSTRAINT `ContractRenewals_contract_id_fkey` FOREIGN KEY (`contract_id`) REFERENCES `Contracts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ContractRenewals` ADD CONSTRAINT `ContractRenewals_renewed_by_fkey` FOREIGN KEY (`renewed_by`) REFERENCES `Users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TemporaryRegistrations` ADD CONSTRAINT `TemporaryRegistrations_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `Tenants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TemporaryRegistrations` ADD CONSTRAINT `TemporaryRegistrations_apartment_id_fkey` FOREIGN KEY (`apartment_id`) REFERENCES `Apartments`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TemporaryRegistrations` ADD CONSTRAINT `TemporaryRegistrations_submitted_by_fkey` FOREIGN KEY (`submitted_by`) REFERENCES `Users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ServiceSubscriptions` ADD CONSTRAINT `ServiceSubscriptions_contract_id_fkey` FOREIGN KEY (`contract_id`) REFERENCES `Contracts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ServiceSubscriptions` ADD CONSTRAINT `ServiceSubscriptions_service_id_fkey` FOREIGN KEY (`service_id`) REFERENCES `Services`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UtilityReadings` ADD CONSTRAINT `UtilityReadings_apartment_id_fkey` FOREIGN KEY (`apartment_id`) REFERENCES `Apartments`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UtilityReadings` ADD CONSTRAINT `UtilityReadings_recorded_by_fkey` FOREIGN KEY (`recorded_by`) REFERENCES `Users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Invoices` ADD CONSTRAINT `Invoices_contract_id_fkey` FOREIGN KEY (`contract_id`) REFERENCES `Contracts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Invoices` ADD CONSTRAINT `Invoices_apartment_id_fkey` FOREIGN KEY (`apartment_id`) REFERENCES `Apartments`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Invoices` ADD CONSTRAINT `Invoices_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `Users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payments` ADD CONSTRAINT `Payments_invoice_id_fkey` FOREIGN KEY (`invoice_id`) REFERENCES `Invoices`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payments` ADD CONSTRAINT `Payments_recorded_by_fkey` FOREIGN KEY (`recorded_by`) REFERENCES `Users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ServiceRequests` ADD CONSTRAINT `ServiceRequests_requested_by_fkey` FOREIGN KEY (`requested_by`) REFERENCES `Users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ServiceRequests` ADD CONSTRAINT `ServiceRequests_assigned_to_fkey` FOREIGN KEY (`assigned_to`) REFERENCES `Users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
