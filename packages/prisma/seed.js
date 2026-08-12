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
  await prisma.userSessions.deleteMany({});
  await prisma.temporaryRegistrations.deleteMany({});
  await prisma.serviceRequestMaterials.deleteMany({});
  await prisma.stockTransactions.deleteMany({});
  await prisma.inventoryItems.deleteMany({});
  await prisma.warehouses.deleteMany({});
  await prisma.timeline.deleteMany({});
  await prisma.buildingAssignments.deleteMany({});
  await prisma.businessRules.deleteMany({});
  await prisma.workflowTransitions.deleteMany({});
  await prisma.workflowSteps.deleteMany({});
  await prisma.workflows.deleteMany({});
  await prisma.attachments.deleteMany({});
  await prisma.serviceRequestComments.deleteMany({});
  await prisma.serviceRequestExpenses.deleteMany({});
  await prisma.creditTransactions.deleteMany({});
  await prisma.contractCredits.deleteMany({});
  await prisma.buildingExpenses.deleteMany({});
  await prisma.serviceRequests.deleteMany({});
  await prisma.assets.deleteMany({});
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
      receive_weekly_report: true,
    },
  });

  const manager = await prisma.users.create({
    data: {
      email: 'manager@qlchdc.com',
      password_hash: passwordHash,
      full_name: 'Trần Thị Manager',
      role: 'MANAGER',
      phone: '0907654321',
      receive_weekly_report: true,
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
      { name: 'Trông giữ thú cưng', type: 'OTHER', unit_price: 150000, unit: 'con/tháng' },
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
      const type = roomTypes[(f + r) % roomTypes.length]; // STUDIO, ONE_BR, TWO_BR, THREE_BR
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
      const type = roomTypes[(f + r + 1) % roomTypes.length];
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
        gender: i % 5 === 0 ? 'OTHER' : (isMale ? 'MALE' : 'FEMALE'),
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
    
    let status = 'ACTIVE';
    let terminationReason = null;
    
    // Make 3 contracts expire in June 2026
    if (i === 0) {
      endDate = new Date('2026-06-15');
      status = 'EXPIRING_SOON';
    }
    if (i === 4) {
      endDate = new Date('2026-06-22');
      status = 'EXPIRING_SOON';
    }
    if (i === 8) {
      endDate = new Date('2026-06-29');
      status = 'EXPIRING_SOON';
    }
    
    // Make one contract expired and one terminated in the past (to test full enum scope)
    if (i === 12) {
      endDate = new Date('2026-05-15');
      status = 'TERMINATED';
      terminationReason = 'Khách thuê chuyển công tác trước thời hạn';
    }
    if (i === 13) {
      endDate = new Date('2026-05-20');
      status = 'EXPIRED';
    }

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
        status: status,
        termination_reason: terminationReason,
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

    // Update apartment status: AVAILABLE if expired/terminated, OCCUPIED otherwise
    await prisma.apartments.update({
      where: { id: apt.id },
      data: { status: (status === 'EXPIRED' || status === 'TERMINATED') ? 'AVAILABLE' : 'OCCUPIED' }
    });

    // Add Furniture logs for this apartment with diverse condition enums (NEW, GOOD, WORN)
    await prisma.apartmentFurniture.createMany({
      data: [
        { apartment_id: apt.id, item_name: 'Giường gỗ sồi', quantity: 1, condition: i % 3 === 0 ? 'WORN' : (i % 2 === 0 ? 'NEW' : 'GOOD') },
        { apartment_id: apt.id, item_name: 'Tủ quần áo 3 cánh', quantity: 1, condition: i % 3 === 1 ? 'WORN' : (i % 2 === 1 ? 'NEW' : 'GOOD') },
        { apartment_id: apt.id, item_name: 'Điều hòa Daikin', quantity: 1, condition: i % 3 === 2 ? 'WORN' : (i % 2 === 0 ? 'NEW' : 'GOOD') },
        { apartment_id: apt.id, item_name: 'Bình nóng lạnh', quantity: 1, condition: i % 3 === 0 ? 'WORN' : (i % 2 === 1 ? 'NEW' : 'GOOD') }
      ]
    });

    // Add subscriptions with some CANCELLED status (SubscriptionStatus: ACTIVE, CANCELLED)
    if (internetService) {
      await prisma.serviceSubscriptions.create({
        data: { contract_id: contract.id, service_id: internetService.id, status: i % 7 === 0 ? 'CANCELLED' : 'ACTIVE', quantity: 1 }
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

  // 7.5 Create ContractCredits and CreditTransactions
  console.log('Seeding Contract Credits & Credit Transactions...');
  for (let i = 0; i < 5; i++) {
    const contract = contracts[i];
    await prisma.contractCredits.create({
      data: {
        contract_id: contract.id,
        balance: 500000.00,
      }
    });

    await prisma.creditTransactions.create({
      data: {
        contract_id: contract.id,
        type: 'CREDIT_IN',
        amount: 500000.00,
        description: 'Khách hàng nộp thừa tiền phòng, chuyển vào số dư tích lũy',
        recorded_by: admin.id,
        created_at: new Date('2026-05-10T10:00:00Z')
      }
    });
  }

  // Credit Transactions for CREDIT_APPLY and CREDIT_REFUND
  if (contracts[0]) {
    await prisma.creditTransactions.create({
      data: {
        contract_id: contracts[0].id,
        type: 'CREDIT_APPLY',
        amount: 200000.00,
        description: 'Khấu trừ 200,000đ từ số dư tích lũy vào hóa đơn tháng 5',
        recorded_by: admin.id,
        created_at: new Date('2026-05-01T11:00:00Z')
      }
    });
  }
  if (contracts[1]) {
    await prisma.creditTransactions.create({
      data: {
        contract_id: contracts[1].id,
        type: 'CREDIT_REFUND',
        amount: 100000.00,
        description: 'Hoàn trả 100,000đ tiền mặt từ số dư tích lũy cho khách',
        recorded_by: admin.id,
        created_at: new Date('2026-05-15T14:00:00Z')
      }
    });
  }

  // 7.6 Create ContractRenewals
  console.log('Seeding Contract Renewals...');
  if (contracts[2]) {
    await prisma.contractRenewals.create({
      data: {
        contract_id: contracts[2].id,
        old_end_date: new Date('2026-03-01'),
        new_end_date: new Date('2027-03-01'),
        new_monthly_rent: Number(contracts[2].monthly_rent) * 1.05,
        notes: 'Gia hạn hợp đồng thêm 1 năm, tăng giá thuê 5% theo thỏa thuận.',
        renewed_by: manager.id,
      }
    });
  }

  console.log(` Rented out 16 apartments. 1 Maintenance, 1 Reserved, 6 Available.`);

  // 8. Generate Utility Readings, Invoices, and Payments Month-by-Month
  // For each contract, generate records starting from the first billing month up to June 2026.
  // Months: Jan 2026 ('2026-01') to June 2026 ('2026-06')
  console.log('Generating historical financials & chốt số records...');
  
  const allBillingMonths = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06'];
  let totalInvoicesCreated = 0;

  for (const contract of contracts) {
    const start = new Date(contract.start_date);
    const occupants = contract.soNguoiO;
    const apartmentId = contract.apartment_id;
    const monthlyRent = Number(contract.monthly_rent);

    // Initial values
    let prevElec = Number(contract.initial_electricity);

    // Filter months that are within the contract active period
    const billingMonths = allBillingMonths.filter(m => {
      const [yStr, mStr] = m.split('-');
      const monthStart = new Date(Number(yStr), Number(mStr) - 1, 1);
      const monthEnd = new Date(Number(yStr), Number(mStr) - 1, 31);
      
      const contractEnd = new Date(contract.end_date);
      
      return start <= monthEnd && contractEnd >= monthStart;
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

      // Ensure utility reading recording date does not exceed current local time (June 9, 2026)
      const plannedRecordedAt = new Date(year, month - 1, 28, 17, 30, 0);
      const recordedAt = plannedRecordedAt > new Date('2026-06-09') ? new Date('2026-06-01T17:30:00Z') : plannedRecordedAt;

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
          recorded_at: recordedAt
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
      // June 2026 is the current month. The due date is June 5th, 2026.
      // Since today is June 9th, unpaid/partially paid invoices are OVERDUE.
      let status = 'PAID';
      const rand = Math.random();

      if (billingMonth === '2026-06') {
        if (rand < 0.25) status = 'OVERDUE';
        else if (rand < 0.5) status = 'UNPAID';
        else if (rand < 0.7) status = 'PARTIALLY_PAID';
      } else if (billingMonth === '2026-05') {
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
            payment_method: monthIndex % 3 === 0 ? 'CASH' : 'BANK_TRANSFER',
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
            payment_method: monthIndex % 3 === 0 ? 'CASH' : 'BANK_TRANSFER',
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

  // 9. Seed Warehouses, InventoryItems & Assets
  console.log('Seeding Warehouses, InventoryItems & Assets...');
  const w1 = await prisma.warehouses.create({
    data: {
      name: 'Kho kỹ thuật tầng 10',
      building_id: b1.id,
      description: 'Kho chứa thiết bị, vật tư sửa chữa kỹ thuật của Block A'
    }
  });

  const w2 = await prisma.warehouses.create({
    data: {
      name: 'Kho tiêu hao tầng hầm B1',
      building_id: b1.id,
      description: 'Kho chứa các vật tư tiêu hao, hóa chất tẩy rửa Block A'
    }
  });

  const itemsData = [
    { warehouse_id: w1.id, item_name: 'Bóng đèn Điện Quang 18W', category: 'CONSUMABLE', current_stock: 20, min_stock_level: 5, unit: 'cái', unit_cost: 35000 },
    { warehouse_id: w1.id, item_name: 'Dây cáp điện Cadivi', category: 'CONSUMABLE', current_stock: 50, min_stock_level: 10, unit: 'mét', unit_cost: 12000 },
    { warehouse_id: w1.id, item_name: 'Van nước Inox', category: 'SPARE_PART', current_stock: 8, min_stock_level: 3, unit: 'cái', unit_cost: 85000 },
    { warehouse_id: w1.id, item_name: 'Bộ tuốc nơ vít đa năng', category: 'TOOL', current_stock: 3, min_stock_level: 1, unit: 'bộ', unit_cost: 180000 },
    { warehouse_id: w1.id, item_name: 'Máy khoan cầm tay Bosch', category: 'EQUIPMENT', current_stock: 2, min_stock_level: 1, unit: 'cái', unit_cost: 1200000 },
    { warehouse_id: w2.id, item_name: 'Nước lau sàn Sunlight', category: 'CONSUMABLE', current_stock: 10, min_stock_level: 2, unit: 'chai', unit_cost: 45000 }
  ];

  const items = [];
  for (const item of itemsData) {
    const createdItem = await prisma.inventoryItems.create({ data: item });
    items.push(createdItem);

    // Initial Stock In transaction
    await prisma.stockTransactions.create({
      data: {
        inventory_item_id: createdItem.id,
        type: 'STOCK_IN',
        quantity: item.current_stock,
        unit_cost: item.unit_cost,
        item_name_snapshot: item.item_name,
        ref_type: 'MANUAL',
        note: 'Nhập kho khởi tạo hệ thống',
        recorded_by: admin.id
      }
    });
  }

  // Stock Transaction with ADJUSTMENT ref type
  await prisma.stockTransactions.create({
    data: {
      inventory_item_id: items[0].id,
      type: 'STOCK_OUT',
      quantity: 1,
      unit_cost: items[0].unit_cost,
      item_name_snapshot: items[0].item_name,
      ref_type: 'ADJUSTMENT',
      note: 'Kiểm kho phát hiện hao hụt 1 bóng đèn',
      recorded_by: admin.id
    }
  });

  const elevatorAsset = await prisma.assets.create({
    data: {
      building_id: b1.id,
      asset_code: 'AST-0001',
      name: 'Thang máy Otis',
      category: 'MACHINERY',
      status: 'ACTIVE',
      purchase_cost: 850000000,
      salvage_value: 50000000,
      useful_life_years: 15,
      purchase_date: new Date('2022-01-15'),
      depreciation_method: 'STRAIGHT_LINE',
      description: 'Thang máy tải khách Otis Schindler Block A'
    }
  });

  const generatorAsset = await prisma.assets.create({
    data: {
      building_id: b1.id,
      asset_code: 'AST-0002',
      name: 'Máy phát điện Mitsubishi',
      category: 'MACHINERY',
      status: 'UNDER_REPAIR',
      purchase_cost: 450000000,
      salvage_value: 30000000,
      useful_life_years: 10,
      purchase_date: new Date('2024-03-20'),
      depreciation_method: 'STRAIGHT_LINE',
      description: 'Máy phát điện dự phòng Mitsubishi Block A'
    }
  });

  const oldPumpAsset = await prisma.assets.create({
    data: {
      building_id: b1.id,
      asset_code: 'AST-0003',
      name: 'Máy bơm nước cũ Pentax',
      category: 'MACHINERY',
      status: 'DECOMMISSIONED',
      purchase_cost: 12000000,
      salvage_value: 500000,
      useful_life_years: 5,
      purchase_date: new Date('2020-02-10'),
      depreciation_method: 'STRAIGHT_LINE',
      description: 'Máy bơm nước sảnh phụ đã hỏng hóc nặng và thanh lý'
    }
  });

  const serverAsset = await prisma.assets.create({
    data: {
      building_id: b1.id,
      asset_code: 'AST-0004',
      name: 'Hệ thống Camera & Server trung tâm',
      category: 'ELECTRONICS',
      status: 'ACTIVE',
      purchase_cost: 120000000,
      salvage_value: 10000000,
      useful_life_years: 5,
      purchase_date: new Date('2025-01-10'),
      depreciation_method: 'STRAIGHT_LINE',
      description: 'Hệ thống đầu ghi và camera giám sát hành lang toàn tòa nhà'
    }
  });

  const deskAsset = await prisma.assets.create({
    data: {
      building_id: b1.id,
      asset_code: 'AST-0005',
      name: 'Bàn lễ tân sảnh chính',
      category: 'FURNITURE',
      status: 'ACTIVE',
      purchase_cost: 25000000,
      salvage_value: 2000000,
      useful_life_years: 8,
      purchase_date: new Date('2026-01-05'),
      depreciation_method: 'STRAIGHT_LINE',
      description: 'Bàn quầy gỗ công nghiệp An Cường sảnh chính'
    }
  });

  const cartAsset = await prisma.assets.create({
    data: {
      building_id: b1.id,
      asset_code: 'AST-0006',
      name: 'Xe điện tuần tra nội khu',
      category: 'VEHICLE',
      status: 'ACTIVE',
      purchase_cost: 80000000,
      salvage_value: 5000000,
      useful_life_years: 7,
      purchase_date: new Date('2025-06-15'),
      depreciation_method: 'STRAIGHT_LINE',
      description: 'Xe điện 4 chỗ dùng cho bảo vệ tuần tra khuôn viên Sunrise Block A'
    }
  });

  const fireAsset = await prisma.assets.create({
    data: {
      building_id: b1.id,
      asset_code: 'AST-0007',
      name: 'Hệ thống bình chữa cháy cầm tay',
      category: 'OTHER',
      status: 'ACTIVE',
      purchase_cost: 15000000,
      salvage_value: 0,
      useful_life_years: 3,
      purchase_date: new Date('2026-03-01'),
      depreciation_method: 'STRAIGHT_LINE',
      description: 'Trang bị 30 bình chữa cháy khí CO2 đặt tại các hành lang'
    }
  });

  // 10. ServiceRequests mẫu với độ đa dạng cao của các Enums
  const serviceReqData = [
    {
      title: 'Điều hòa phòng A101 không mát',
      description: 'Máy lạnh chạy nhưng không giảm nhiệt độ, cần kiểm tra gas và bộ lọc',
      apartment_id: apartments[0].id,
      requester_name: 'Phạm Thị Lễ Tân',
      requester_phone: '0922334455',
      assigned_to: tech.id,
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      source: 'INTERNAL',
      type: 'MAINTENANCE',
      scheduled_start_date: new Date('2026-06-04')
    },
    {
      title: 'Két nước phòng B203 bị rò rỉ',
      description: 'Khách thuê báo có tiếng rò rỉ nước trong tường, cần kiểm tra ngay',
      apartment_id: apartments[13].id,
      requester_name: 'Trần Thị Manager',
      requester_phone: '0907654321',
      assigned_to: tech.id,
      status: 'ASSIGNED',
      priority: 'URGENT',
      source: 'INTERNAL',
      type: 'MAINTENANCE',
      scheduled_start_date: new Date('2026-06-05')
    },
    {
      title: 'Thay bóng đèn hành lang tầng 2',
      description: 'Hai bóng đèn LED hành lang tầng 2 Block A bị hỏng',
      apartment_id: apartments[0].id,
      requester_name: 'Phạm Thị Lễ Tân',
      requester_phone: '0922334455',
      assigned_to: null,
      status: 'PENDING',
      priority: 'LOW',
      source: 'PUBLIC_FORM',
      type: 'MAINTENANCE',
      scheduled_start_date: new Date('2026-06-06')
    },
    {
      title: 'Sửa khóa cửa phòng A204',
      description: 'Khóa cửa khó mở, khách phải dùng lực mạnh',
      apartment_id: apartments[3].id,
      requester_name: 'Nguyễn Văn Admin',
      requester_phone: '0901234567',
      assigned_to: tech.id,
      status: 'RESOLVED',
      priority: 'NORMAL',
      source: 'INTERNAL',
      type: 'MAINTENANCE',
      scheduled_start_date: new Date('2026-06-02')
    },
    {
      title: 'Hàng xóm làm ồn đêm khuya',
      description: 'Căn hộ tầng trên thường xuyên kéo ghế và làm ồn sau 11h đêm',
      apartment_id: apartments[2].id,
      requester_name: 'Trần Thị Manager',
      requester_phone: '0907654321',
      assigned_to: manager.id,
      status: 'POSTPONED',
      priority: 'NORMAL',
      source: 'INTERNAL',
      type: 'COMPLAINT',
      scheduled_start_date: new Date('2026-06-03')
    },
    {
      title: 'Hỗ trợ lắp đặt kệ sách treo tường',
      description: 'Khách yêu cầu hỗ trợ khoan tường lắp kệ sách mới mua',
      apartment_id: apartments[1].id,
      requester_name: 'Phạm Thị Lễ Tân',
      requester_phone: '0922334455',
      assigned_to: tech.id,
      status: 'CANCELLED',
      priority: 'LOW',
      source: 'PUBLIC_FORM',
      type: 'OTHER',
      scheduled_start_date: new Date('2026-06-07')
    },
    {
      title: 'Dọn dẹp hành lang Block B',
      description: 'Yêu cầu dọn dẹp rác sinh hoạt rơi vãi hành lang',
      apartment_id: apartments[12].id,
      requester_name: 'Phạm Thị Lễ Tân',
      requester_phone: '0922334455',
      assigned_to: null,
      status: 'PENDING',
      priority: 'LOW',
      source: 'INTERNAL',
      type: 'CLEANING',
      scheduled_start_date: new Date('2026-06-08')
    },
    {
      title: 'Bảo trì định kỳ Thang máy Otis',
      description: 'Bảo trì định kỳ hàng tháng cho thang máy Otis Block A',
      apartment_id: apartments[0].id,
      requester_name: 'Nguyễn Văn Admin',
      requester_phone: '0901234567',
      assigned_to: tech.id,
      status: 'RESOLVED',
      priority: 'NORMAL',
      source: 'INTERNAL',
      type: 'MAINTENANCE',
      asset_id: elevatorAsset.id,
      scheduled_start_date: new Date('2026-05-15')
    }
  ];

  const createdRequests = [];
  for (const sr of serviceReqData) {
    const created = await prisma.serviceRequests.create({ data: sr });
    createdRequests.push(created);
  }
  console.log(`Created ${serviceReqData.length} service requests.`);

  // Seed ServiceRequestMaterials for resolved requests
  const otisRequest = createdRequests.find(r => r.title === 'Bảo trì định kỳ Thang máy Otis');
  if (otisRequest) {
    const wireItem = items.find(i => i.item_name === 'Dây cáp điện Cadivi');
    if (wireItem) {
      await prisma.serviceRequestMaterials.create({
        data: {
          service_request_id: otisRequest.id,
          inventory_item_id: wireItem.id,
          quantity: 5,
          unit_cost: wireItem.unit_cost
        }
      });

      // Stock transaction for out of stock
      await prisma.stockTransactions.create({
        data: {
          inventory_item_id: wireItem.id,
          type: 'STOCK_OUT',
          quantity: 5,
          unit_cost: wireItem.unit_cost,
          item_name_snapshot: wireItem.item_name,
          ref_type: 'SERVICE_REQUEST',
          ref_id: otisRequest.id,
          note: 'Xuất kho dây cáp điện Cadivi bảo trì thang máy',
          recorded_by: tech.id
        }
      });

      // Update current stock of wireItem
      await prisma.inventoryItems.update({
        where: { id: wireItem.id },
        data: { current_stock: { decrement: 5 } }
      });
    }
  }

  // 10. Seed BuildingExpenses & Attachments
  console.log('Seeding Building Expenses & Attachments...');
  const exp1 = await prisma.buildingExpenses.create({
    data: {
      building_id: b1.id,
      category: 'UTILITY_ELECTRICITY',
      title: 'Electricity Bill - May 2026',
      amount: 4250000,
      expense_date: new Date('2026-05-05'),
      status: 'PAID',
      description: 'Hóa đơn tiền điện hành lang & vận hành Block A tháng 5/2026',
      created_by: admin.id
    }
  });

  const exp2 = await prisma.buildingExpenses.create({
    data: {
      building_id: b1.id,
      category: 'OPERATIONS',
      title: 'Water Bill - May 2026',
      amount: 1200000,
      expense_date: new Date('2026-05-06'),
      status: 'PAID',
      description: 'Hóa đơn tiền nước sinh hoạt công cộng Block A tháng 5/2026',
      created_by: admin.id
    }
  });

  const exp3 = await prisma.buildingExpenses.create({
    data: {
      building_id: b1.id,
      category: 'ASSET_MAINTENANCE',
      title: 'Elevator Maintenance Schindler',
      amount: 5000000,
      expense_date: new Date('2026-05-12'),
      status: 'PAID',
      description: 'Chi phí bảo trì, bảo dưỡng định kỳ hệ thống thang máy Schindler Block A',
      created_by: admin.id
    }
  });

  const exp4 = await prisma.buildingExpenses.create({
    data: {
      building_id: b2.id,
      category: 'OPERATIONS',
      title: 'Cleaning Service Contract',
      amount: 3500000,
      expense_date: new Date('2026-05-15'),
      status: 'PAID',
      description: 'Chi phí thuê đơn vị vệ sinh ngoại cảnh cho Block B',
      created_by: admin.id
    }
  });

  const exp5 = await prisma.buildingExpenses.create({
    data: {
      building_id: b2.id,
      category: 'OPERATIONS',
      title: 'Security Service - May 2026',
      amount: 6000000,
      expense_date: new Date('2026-05-18'),
      status: 'PENDING',
      description: 'Chi phí thuê bảo vệ chuyên nghiệp tuần tra Block B tháng 5/2026',
      created_by: admin.id
    }
  });

  const exp6 = await prisma.buildingExpenses.create({
    data: {
      building_id: b1.id,
      category: 'MAINTENANCE',
      title: 'Sửa mái tôn chống dột Block A',
      amount: 4500000,
      expense_date: new Date('2026-05-20'),
      status: 'PAID',
      description: 'Chi phí chống dột mái tôn sảnh trước mùa mưa',
      created_by: admin.id
    }
  });

  const exp7 = await prisma.buildingExpenses.create({
    data: {
      building_id: b1.id,
      category: 'INVENTORY_PURCHASE',
      title: 'Purchase Spare Parts & Consumables',
      amount: 1500000,
      expense_date: new Date('2026-05-22'),
      status: 'PAID',
      description: 'Mua bổ sung bóng đèn, dây cáp điện dự phòng cho kho kỹ thuật',
      created_by: admin.id
    }
  });

  await prisma.attachments.createMany({
    data: [
      {
        file_name: 'electricity-may.pdf',
        file_url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&auto=format&fit=crop',
        file_size: 345000,
        mime_type: 'application/pdf',
        entity_type: 'BuildingExpense',
        entity_id: exp1.id,
        uploaded_by: admin.id,
      },
      {
        file_name: 'water-may.pdf',
        file_url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&auto=format&fit=crop',
        file_size: 215000,
        mime_type: 'application/pdf',
        entity_type: 'BuildingExpense',
        entity_id: exp2.id,
        uploaded_by: admin.id,
      },
      {
        file_name: 'maintenance-invoice.jpg',
        file_url: 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?w=800&auto=format&fit=crop',
        file_size: 512000,
        mime_type: 'image/jpeg',
        entity_type: 'BuildingExpense',
        entity_id: exp3.id,
        uploaded_by: admin.id,
      },
      {
        file_name: 'cleaning-contract.pdf',
        file_url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&auto=format&fit=crop',
        file_size: 890000,
        mime_type: 'application/pdf',
        entity_type: 'BuildingExpense',
        entity_id: exp4.id,
        uploaded_by: admin.id,
      }
    ]
  });

  // 10.5 Seed TemporaryRegistrations
  console.log('Seeding Temporary Registrations...');
  await prisma.temporaryRegistrations.createMany({
    data: [
      {
        tenant_id: tenants[0].id,
        apartment_id: apartments[0].id,
        type: 'TEMPORARY_RESIDENCE',
        start_date: new Date('2026-01-05'),
        end_date: new Date('2027-01-05'),
        reason: 'Đăng ký tạm trú dài hạn theo hợp đồng thuê nhà',
        submitted_by: receptionist.id
      },
      {
        tenant_id: tenants[1].id,
        apartment_id: apartments[1].id,
        type: 'TEMPORARY_ABSENCE',
        start_date: new Date('2026-06-05'),
        end_date: new Date('2026-06-20'),
        destination: '123 Đường Trần Hưng Đạo, Quy Nhơn, Bình Định',
        reason: 'Về quê nghỉ hè và thăm gia đình',
        submitted_by: receptionist.id
      }
    ]
  });

  // 11. Seed Notifications
  console.log('Seeding Notifications...');
  const seededInvoices = await prisma.invoices.findMany({ take: 2 });
  const seededRequests = await prisma.serviceRequests.findMany({ take: 2 });

  await prisma.notifications.createMany({
    data: [
      {
        user_id: admin.id,
        title: 'Hợp đồng sắp hết hạn',
        message: `Hợp đồng căn hộ ${contracts[0].contract_code} sắp hết hạn trong vòng 30 ngày.`,
        type: 'CONTRACT_EXPIRING',
        entity_type: 'Contract',
        entity_id: contracts[0].id,
        is_read: false,
        created_at: new Date('2026-06-03T10:00:00Z')
      },
      {
        user_id: admin.id,
        title: 'Hóa đơn quá hạn',
        message: `Hóa đơn ${seededInvoices[0]?.invoice_code ?? 'INV-001'} đã quá hạn thanh toán. Vui lòng kiểm tra.`,
        type: 'INVOICE_OVERDUE',
        entity_type: 'Invoice',
        entity_id: seededInvoices[0]?.id ?? 1,
        is_read: false,
        created_at: new Date('2026-06-03T11:30:00Z')
      },
      {
        user_id: admin.id,
        title: 'Sự cố kỹ thuật đã hoàn thành',
        message: `Căn hộ: Yêu cầu "${seededRequests[0]?.title ?? 'Sửa khóa cửa'}" đã được hoàn thành.`,
        type: 'MAINTENANCE_RESOLVED',
        entity_type: 'ServiceRequest',
        entity_id: seededRequests[0]?.id ?? 1,
        is_read: true,
        created_at: new Date('2026-06-02T15:45:00Z')
      }
    ]
  });

  // 12. Seed Workflows
  console.log('Seeding Workflows & Steps...');
  const contractWorkflow = await prisma.workflows.create({
    data: {
      name: 'ContractWorkflow',
      description: 'Quy trình quản lý vòng đời hợp đồng thuê căn hộ',
    }
  });

  const activeStep = await prisma.workflowSteps.create({
    data: { workflow_id: contractWorkflow.id, step_name: 'ACTIVE', order_number: 1, is_initial: true }
  });
  const expiringStep = await prisma.workflowSteps.create({
    data: { workflow_id: contractWorkflow.id, step_name: 'EXPIRING_SOON', order_number: 2 }
  });
  const expiredStep = await prisma.workflowSteps.create({
    data: { workflow_id: contractWorkflow.id, step_name: 'EXPIRED', order_number: 3, is_final: true }
  });
  const terminatedStep = await prisma.workflowSteps.create({
    data: { workflow_id: contractWorkflow.id, step_name: 'TERMINATED', order_number: 4, is_final: true }
  });

  // Transitions cho ContractWorkflow
  await prisma.workflowTransitions.createMany({
    data: [
      { workflow_id: contractWorkflow.id, from_step_id: activeStep.id, to_step_id: expiringStep.id, name: 'Cảnh báo sắp hết hạn' },
      { workflow_id: contractWorkflow.id, from_step_id: activeStep.id, to_step_id: terminatedStep.id, name: 'Chấm dứt sớm', role_allowed: 'ADMIN,MANAGER' },
      { workflow_id: contractWorkflow.id, from_step_id: expiringStep.id, to_step_id: activeStep.id, name: 'Gia hạn hợp đồng', role_allowed: 'ADMIN,MANAGER' },
      { workflow_id: contractWorkflow.id, from_step_id: expiringStep.id, to_step_id: expiredStep.id, name: 'Hết hạn hợp đồng' },
      { workflow_id: contractWorkflow.id, from_step_id: expiringStep.id, to_step_id: terminatedStep.id, name: 'Chấm dứt sớm', role_allowed: 'ADMIN,MANAGER' },
    ]
  });

  const srWorkflow = await prisma.workflows.create({
    data: {
      name: 'ServiceRequestWorkflow',
      description: 'Quy trình xử lý sự cố kỹ thuật và yêu cầu dịch vụ',
    }
  });

  const pendingStep = await prisma.workflowSteps.create({
    data: { workflow_id: srWorkflow.id, step_name: 'PENDING', order_number: 1, is_initial: true }
  });
  const assignedStep = await prisma.workflowSteps.create({
    data: { workflow_id: srWorkflow.id, step_name: 'ASSIGNED', order_number: 2 }
  });
  const inProgressStep = await prisma.workflowSteps.create({
    data: { workflow_id: srWorkflow.id, step_name: 'IN_PROGRESS', order_number: 3 }
  });
  const resolvedStep = await prisma.workflowSteps.create({
    data: { workflow_id: srWorkflow.id, step_name: 'RESOLVED', order_number: 4, is_final: true }
  });
  const cancelledStep = await prisma.workflowSteps.create({
    data: { workflow_id: srWorkflow.id, step_name: 'CANCELLED', order_number: 5, is_final: true }
  });
  const postponedStep = await prisma.workflowSteps.create({
    data: { workflow_id: srWorkflow.id, step_name: 'POSTPONED', order_number: 6 }
  });

  // Transitions cho ServiceRequestWorkflow
  await prisma.workflowTransitions.createMany({
    data: [
      { workflow_id: srWorkflow.id, from_step_id: pendingStep.id, to_step_id: assignedStep.id, name: 'Phân công kỹ thuật viên', role_allowed: 'ADMIN,MANAGER' },
      { workflow_id: srWorkflow.id, from_step_id: pendingStep.id, to_step_id: cancelledStep.id, name: 'Hủy yêu cầu' },
      { workflow_id: srWorkflow.id, from_step_id: assignedStep.id, to_step_id: inProgressStep.id, name: 'Bắt đầu xử lý' },
      { workflow_id: srWorkflow.id, from_step_id: assignedStep.id, to_step_id: pendingStep.id, name: 'Hủy phân công', role_allowed: 'ADMIN,MANAGER' },
      { workflow_id: srWorkflow.id, from_step_id: assignedStep.id, to_step_id: cancelledStep.id, name: 'Hủy yêu cầu' },
      { workflow_id: srWorkflow.id, from_step_id: inProgressStep.id, to_step_id: resolvedStep.id, name: 'Hoàn thành xử lý' },
      { workflow_id: srWorkflow.id, from_step_id: inProgressStep.id, to_step_id: postponedStep.id, name: 'Tạm hoãn', role_allowed: 'ADMIN,MANAGER' },
      { workflow_id: srWorkflow.id, from_step_id: postponedStep.id, to_step_id: inProgressStep.id, name: 'Tiếp tục xử lý' },
    ]
  });

  // 13. Seed BusinessRules
  console.log('Seeding Business Rules...');
  await prisma.businessRules.createMany({
    data: [
      {
        name: 'Nhắc nhở hợp đồng sắp hết hạn',
        entity: 'Contract',
        condition: { field: 'days_remaining', operator: '<=', value: 30 },
        action: 'SEND_NOTIFICATION',
        action_data: { template: 'Hợp đồng {contract_code} của căn hộ {apartment_code} sắp hết hạn trong {days_remaining} ngày nữa.' }
      },
      {
        name: 'Nhắc nhở bảo trì sắp đến hạn',
        entity: 'ServiceRequest',
        condition: { field: 'days_to_start', operator: '<=', value: 2 },
        action: 'SEND_NOTIFICATION',
        action_data: { template: 'Yêu cầu bảo trì "{title}" được lên lịch bắt đầu vào ngày {scheduled_start_date}. Vui lòng kiểm tra.' }
      },
      {
        name: 'Tự động báo hóa đơn quá hạn',
        entity: 'Invoice',
        condition: { field: 'days_overdue', operator: '>=', value: 1 },
        action: 'SEND_NOTIFICATION',
        action_data: { template: 'Hóa đơn {invoice_code} đã quá hạn {days_overdue} ngày. Vui lòng gửi lời nhắc thanh toán.' }
      }
    ]
  });

  // 14. Seed BuildingAssignments
  console.log('Seeding Building Assignments...');
  await prisma.buildingAssignments.createMany({
    data: [
      {
        user_id: manager.id,
        building_id: b1.id,
        assigned_by: admin.id,
        assigned_at: new Date('2026-06-01T08:00:00Z'),
      },
      {
        user_id: tech.id,
        building_id: b1.id,
        assigned_by: admin.id,
        assigned_at: new Date('2026-06-01T08:30:00Z'),
      },
      // Một phân công đã bị thu hồi (revoked) cho manager đối với tòa b2
      {
        user_id: manager.id,
        building_id: b2.id,
        assigned_by: admin.id,
        assigned_at: new Date('2026-05-01T09:00:00Z'),
        revoked_at: new Date('2026-06-01T17:00:00Z'),
      }
    ]
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
