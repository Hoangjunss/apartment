import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seed starting...');

  // 1. Clean up existing data (optional, but good for idempotent seed)
  // Be careful with delete order due to FKs
  await prisma.serviceRequests.deleteMany({});
  await prisma.payments.deleteMany({});
  await prisma.invoices.deleteMany({});
  await prisma.utilityReadings.deleteMany({});
  await prisma.serviceSubscriptions.deleteMany({});
  await prisma.contractRenewals.deleteMany({});
  await prisma.contracts.deleteMany({});
  await prisma.tenants.deleteMany({});
  await prisma.apartmentFurniture.deleteMany({});
  await prisma.apartmentStatusLogs.deleteMany({});
  await prisma.apartments.deleteMany({});
  await prisma.floors.deleteMany({});
  await prisma.buildings.deleteMany({});
  await prisma.services.deleteMany({});
  await prisma.users.deleteMany({});

  // 2. Create Users
  const saltRounds = 10;
  const passwordHash = await bcrypt.hash('password123', saltRounds);

  const admin = await prisma.users.create({
    data: {
      email: 'admin@qlchdc.com',
      password_hash: passwordHash,
      full_name: 'Nguyễn Văn Admin',
      role: 'ADMIN',
      phone: '0901234567',
    },
  });

  const manager = await prisma.users.create({
    data: {
      email: 'manager@qlchdc.com',
      password_hash: passwordHash,
      full_name: 'Trần Thị Manager',
      role: 'MANAGER',
      phone: '0907654321',
    },
  });

  const tech = await prisma.users.create({
    data: {
      email: 'tech@qlchdc.com',
      password_hash: passwordHash,
      full_name: 'Lê Văn Kỹ Thuật',
      role: 'TECHNICIAN',
      phone: '0911223344',
    },
  });

  // 3. Create Buildings & Floors
  const b1 = await prisma.buildings.create({
    data: {
      code: 'BLD-A',
      name: 'Tòa nhà A - Sunrise',
      address: '123 Đường ABC, Quận 1, TP.HCM',
      total_floors: 5,
    },
  });

  const floors = [];
  for (let i = 1; i <= 3; i++) {
    const f = await prisma.floors.create({
      data: {
        building_id: b1.id,
        floor_number: i,
        description: `Tầng ${i}`,
      },
    });
    floors.push(f);
  }

  // 4. Create Apartments
  const a1 = await prisma.apartments.create({
    data: {
      floor_id: floors[0].id,
      apartment_code: 'A0101',
      room_type: 'STUDIO',
      area_sqm: 35.5,
      max_occupants: 2,
      base_price: 7000000,
      deposit_amount: 14000000,
      status: 'AVAILABLE',
      description: 'Phòng Studio thoáng mát, view đẹp',
    },
  });

  const a2 = await prisma.apartments.create({
    data: {
      floor_id: floors[1].id,
      apartment_code: 'A0201',
      room_type: 'ONE_BR',
      area_sqm: 50.0,
      max_occupants: 3,
      base_price: 9000000,
      deposit_amount: 18000000,
      status: 'AVAILABLE',
      description: 'Phòng 1 phòng ngủ, nội thất cơ bản',
    },
  });

  // 5. Create Services
  await prisma.services.createMany({
    data: [
      { name: 'Dọn dẹp vệ sinh', type: 'CLEANING', unit_price: 100000, unit: 'lần' },
      { name: 'Giặt ủi', type: 'LAUNDRY', unit_price: 50000, unit: 'kg' },
      { name: 'Internet tốc độ cao', type: 'INTERNET', unit_price: 250000, unit: 'tháng' },
    ],
  });

  // 5. Fetch Services to link them in subscriptions
  const cleanService = await prisma.services.findFirst({ where: { type: 'CLEANING' } });
  const internetService = await prisma.services.findFirst({ where: { type: 'INTERNET' } });

  // 6. Create Tenant 1 & Active Contract in Apartment A0101
  const tenant1 = await prisma.tenants.create({
    data: {
      full_name: 'Trần Minh Thuê',
      national_id: '123456789',
      national_id_issued_date: new Date('2015-10-20'),
      national_id_issued_place: 'Công an TP.HCM',
      date_of_birth: new Date('1995-05-15'),
      gender: 'MALE',
      phone: '0988776655',
      email: 'minhthue@gmail.com',
      permanent_address: 'Quê quán Vĩnh Long',
    },
  });

  const contract1 = await prisma.contracts.create({
    data: {
      contract_code: 'HD-2026-0001',
      tenant_id: tenant1.id,
      apartment_id: a1.id,
      start_date: new Date('2026-01-01'),
      end_date: new Date('2027-01-01'),
      monthly_rent: 7000000,
      deposit_amount: 14000000,
      payment_due_day: 5,
      status: 'ACTIVE',
      created_by: admin.id,
    },
  });

  // Update apartment A0101 to occupied
  await prisma.apartments.update({
    where: { id: a1.id },
    data: { status: 'OCCUPIED' },
  });

  // Subscriptions for contract 1
  if (cleanService) {
    await prisma.serviceSubscriptions.create({
      data: {
        contract_id: contract1.id,
        service_id: cleanService.id,
        status: 'ACTIVE',
        quantity: 4,
        note: 'Dọn phòng 4 lần/tháng',
      },
    });
  }
  if (internetService) {
    await prisma.serviceSubscriptions.create({
      data: {
        contract_id: contract1.id,
        service_id: internetService.id,
        status: 'ACTIVE',
        quantity: 1,
      },
    });
  }

  // Utility Readings for A0101
  // April 2026
  await prisma.utilityReadings.create({
    data: {
      apartment_id: a1.id,
      billing_month: '2026-04',
      electricity_prev: 100,
      electricity_curr: 250,
      water_prev: 10,
      water_curr: 22,
      electricity_unit_price: 3500,
      water_unit_price: 15000,
      recorded_by: admin.id,
    },
  });
  // May 2026
  await prisma.utilityReadings.create({
    data: {
      apartment_id: a1.id,
      billing_month: '2026-05',
      electricity_prev: 250,
      electricity_curr: 420,
      water_prev: 22,
      water_curr: 36,
      electricity_unit_price: 3500,
      water_unit_price: 15000,
      recorded_by: admin.id,
    },
  });

  // Invoices & Payments for Contract 1
  // Invoice April 2026 (Paid)
  const invoiceApril = await prisma.invoices.create({
    data: {
      invoice_code: 'HD-HD20260001-202604',
      contract_id: contract1.id,
      apartment_id: a1.id,
      billing_month: '2026-04',
      rent_amount: 7000000,
      electricity_amount: (250 - 100) * 3500, // 525,000
      water_amount: (22 - 10) * 15000, // 180,000
      service_amount: (4 * 100000) + (1 * 250000), // 650,000
      other_amount: 0,
      total_amount: 7000000 + 525000 + 180000 + 650000, // 8,355,000
      status: 'PAID',
      due_date: new Date('2026-04-05'),
      created_by: admin.id,
    },
  });

  await prisma.payments.create({
    data: {
      invoice_id: invoiceApril.id,
      amount: 8355000,
      payment_method: 'BANK_TRANSFER',
      payment_date: new Date('2026-04-04'),
      reference_number: 'BANKTX20260404001',
      note: 'Thanh toán tiền phòng tháng 4',
      recorded_by: admin.id,
    },
  });

  // Invoice May 2026 (Partially Paid)
  const invoiceMay = await prisma.invoices.create({
    data: {
      invoice_code: 'HD-HD20260001-202605',
      contract_id: contract1.id,
      apartment_id: a1.id,
      billing_month: '2026-05',
      rent_amount: 7000000,
      electricity_amount: (420 - 250) * 3500, // 595,000
      water_amount: (36 - 22) * 15000, // 210,000
      service_amount: 650000,
      other_amount: 0,
      total_amount: 7000000 + 595000 + 210000 + 650000, // 8,455,000
      status: 'PARTIALLY_PAID',
      due_date: new Date('2026-05-05'),
      created_by: admin.id,
    },
  });

  await prisma.payments.create({
    data: {
      invoice_id: invoiceMay.id,
      amount: 5000000,
      payment_method: 'BANK_TRANSFER',
      payment_date: new Date('2026-05-05'),
      reference_number: 'BANKTX20260505002',
      note: 'Khách thanh toán trước 5 triệu',
      recorded_by: admin.id,
    },
  });


  // 7. Create Tenant 2 & Active Contract in Apartment A0201
  const tenant2 = await prisma.tenants.create({
    data: {
      full_name: 'Nguyễn Thị Thuê',
      national_id: '987654321',
      national_id_issued_date: new Date('2018-05-12'),
      national_id_issued_place: 'Công an Hà Nội',
      date_of_birth: new Date('1993-09-25'),
      gender: 'FEMALE',
      phone: '0912345678',
      email: 'nguyenthithue@gmail.com',
      permanent_address: 'Hoàn Kiếm, Hà Nội',
    },
  });

  const contract2 = await prisma.contracts.create({
    data: {
      contract_code: 'HD-2026-0002',
      tenant_id: tenant2.id,
      apartment_id: a2.id,
      start_date: new Date('2026-02-15'),
      end_date: new Date('2027-02-15'),
      monthly_rent: 9000000,
      deposit_amount: 18000000,
      payment_due_day: 10,
      status: 'ACTIVE',
      created_by: admin.id,
    },
  });

  // Update apartment A0201 to occupied
  await prisma.apartments.update({
    where: { id: a2.id },
    data: { status: 'OCCUPIED' },
  });

  // Subscriptions for contract 2
  if (internetService) {
    await prisma.serviceSubscriptions.create({
      data: {
        contract_id: contract2.id,
        service_id: internetService.id,
        status: 'ACTIVE',
        quantity: 1,
      },
    });
  }

  // Utility Readings for A0201 (April 2026 only, May is missing for testing batch generate)
  await prisma.utilityReadings.create({
    data: {
      apartment_id: a2.id,
      billing_month: '2026-04',
      electricity_prev: 150,
      electricity_curr: 320,
      water_prev: 15,
      water_curr: 25,
      electricity_unit_price: 3500,
      water_unit_price: 15000,
      recorded_by: admin.id,
    },
  });

  // Invoice for A0201 (April 2026 - Unpaid & Overdue)
  await prisma.invoices.create({
    data: {
      invoice_code: 'HD-HD20260002-202604',
      contract_id: contract2.id,
      apartment_id: a2.id,
      billing_month: '2026-04',
      rent_amount: 9000000,
      electricity_amount: (320 - 150) * 3500, // 595,000
      water_amount: (25 - 15) * 15000, // 150,000
      service_amount: 250000,
      other_amount: 100000, // surcharge
      total_amount: 9000000 + 595000 + 150000 + 250000 + 100000, // 10,095,000
      status: 'UNPAID',
      due_date: new Date('2026-04-10'),
      created_by: admin.id,
    },
  });

  console.log('Seed finished successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
