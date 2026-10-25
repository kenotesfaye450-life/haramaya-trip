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

  // 1. All transportation network locations (used as both origins and destinations)
  const allLocations = [
    { name: 'Main Campus', code: 'MAIN' },
    { name: 'HIT Campus', code: 'HIT' },
    { name: 'Station Campus', code: 'STATION' },
    { name: 'Finfinne (Addis Ababa)', code: 'FIN' },
    { name: 'Adama', code: 'ADA' },
    { name: 'Train Station (Dire Dawa)', code: 'TRN' },
    { name: 'Dire Dawa City', code: 'DIR' },
    { name: 'Harar City', code: 'HAR' },
  ];

  // Seed Campus table (Origins)
  const campusMap = new Map();
  for (const loc of allLocations) {
    let campus = await orm.Campus.where({ code: loc.code }).first();
    if (!campus) {
      campus = await orm.Campus.create({ name: loc.name, code: loc.code, isActive: true });
      console.log(`Created origin location (Campus): ${loc.name} (${loc.code})`);
    } else {
      campusMap.set(loc.code, campus);
    }
    campusMap.set(loc.code, campus);
  }

  // Seed Destination table (Arrivals)
  const destMap = new Map();
  for (const loc of allLocations) {
    let dest = await orm.Destination.where({ code: loc.code }).first();
    if (!dest) {
      dest = await orm.Destination.create({ name: loc.name, code: loc.code, isActive: true });
      console.log(`Created destination location: ${loc.name} (${loc.code})`);
    } else {
      destMap.set(loc.code, dest);
    }
    destMap.set(loc.code, dest);
  }

  // 2. Bidirectional Routes (Departing from University & Returning to University)
  const routesData = [
    // Outbound from University
    { name: 'Main Campus to Finfinne', from: 'MAIN', to: 'FIN' },
    { name: 'Main Campus to Adama', from: 'MAIN', to: 'ADA' },
    { name: 'Station Campus to Train Station', from: 'STATION', to: 'TRN' },
    { name: 'HIT Campus to Finfinne', from: 'HIT', to: 'FIN' },
    { name: 'Main Campus to Harar City', from: 'MAIN', to: 'HAR' },
    { name: 'Main Campus to Dire Dawa City', from: 'MAIN', to: 'DIR' },

    // Return to University
    { name: 'Finfinne to Main Campus', from: 'FIN', to: 'MAIN' },
    { name: 'Adama to Main Campus', from: 'ADA', to: 'MAIN' },
    { name: 'Train Station to Station Campus', from: 'TRN', to: 'STATION' },
    { name: 'Finfinne to HIT Campus', from: 'FIN', to: 'HIT' },
    { name: 'Harar City to Main Campus', from: 'HAR', to: 'MAIN' },
    { name: 'Dire Dawa City to Main Campus', from: 'DIR', to: 'MAIN' },
  ];

  for (const r of routesData) {
    const origin = campusMap.get(r.from);
    const dest = destMap.get(r.to);
    if (!origin || !dest) continue;

    let route = await orm.Route.where({
      originCampusId: origin.id,
      destinationId: dest.id,
    }).first();

    if (!route) {
      route = await orm.Route.create({
        name: r.name,
        originCampusId: origin.id,
        destinationId: dest.id,
        isActive: true,
      });
      console.log(`Created route: ${r.name}`);
    } else {
      console.log(`Found route: ${r.name}`);
    }
  }

  // 3. Vehicles
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
