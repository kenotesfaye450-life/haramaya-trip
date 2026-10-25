import 'dotenv/config';
import { definePrismaConfig } from '@prisma/cli-engine';
import { defineConfig as ormConfig } from '@prisma/orm-postgres/config';

const databaseUrl = process.env['DATABASE_URL'];
if (!databaseUrl) throw new Error('DATABASE_URL is required');
if (new URL(databaseUrl).pathname.slice(1).toLowerCase() === 'clinic_db') {
  throw new Error('Refusing to use clinic_db for transportation schema operations');
}

export default definePrismaConfig({
  orm: ormConfig({
    contract: "./src/prisma/contract.prisma",
    db: {
      connection: databaseUrl,
    },
  }),
});
