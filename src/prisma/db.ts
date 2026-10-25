import 'dotenv/config';
import postgres from '@prisma/orm-postgres/runtime';
import { contractFromJson } from '@prisma/orm-postgres/static';
import type { Contract } from './contract.d';
import contractJson from './contract.json' with { type: 'json' };

const databaseUrl = process.env['DATABASE_URL'];
if (!databaseUrl) throw new Error('DATABASE_URL is required');
if (new URL(databaseUrl).pathname.slice(1).toLowerCase() === 'clinic_db') {
  throw new Error('Refusing to connect the transportation app to clinic_db');
}

export const contract = contractFromJson<Contract>(contractJson);

export const db = postgres({
  contract,
  url: databaseUrl,
});
