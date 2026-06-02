import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Helper to generate realistic Vietnamese names
const lastNames = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Phan', 'Vũ', 'Đặng', 'Bùi', 'Đỗ', 'Hồ', 'Ngô'];
const middleNames = ['Minh', 'Thị', 'Văn', 'Đức', 'Hữu', 'Anh', 'Ngọc', 'Quang', 'Xuân', 'Hoài', 'Thanh', 'Tuấn'];
const firstNames = ['Nam', 'Trang', 'Hải', 'Hương', 'Hùng', 'Lan', 'Phượng', 'Dũng', 'Tuấn', 'Linh', 'Khánh', 'Vy', 'Tùng', 'Hoa', 'Sơn', 'Tuyết', 'Bình', 'Hà'];

function generateName(idx) {
  const ln = lastNames[idx % lastNames.length];
  const mn = middleNames[(idx * 7) % middleNames.length];
  const fn = firstNames[(idx * 13) % firstNames.length];
  return `${ln} ${mn} ${fn}`;
}

async function main() {
  console.log('Seed starting with MASSIVE dataset (5x expansion)...');

  // 1. Clean up existing data in correct FK order
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
  await prisma.apartmentTokens.deleteMany({});
  await prisma.apartments.deleteMany({});
  await prisma.floors.deleteMany({});
  await prisma.buildings.deleteMany({});
  await prisma.services.deleteMany({});
  await prisma.users.deleteMany({});

  // 2. Create standard system Users
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

  const receptionist = await prisma.users.create({
    data: {
      email: 'reception@qlchdc.com',
      password_hash: passwordHash,
      full_name: 'Phạm Thị Lễ Tân',
      role: 'RECEPTIONIST',
      phone: '0922334455',
    },
  });

  // 3. Create Services
  await prisma.services.createMany({
    data: [
      { name: 'Dọn dẹp vệ sinh', type: 'CLEANING', unit_price: 100000, unit: 'lần' },
      { name: 'Giặt ủi đồ', type: 'LAUNDRY', unit_price: 50000, unit: 'kg' },
      { name: 'Internet cáp quang', type: 'INTERNET', unit_price: 250000, unit: 'tháng' },
      { name: 'Truyền hình cáp HD', type: 'CABLE_TV', unit_price: 120000, unit: 'tháng' },
    ],
  });

  const cleanService = await prisma.services.findFirst({ where: { type: 'CLEANING' } });
  const internetService = await prisma.services.findFirst({ where: { type: 'INTERNET' } });
  const tvService = await prisma.services.findFirst({ where: { type: 'CABLE_TV' } });

  // 4. Create 2 Buildings & Floors
  const b1 = await prisma.buildings.create({
    data: {
      code: 'BLD-A',
      name: 'Tòa Sunrise Block A',
      address: '123 Đường Sunrise, Phường Bến Nghé, Quận 1, TP.HCM',
      total_floors: 4,
    },
  });

  const b2 = await prisma.buildings.create({
    data: {
      code: 'BLD-B',
      name: 'Tòa Sunset Block B',
      address: '456 Đường Sunset, Phường Thảo Điền, Quận 2, TP.HCM',
      total_floors: 4,
    },
  });

  const floorsA = [];
  const floorsB = [];
  for (let i = 1; i <= 4; i++) {
    const fA = await prisma.floors.create({
      data: { building_id: b1.id, floor_number: i, description: `Tầng ${i}` },
    });
    const fB = await prisma.floors.create({
      data: { building_id: b2.id, floor_number: i, description: `Tầng ${i}` },
    });
    floorsA.push(fA);
    floorsB.push(fB);
  }

  // 5. Create 24 Apartments total across buildings (3 per floor, 4 floors each = 12 A + 12 B = 24)
  const roomTypes = ['STUDIO', 'ONE_BR', 'TWO_BR', 'THREE_BR'];
  const basePrices = {
    STUDIO: 6500000,
    ONE_BR: 8500000,
    TWO_BR: 12000000,
    THREE_BR: 16000000
  };
  const areaSqm = {
    STUDIO: 35.0,
    ONE_BR: 48.0,
    TWO_BR: 72.5,
    THREE_BR: 98.0
  };
  const maxOccs = {
    STUDIO: 2,
    ONE_BR: 3,
    TWO_BR: 4,
    THREE_BR: 6
  };

  const apartments = [];

  // Generate for Sunrise Block A
  for (let f = 0; f < 4; f++) {
    const floor = floorsA[f];
    for (let r = 1; r <= 3; r++) {
      const type = roomTypes[(f + r) % 3]; // STUDIO, ONE_BR, TWO_BR
      const code = `A0${f + 1}0${r}`;
      const apt = await prisma.apartments.create({
        data: {
          floor_id: floor.id,
          apartment_code: code,
          room_type: type,
          area_sqm: areaSqm[type],
          max_occupants: maxOccs[type],
          base_price: basePrices[type],
          deposit_amount: basePrices[type], // deposit <= base price
          status: 'AVAILABLE',
          description: `Phòng ${type} tại tầng ${f + 1} Block Sunrise, nội thất đầy đủ sang trọng.`,
        }
      });
      apartments.push(apt);
    }
  }

  // Generate for Sunset Block B
  for (let f = 0; f < 4; f++) {
    const floor = floorsB[f];
    for (let r = 1; r <= 3; r++) {
      const type = roomTypes[(f + r + 1) % 3];
      const code = `B0${f + 1}0${r}`;
      const apt = await prisma.apartments.create({
        data: {
          floor_id: floor.id,
          apartment_code: code,
          room_type: type,
          area_sqm: areaSqm[type],
          max_occupants: maxOccs[type],
          base_price: basePrices[type],
          deposit_amount: basePrices[type], // deposit <= base price
          status: 'AVAILABLE',
          description: `Căn hộ ${type} view sông tuyệt đẹp tại Sunset Block B, Tầng ${f + 1}.`,
        }
      });
      apartments.push(apt);
    }
  }

  console.log(`Created ${apartments.length} apartments successfully.`);

  // 6. Generate 16 Tenants
  const tenants = [];
  for (let i = 0; i < 16; i++) {
    const isMale = i % 2 === 0;
    const tenant = await prisma.tenants.create({
      data: {
        full_name: generateName(i),
        national_id: `31204895${10 + i}`,
        national_id_issued_date: new Date('2018-06-15'),
        national_id_issued_place: 'Cục Cảnh sát ĐKQL cư trú và DLQG về dân cư',
        date_of_birth: new Date(1988 + (i * 2), (i * 3) % 12, (i * 5) % 28 + 1),
        gender: isMale ? 'MALE' : 'FEMALE',
        phone: `09${30000000 + i * 45917}`,
        email: `tenant${i + 1}@gmail.com`,
        permanent_address: `${i * 12 + 10} Đường Điện Biên Phủ, Quận Bình Thạnh, TP.HCM`,
      }
    });
    tenants.push(tenant);
  }
  console.log(`Created ${tenants.length} tenants successfully.`);

  // 7. Create 16 Contracts for the apartments (making them Occupied)
  // We will distribute start dates:
  // - 6 contracts start Jan 1st, 2026
  // - 5 contracts start Feb 1st, 2026
  // - 5 contracts start Mar 1st, 2026
  // 3 contracts will end in June 2026 so they are classified as 'EXPIRING_SOON' (current time is June 1st, 2026)
  const contracts = [];
  const startDates = [
    new Date('2026-01-01'),
    new Date('2026-02-01'),
    new Date('2026-03-01')
  ];

  for (let i = 0; i < 16; i++) {
    const apt = apartments[i];
    const tenant = tenants[i];
    const startDate = startDates[i % startDates.length];
    
    // Default 1-year contract length
    let endDate = new Date(startDate.getFullYear() + 1, startDate.getMonth(), startDate.getDate());
    
    // Make 3 contracts expire in June 2026
    if (i === 0) endDate = new Date('2026-06-15');
    if (i === 4) endDate = new Date('2026-06-22');
    if (i === 8) endDate = new Date('2026-06-29');

    const monthlyRent = Number(apt.base_price);
    const occupants = (i % 3) + 1; // 1 to 3 occupants

    const contract = await prisma.contracts.create({
      data: {
        contract_code: `HD-2026-${String(i + 1).padStart(4, '0')}`,
        tenant_id: tenant.id,
        apartment_id: apt.id,
        start_date: startDate,
        end_date: endDate,
        monthly_rent: monthlyRent,
        deposit_amount: monthlyRent, // deposit <= rent
        payment_due_day: 5,
        status: 'ACTIVE',
        created_by: manager.id,
        occupants_count: occupants,
        soNguoiO: occupants,
        water_price_per_month: occupants * 100000,
        initial_electricity: 100 * (i + 1),
        electricity_price: 3500,
        furniture_handover: 'Nội thất bàn giao: Giường gỗ sồi, Tủ quần áo, Điều hòa Daikin 1.5HP, Nóng lạnh Ariston.',
        termination_notice_days: 30,
      }
    });

    // Update apartment to occupied
    await prisma.apartments.update({
      where: { id: apt.id },
      data: { status: 'OCCUPIED' }
    });

    // Add Furniture logs for this apartment
    await prisma.apartmentFurniture.createMany({
      data: [
        { apartment_id: apt.id, item_name: 'Giường gỗ sồi', quantity: 1, condition: 'NEW' },
        { apartment_id: apt.id, item_name: 'Tủ quần áo 3 cánh', quantity: 1, condition: 'GOOD' },
        { apartment_id: apt.id, item_name: 'Điều hòa Daikin', quantity: 1, condition: 'NEW' },
        { apartment_id: apt.id, item_name: 'Bình nóng lạnh', quantity: 1, condition: 'GOOD' }
      ]
    });

    // Add subscriptions
    if (internetService) {
      await prisma.serviceSubscriptions.create({
        data: { contract_id: contract.id, service_id: internetService.id, status: 'ACTIVE', quantity: 1 }
      });
    }
    if (i % 2 === 0 && cleanService) {
      await prisma.serviceSubscriptions.create({
        data: { contract_id: contract.id, service_id: cleanService.id, status: 'ACTIVE', quantity: 4, note: 'Dọn phòng 4 lần/tháng' }
      });
    }
    if (i % 3 === 0 && tvService) {
      await prisma.serviceSubscriptions.create({
        data: { contract_id: contract.id, service_id: tvService.id, status: 'ACTIVE', quantity: 1 }
      });
    }

    contracts.push(contract);
  }

  // Set 1 remaining apartment in SUNRISE as MAINTENANCE, 1 in SUNSET as RESERVED
  await prisma.apartments.update({
    where: { id: apartments[16].id },
    data: { status: 'MAINTENANCE' }
  });
  await prisma.apartments.update({
    where: { id: apartments[17].id },
    data: { status: 'RESERVED' }
  });

  console.log(` Rented out 16 apartments. 1 Maintenance, 1 Reserved, 6 Available.`);

  // 8. Generate Utility Readings, Invoices, and Payments Month-by-Month
  // For each contract, generate records starting from the first billing month up to May 2026.
  // Months: Jan 2026 ('2026-01'), Feb 2026 ('2026-02'), Mar 2026 ('2026-03'), Apr 2026 ('2026-04'), May 2026 ('2026-05')
  console.log('Generating historical financials & chốt số records...');
  
  const allBillingMonths = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05'];
  let totalInvoicesCreated = 0;

  for (const contract of contracts) {
    const start = new Date(contract.start_date);
    const occupants = contract.soNguoiO;
    const apartmentId = contract.apartment_id;
    const monthlyRent = Number(contract.monthly_rent);

    // Initial values
    let prevElec = Number(contract.initial_electricity);

    // Filter months that are on or after the contract start date
    const billingMonths = allBillingMonths.filter(m => {
      const [yStr, mStr] = m.split('-');
      const mDate = new Date(Number(yStr), Number(mStr) - 1, 1);
      // Include month if contract starts on or before the first of this month
      return start <= new Date(Number(yStr), Number(mStr) - 1, 31);
    });

    for (let monthIndex = 0; monthIndex < billingMonths.length; monthIndex++) {
      const billingMonth = billingMonths[monthIndex];
      const [yearStr, monthStr] = billingMonth.split('-');
      const year = Number(yearStr);
      const month = Number(monthStr);

      // Generate random utility usage
      const elecCons = 120 + Math.floor(Math.random() * 150); // 120-270 kWh
      const currElec = prevElec + elecCons;

      // Flat water calculation (100.000đ per person per month)
      const waterAmount = occupants * 100000;

      // 8.1 Write Utility Reading record
      await prisma.utilityReadings.create({
        data: {
          apartment_id: apartmentId,
          billing_month: billingMonth,
          electricity_prev: prevElec,
          electricity_curr: currElec,
          water_prev: null, // Null per new Person-based Water system
          water_curr: null,
          electricity_unit_price: 3500,
          water_unit_price: 100000, // flat unit price
          soNguoiO: occupants,
          recorded_by: admin.id,
          recorded_at: new Date(year, month - 1, 28, 17, 30, 0)
        }
      });

      // Calculate service costs based on subscriptions
      let serviceAmount = 250000; // Internet default
      if (contract.contract_code.endsWith('1') || contract.contract_code.endsWith('3')) {
        serviceAmount += 400000; // Cleaning + internet
      }
      if (contract.contract_code.endsWith('0') || contract.contract_code.endsWith('6')) {
        serviceAmount += 120000; // Cable TV + internet
      }

      const electricityAmount = elecCons * 3500;
      const otherAmount = (monthIndex === 0) ? 0 : (Math.random() < 0.1 ? 50000 : 0); // occasional surcharge
      const totalAmount = monthlyRent + electricityAmount + waterAmount + serviceAmount + otherAmount;

      // Invoice status distribution
      // May 2026: More Unpaid/Partially Paid invoices for test data display
      // Other months: Mostly paid
      let status = 'PAID';
      const rand = Math.random();

      if (billingMonth === '2026-05') {
        if (rand < 0.35) status = 'UNPAID';
        else if (rand < 0.6) status = 'PARTIALLY_PAID';
      } else {
        if (rand < 0.08) status = 'UNPAID';
        else if (rand < 0.15) status = 'PARTIALLY_PAID';
      }

      // 8.2 Write Invoice
      const invoice = await prisma.invoices.create({
        data: {
          invoice_code: `INV-${contract.contract_code.replace('HD-', '')}-${billingMonth.replace('-', '')}`,
          contract_id: contract.id,
          apartment_id: apartmentId,
          billing_month: billingMonth,
          rent_amount: monthlyRent,
          electricity_amount: electricityAmount,
          water_amount: waterAmount,
          service_amount: serviceAmount,
          other_amount: otherAmount,
          total_amount: totalAmount,
          status: status,
          due_date: new Date(year, month - 1, 5),
          created_by: admin.id,
          created_at: new Date(year, month - 1, 1, 8, 0, 0)
        }
      });

      totalInvoicesCreated++;

      // 8.3 Write Payment Records if Paid or Partially Paid
      if (status === 'PAID') {
        await prisma.payments.create({
          data: {
            invoice_id: invoice.id,
            amount: totalAmount,
            payment_method: 'BANK_TRANSFER',
            payment_date: new Date(year, month - 1, 4),
            reference_number: `BANKTX${year}${String(month).padStart(2, '0')}04${String(contract.id).padStart(4, '0')}`,
            note: `Thanh toán toàn bộ hóa đơn tháng ${month}/${year}`,
            recorded_by: admin.id,
            created_at: new Date(year, month - 1, 4, 10, 15, 0)
          }
        });
      } else if (status === 'PARTIALLY_PAID') {
        const paidAmount = Math.round((totalAmount * 0.6) / 100000) * 100000; // Pay ~60%
        await prisma.payments.create({
          data: {
            invoice_id: invoice.id,
            amount: paidAmount,
            payment_method: 'BANK_TRANSFER',
            payment_date: new Date(year, month - 1, 5),
            reference_number: `BANKTX${year}${String(month).padStart(2, '0')}05${String(contract.id).padStart(4, '0')}`,
            note: `Thanh toán trước một phần tiền phòng kỳ tháng ${month}/${year}`,
            recorded_by: admin.id,
            created_at: new Date(year, month - 1, 5, 14, 30, 0)
          }
        });
      }

      // Advance electricity index for the next month
      prevElec = currElec;
    }
  }

  console.log(`Generated ${totalInvoicesCreated} invoices and associated transactions.`);

  // 9. ServiceRequests mẫu
  const serviceReqData = [
    {
      title: 'Điều hòa phòng A101 không mát',
      description: 'Máy lạnh chạy nhưng không giảm nhiệt độ, cần kiểm tra gas và bộ lọc',
      apartment_id: apartments[0].id,
      requester_name: 'Phạm Thị Lễ Tân',
      requester_phone: '0922334455',
      assigned_to: tech.id,
      status: 'IN_PROGRESS',
      source: 'INTERNAL',
      type: 'MAINTENANCE'
    },
    {
      title: 'Két nước phòng B203 bị rò rỉ',
      description: 'Khách thuê báo có tiếng rò rỉ nước trong tường, cần kiểm tra ngay',
      apartment_id: apartments[13].id,
      requester_name: 'Trần Thị Manager',
      requester_phone: '0907654321',
      assigned_to: tech.id,
      status: 'PENDING',
      source: 'INTERNAL',
      type: 'MAINTENANCE'
    },
    {
      title: 'Thay bóng đèn hành lang tầng 2',
      description: 'Hai bóng đèn LED hành lang tầng 2 Block A bị hỏng',
      apartment_id: apartments[0].id,
      requester_name: 'Phạm Thị Lễ Tân',
      requester_phone: '0922334455',
      assigned_to: null,
      status: 'PENDING',
      source: 'INTERNAL',
      type: 'MAINTENANCE'
    },
    {
      title: 'Sửa khóa cửa phòng A204',
      description: 'Khóa cửa khó mở, khách phải dùng lực mạnh',
      apartment_id: apartments[3].id,
      requester_name: 'Nguyễn Văn Admin',
      requester_phone: '0901234567',
      assigned_to: tech.id,
      status: 'RESOLVED',
      source: 'INTERNAL',
      type: 'MAINTENANCE'
    },
    {
      title: 'Thay bình nóng lạnh phòng B102',
      description: 'Bình nóng lạnh không đun được nước, có thể hỏng điện trở',
      apartment_id: apartments[12].id,
      requester_name: 'Phạm Thị Lễ Tân',
      requester_phone: '0922334455',
      assigned_to: tech.id,
      status: 'PENDING',
      source: 'INTERNAL',
      type: 'MAINTENANCE'
    },
  ];

  for (const sr of serviceReqData) {
    await prisma.serviceRequests.create({ data: sr });
  }
  console.log(`Created ${serviceReqData.length} service requests.`);
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
