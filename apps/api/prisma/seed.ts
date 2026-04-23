import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ── System Config defaults ───────────────────────────────────────────────
  const configs = [
    { key: 'NO_SHOW_FINE_AMOUNT', value: '50' },
    { key: 'NO_SHOW_TIMER_MINUTES', value: '30' },
    { key: 'SLOT_RESERVATION_MINUTES', value: '15' },
    { key: 'PAYMENT_TIMEOUT_MINUTES', value: '60' },
    { key: 'WEATHER_WIND_THRESHOLD_MS', value: '20' },
    { key: 'WEATHER_WAVE_THRESHOLD_M', value: '2' },
    { key: 'WEATHER_PRECIPITATION_THRESHOLD_MM', value: '20' },
    { key: 'CASH_REFERENCE_EXPIRY_HOURS', value: '24' },
    { key: 'PRIORITY_QUEUE_SHARE_PERCENT', value: '10' },
    { key: 'FAST_TRACK_QUEUE_SHARE_PERCENT', value: '10' },
    { key: 'REGULAR_QUEUE_SHARE_PERCENT', value: '80' },
    { key: 'TOTAL_DAILY_QUOTA', value: '1000' },
    { key: 'MAX_LEGAL_REVIEW_CYCLES', value: '2' },
    { key: 'MANIFEST_DISTRIBUTION_TIMEOUT_MINUTES', value: '2' },
    { key: 'VESSEL_ETA_MANIFEST_TRIGGER_HOURS', value: '5' },
  ];

  for (const config of configs) {
    await prisma.systemConfig.upsert({
      where: { key: config.key },
      create: { key: config.key, value: config.value, updatedById: 'system' },
      update: { value: config.value },
    });
  }
  console.log('✅ System config defaults seeded');

  // ── Parking Zones & Slots ────────────────────────────────────────────────
  // ParkingZoneType in schema: REGULAR | FAST_TRACK | HAZARDOUS_PRIORITY | OVERSIZED
  const zones = [
    { name: 'Zone A — General / Regular Cargo', type: 'REGULAR' as const, capacity: 200, prefix: 'A' },
    { name: 'Zone B — Fast-Track Cargo', type: 'FAST_TRACK' as const, capacity: 100, prefix: 'B' },
    { name: 'Zone C — Hazardous Cargo', type: 'HAZARDOUS_PRIORITY' as const, capacity: 50, prefix: 'C' },
    { name: 'Zone D — Oversized Cargo', type: 'OVERSIZED' as const, capacity: 40, prefix: 'D' },
  ];

  for (const zone of zones) {
    const existing = await prisma.parkingZone.findFirst({ where: { name: zone.name } });
    if (existing) continue;

    const created = await prisma.parkingZone.create({
      data: { name: zone.name, type: zone.type, capacity: zone.capacity },
    });

    // slotLabel is the correct field name in the schema (not slotCode)
    const slots = Array.from({ length: zone.capacity }, (_, i) => ({
      zoneId: created.id,
      slotLabel: `${zone.prefix}-${String(i + 1).padStart(3, '0')}`,
      status: 'AVAILABLE' as const,
    }));

    await prisma.parkingSlot.createMany({ data: slots, skipDuplicates: true });
    console.log(`  ✅ Zone "${zone.name}" with ${zone.capacity} slots created`);
  }

  // ── Admin User ───────────────────────────────────────────────────────────
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@portofbaku.az';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'Admin@1234!';

  const existingAdmin = await prisma.user.findFirst({ where: { email: adminEmail } });
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    await prisma.user.create({
      data: {
        email: adminEmail,
        phone: '+994120000001',
        passwordHash,
        role: 'ADMINISTRATOR',
        accountStatus: 'ACTIVE',
        displayName: 'Administrator',
        locale: 'en',
      },
    });
    console.log(`✅ Admin user created: ${adminEmail}`);
  } else {
    console.log(`ℹ️  Admin user already exists: ${adminEmail}`);
  }

  // ── System Administrator ─────────────────────────────────────────────────
  const sysAdminEmail = 'sysadmin@portofbaku.az';
  const existingSysAdmin = await prisma.user.findFirst({ where: { email: sysAdminEmail } });
  if (!existingSysAdmin) {
    const passwordHash = await bcrypt.hash('SysAdmin@1234!', 12);
    await prisma.user.create({
      data: {
        email: sysAdminEmail,
        phone: '+994120000002',
        passwordHash,
        role: 'SYSTEM_ADMINISTRATOR',
        accountStatus: 'ACTIVE',
        displayName: 'System Administrator',
        locale: 'en',
      },
    });
    console.log(`✅ System admin created: ${sysAdminEmail}`);
  }

  // ── Finance Officer ───────────────────────────────────────────────────────
  const financeEmail = 'finance@portofbaku.az';
  const existingFinance = await prisma.user.findFirst({ where: { email: financeEmail } });
  if (!existingFinance) {
    const passwordHash = await bcrypt.hash('Finance@1234!', 12);
    await prisma.user.create({
      data: {
        email: financeEmail,
        phone: '+994120000003',
        passwordHash,
        role: 'FINANCE_OFFICER',
        accountStatus: 'ACTIVE',
        displayName: 'Finance Officer',
        locale: 'en',
      },
    });
    console.log(`✅ Finance officer created: ${financeEmail}`);
  }

  // ── Gate Controller ───────────────────────────────────────────────────────
  const gateEmail = 'gate@portofbaku.az';
  const existingGate = await prisma.user.findFirst({ where: { email: gateEmail } });
  if (!existingGate) {
    const passwordHash = await bcrypt.hash('Gate@1234!', 12);
    await prisma.user.create({
      data: {
        email: gateEmail,
        phone: '+994120000004',
        passwordHash,
        role: 'GATE_CONTROLLER',
        accountStatus: 'ACTIVE',
        displayName: 'Gate Controller',
        locale: 'en',
      },
    });
    console.log(`✅ Gate controller created: ${gateEmail}`);
  }

  // ── Parking Controller ────────────────────────────────────────────────────
  const parkingEmail = 'parking@portofbaku.az';
  const existingParking = await prisma.user.findFirst({ where: { email: parkingEmail } });
  if (!existingParking) {
    const passwordHash = await bcrypt.hash('Parking@1234!', 12);
    await prisma.user.create({
      data: {
        email: parkingEmail,
        phone: '+994120000005',
        passwordHash,
        role: 'PARKING_CONTROLLER',
        accountStatus: 'ACTIVE',
        displayName: 'Parking Controller',
        locale: 'en',
      },
    });
    console.log(`✅ Parking controller created: ${parkingEmail}`);
  }

  console.log('✨ Seeding complete.');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
