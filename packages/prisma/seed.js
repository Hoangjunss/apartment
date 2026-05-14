import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

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

  // 6. Create Tenant & Contract (Optional for initial seed, but good for demo)
  const tenant = await prisma.tenants.create({
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
