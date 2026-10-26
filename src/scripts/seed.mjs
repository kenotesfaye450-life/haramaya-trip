import 'dotenv/config';
import postgres from '@prisma/orm-postgres/runtime';
import { contractFromJson } from '@prisma/orm-postgres/static';
import contractJson from '../prisma/contract.json' with { type: 'json' };
import { scrypt, randomBytes } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);

const databaseUrl = new URL(process.env.DATABASE_URL || "");
if (databaseUrl.pathname.slice(1).toLowerCase() === 'clinic_db') {
  throw new Error('Refusing to seed transportation data into clinic_db.');
}

async function hashPassword(password) {
  const salt = randomBytes(16);
  const key = await scryptAsync(password, salt, 64);
  return `scrypt:${salt.toString('hex')}:${key.toString('hex')}`;
}

const contract = contractFromJson(contractJson);
const db = postgres({
  contract,
  url: databaseUrl.toString(),
});

async function seed() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('The development seed is disabled in production.');
  }
  const adminEmail = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword || adminPassword.length < 12) {
    throw new Error('Set SEED_ADMIN_EMAIL and a SEED_ADMIN_PASSWORD of at least 12 characters in your local environment.');
  }

  console.log('Preparing Haramaya Trip reference data...');
  const orm = db.orm.public;

  // Baseline locations; every row is valid as either an origin or a destination.
  const allLocations = [
    { name: 'Finfinne', code: 'FIN', kind: 'EXTERNAL' },
    { name: 'Main Campus', code: 'MAIN', kind: 'CAMPUS' },
    { name: 'HIT', code: 'HIT', kind: 'CAMPUS' },
    { name: 'Station', code: 'STATION', kind: 'CAMPUS' },
    { name: 'Train Station', code: 'TRN', kind: 'EXTERNAL' },
    { name: 'Adama', code: 'ADA', kind: 'EXTERNAL' },
    { name: 'Chiro', code: 'CHI', kind: 'EXTERNAL' },
    { name: 'Jijiga', code: 'JIJ', kind: 'EXTERNAL' },
  ];

  for (const loc of allLocations) {
    const existing = await orm.Location.where({ code: loc.code }).first();
    if (!existing) {
      await orm.Location.create({ name: loc.name, code: loc.code, kind: loc.kind, isActive: true });
      console.log(`Created location: ${loc.name} (${loc.code})`);
    }
  }

  const tripPurposes = [
    { code: 'SENIOR_STUDENT_ARRIVAL', name: 'Senior Student Arrival', description: 'Senior students coming from another area to campus.' },
    { code: 'FRESH_STUDENT_ARRIVAL', name: 'Fresh Student Arrival', description: 'Fresh or new students coming from another area to campus.' },
    { code: 'SENIOR_BREAK_DEPARTURE', name: 'Senior Student Break Departure', description: 'Senior students leaving campus at the beginning of a break.' },
    { code: 'FRESH_BREAK_DEPARTURE', name: 'Fresh Student Break Departure', description: 'Fresh students leaving campus at the beginning of a break.' },
    { code: 'SENIOR_BREAK_RETURN', name: 'Senior Student Break Return', description: 'Senior students returning from break to campus.' },
    { code: 'FRESH_BREAK_RETURN', name: 'Fresh Student Break Return', description: 'Fresh students returning from break to campus.' },
    { code: 'HOME_TOWN_DEPARTURE', name: 'Home-Town Departure', description: 'Campus to a home town or another area when students travel home.' },
    { code: 'TRAIN_ARRIVAL_CAMPUS', name: 'Train Arrival → Campus', description: 'Passengers arriving at the Train Station and travelling to campus.' },
    { code: 'CAMPUS_TRAIN_STATION', name: 'Campus → Train Station', description: 'Passengers leaving campus to travel to the Train Station.' },
    { code: 'SPECIAL_EVENT', name: 'Special / Event Trip', description: 'Graduation, special university events, exceptional demand, or other Admin-approved transportation.' },
  ];

  for (const purpose of tripPurposes) {
    const existing = await orm.TripPurpose.where({ code: purpose.code }).first();
    if (!existing) {
      await orm.TripPurpose.create({ ...purpose, isActive: true });
      console.log(`Created trip purpose: ${purpose.name}`);
    }
  }

  // Vehicles
  const vehiclesData = [
    { name: 'HU Bus 01 (Higer)', plateNumber: 'ET-3-1001', seatCapacity: 60 },
    { name: 'HU Bus 02 (Higer)', plateNumber: 'ET-3-1002', seatCapacity: 60 },
    { name: 'HU Bus 03 (Yutong)', plateNumber: 'ET-3-1003', seatCapacity: 60 },
    { name: 'HU Coaster 01 (Toyota)', plateNumber: 'ET-3-2001', seatCapacity: 30 },
    { name: 'HU Minibus 01 (Toyota)', plateNumber: 'ET-3-3001', seatCapacity: 14 },
  ];

  const vehicleMap = new Map();
  for (const v of vehiclesData) {
    let vehicle = await orm.Vehicle.where({ plateNumber: v.plateNumber }).first();
    if (!vehicle) {
      vehicle = await orm.Vehicle.create({
        name: v.name,
        plateNumber: v.plateNumber,
        seatCapacity: v.seatCapacity,
        isActive: true,
      });
      console.log(`Created vehicle: ${v.name} (${v.plateNumber})`);
    } else {
      console.log(`Found vehicle: ${v.name} (${v.plateNumber})`);
    }
    vehicleMap.set(v.plateNumber, vehicle);
  }

  // Create only the locally configured administrator. Operational records are managed in the app.
  let adminAccount = await orm.Account.where({ email: adminEmail }).first();
  if (!adminAccount) {
    adminAccount = await orm.Account.create({
      email: adminEmail,
      fullName: process.env.SEED_ADMIN_NAME?.trim() || 'Transport Admin',
      phone: null,
      role: 'ADMIN',
      isActive: true,
      passwordHash: await hashPassword(adminPassword),
    });
    console.log(`Created local administrator account: ${adminEmail}`);
  }
  console.log('Transportation reference data and local administrator are ready. Create events and trips in the application.');
}

seed()
  .catch((err) => {
    console.error('Seeding failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await db.close();
  });
