#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/6a0a1b941ff56f62002c7fd7a2fe16ee324bc740ebde1fffa12752425b26a954/contract';
import endContract from '../../snapshots/6a0a1b941ff56f62002c7fd7a2fe16ee324bc740ebde1fffa12752425b26a954/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/70e00256faba85048a27cd613b16814f0cde64c19bb71d5f908dcb2f40df84f9/contract';
import startContract from '../../snapshots/70e00256faba85048a27cd613b16814f0cde64c19bb71d5f908dcb2f40df84f9/contract.json' with { type: 'json' };
import postgres from '@prisma/orm-postgres/runtime';
import { contractFromJson } from '@prisma/orm-postgres/static';
import {
  Migration,
  MigrationCLI,
  col,
  fn,
  lit,
  primaryKey,
  sql,
} from '@prisma/orm-postgres/migration';

const client = postgres({ contract: contractFromJson<End>(endContract) });
const { contract } = client;

const pendingQuery = (statement: ReturnType<typeof client.raw.sql>) =>
  statement.returnsRow({ code: { codecId: 'pg/text@1', nullable: false } }).build();

const execute = (statement: ReturnType<typeof client.raw.sql>) =>
  statement.affectedCount().build();

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      ...this.renameColumn({
        schema: 'public',
        table: 'Route',
        column: 'originCampusId',
        to: 'originLocationId',
      }),
      ...this.renameColumn({
        schema: 'public',
        table: 'Route',
        column: 'destinationId',
        to: 'destinationLocationId',
      }),
      ...this.renameColumn({
        schema: 'public',
        table: 'Trip',
        column: 'originCampusId',
        to: 'originLocationId',
      }),
      this.dropConstraint({
        schema: 'public',
        table: 'Route',
        constraint: 'Route_originLocationId_fkey',
        kind: 'foreignKey',
      }),
      this.dropConstraint({
        schema: 'public',
        table: 'Trip',
        constraint: 'Trip_originLocationId_fkey',
        kind: 'foreignKey',
      }),
      this.createTable({
        schema: 'public',
        table: 'TripPurpose',
        columns: [
          col('code', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('isActive', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addColumn({
        schema: 'public',
        table: 'Destination',
        column: col('kind', 'text', {
          notNull: true,
          default: lit('EXTERNAL'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'DemandRequest',
        column: col('destinationLocationId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.dataTransform(contract, 'backfill-DemandRequest-destinationLocationId', {
        backfillsColumn: {
          schema: 'public',
          table: 'DemandRequest',
          column: 'destinationLocationId',
        },
        check: () => pendingQuery(client.raw.sql`
          SELECT 'pending'::text AS "code"
          WHERE
            EXISTS (SELECT 1 FROM "Campus" c LEFT JOIN "Destination" l ON l."code" = c."code" WHERE l."id" IS NULL)
            OR EXISTS (
              SELECT required."code" FROM (VALUES ('FIN'), ('MAIN'), ('HIT'), ('STATION'), ('TRN'), ('ADA'), ('CHI'), ('JIJ')) AS required("code")
              WHERE NOT EXISTS (SELECT 1 FROM "Destination" l WHERE l."code" = required."code")
            )
            OR EXISTS (SELECT 1 FROM "Destination" WHERE "code" = 'FIN' AND ("name" <> 'Finfinne' OR "kind" <> 'EXTERNAL'))
            OR EXISTS (SELECT 1 FROM "Destination" WHERE "code" = 'MAIN' AND ("name" <> 'Main Campus' OR "kind" <> 'CAMPUS'))
            OR EXISTS (SELECT 1 FROM "Destination" WHERE "code" = 'HIT' AND ("name" <> 'HIT' OR "kind" <> 'CAMPUS'))
            OR EXISTS (SELECT 1 FROM "Destination" WHERE "code" = 'STATION' AND ("name" <> 'Station' OR "kind" <> 'CAMPUS'))
            OR EXISTS (SELECT 1 FROM "Destination" WHERE "code" = 'TRN' AND ("name" <> 'Train Station' OR "kind" <> 'EXTERNAL'))
            OR EXISTS (SELECT 1 FROM "Destination" WHERE "code" = 'ADA' AND ("name" <> 'Adama' OR "kind" <> 'EXTERNAL'))
            OR EXISTS (SELECT 1 FROM "Destination" WHERE "code" = 'CHI' AND ("name" <> 'Chiro' OR "kind" <> 'EXTERNAL'))
            OR EXISTS (SELECT 1 FROM "Destination" WHERE "code" = 'JIJ' AND ("name" <> 'Jijiga' OR "kind" <> 'EXTERNAL'))
            OR EXISTS (
              SELECT required."code" FROM (VALUES ('SENIOR_STUDENT_ARRIVAL'), ('FRESH_STUDENT_ARRIVAL'), ('SENIOR_BREAK_DEPARTURE'), ('FRESH_BREAK_DEPARTURE'), ('SENIOR_BREAK_RETURN'), ('FRESH_BREAK_RETURN'), ('HOME_TOWN_DEPARTURE'), ('TRAIN_ARRIVAL_CAMPUS'), ('CAMPUS_TRAIN_STATION'), ('SPECIAL_EVENT')) AS required("code")
              WHERE NOT EXISTS (SELECT 1 FROM "TripPurpose" p WHERE p."code" = required."code")
            )
            OR EXISTS (SELECT 1 FROM "Route" r JOIN "Campus" c ON c."id" = r."originLocationId" JOIN "Destination" l ON l."code" = c."code" WHERE r."originLocationId" <> l."id")
            OR EXISTS (SELECT 1 FROM "Trip" t JOIN "Campus" c ON c."id" = t."originLocationId" JOIN "Destination" l ON l."code" = c."code" WHERE t."originLocationId" <> l."id")
            OR EXISTS (SELECT 1 FROM "DemandRequest" WHERE "destinationLocationId" IS NULL)
        `),
        run: [
          () => execute(client.raw.sql`
            INSERT INTO "Destination" ("id", "name", "code", "kind", "isActive", "createdAt", "updatedAt")
            SELECT
              CASE
                WHEN EXISTS (SELECT 1 FROM "Destination" existing WHERE existing."id" = c."id")
                  THEN gen_random_uuid()::text
                ELSE c."id"
              END,
              c."name",
              c."code",
              'CAMPUS',
              c."isActive",
              c."createdAt",
              c."updatedAt"
            FROM "Campus" c
            WHERE NOT EXISTS (SELECT 1 FROM "Destination" l WHERE l."code" = c."code")
            ON CONFLICT ("code") DO NOTHING
          `),
          () => execute(client.raw.sql`
            UPDATE "Destination" d
            SET
              "name" = CASE WHEN c."updatedAt" > d."updatedAt" THEN c."name" ELSE d."name" END,
              "isActive" = d."isActive" AND c."isActive",
              "createdAt" = LEAST(d."createdAt", c."createdAt"),
              "updatedAt" = GREATEST(d."updatedAt", c."updatedAt")
            FROM "Campus" c
            WHERE d."code" = c."code"
          `),
          () => execute(client.raw.sql`
            INSERT INTO "Destination" ("id", "name", "code", "kind", "isActive", "createdAt", "updatedAt") VALUES
              ('00000000-0000-7000-8000-000000000001', 'Finfinne', 'FIN', 'EXTERNAL', TRUE, now(), now()),
              ('00000000-0000-7000-8000-000000000002', 'Main Campus', 'MAIN', 'CAMPUS', TRUE, now(), now()),
              ('00000000-0000-7000-8000-000000000003', 'HIT', 'HIT', 'CAMPUS', TRUE, now(), now()),
              ('00000000-0000-7000-8000-000000000004', 'Station', 'STATION', 'CAMPUS', TRUE, now(), now()),
              ('00000000-0000-7000-8000-000000000005', 'Train Station', 'TRN', 'EXTERNAL', TRUE, now(), now()),
              ('00000000-0000-7000-8000-000000000006', 'Adama', 'ADA', 'EXTERNAL', TRUE, now(), now()),
              ('00000000-0000-7000-8000-000000000007', 'Chiro', 'CHI', 'EXTERNAL', TRUE, now(), now()),
              ('00000000-0000-7000-8000-000000000008', 'Jijiga', 'JIJ', 'EXTERNAL', TRUE, now(), now())
            ON CONFLICT ("code") DO UPDATE SET
              "name" = EXCLUDED."name",
              "kind" = EXCLUDED."kind"
          `),
          () => execute(client.raw.sql`
            INSERT INTO "TripPurpose" ("id", "code", "name", "description", "isActive", "createdAt", "updatedAt") VALUES
              ('00000000-0000-7000-8000-000000000101', 'SENIOR_STUDENT_ARRIVAL', 'Senior Student Arrival', 'Senior students coming from another area to campus.', TRUE, now(), now()),
              ('00000000-0000-7000-8000-000000000102', 'FRESH_STUDENT_ARRIVAL', 'Fresh Student Arrival', 'Fresh or new students coming from another area to campus.', TRUE, now(), now()),
              ('00000000-0000-7000-8000-000000000103', 'SENIOR_BREAK_DEPARTURE', 'Senior Student Break Departure', 'Senior students leaving campus at the beginning of a break.', TRUE, now(), now()),
              ('00000000-0000-7000-8000-000000000104', 'FRESH_BREAK_DEPARTURE', 'Fresh Student Break Departure', 'Fresh students leaving campus at the beginning of a break.', TRUE, now(), now()),
              ('00000000-0000-7000-8000-000000000105', 'SENIOR_BREAK_RETURN', 'Senior Student Break Return', 'Senior students returning from break to campus.', TRUE, now(), now()),
              ('00000000-0000-7000-8000-000000000106', 'FRESH_BREAK_RETURN', 'Fresh Student Break Return', 'Fresh students returning from break to campus.', TRUE, now(), now()),
              ('00000000-0000-7000-8000-000000000107', 'HOME_TOWN_DEPARTURE', 'Home-Town Departure', 'Campus to a home town or another area when students travel home.', TRUE, now(), now()),
              ('00000000-0000-7000-8000-000000000108', 'TRAIN_ARRIVAL_CAMPUS', 'Train Arrival → Campus', 'Passengers arriving at the Train Station and travelling to campus.', TRUE, now(), now()),
              ('00000000-0000-7000-8000-000000000109', 'CAMPUS_TRAIN_STATION', 'Campus → Train Station', 'Passengers leaving campus to travel to the Train Station.', TRUE, now(), now()),
              ('00000000-0000-7000-8000-000000000110', 'SPECIAL_EVENT', 'Special / Event Trip', 'Graduation, special university events, exceptional demand, or other Admin-approved transportation.', TRUE, now(), now())
            ON CONFLICT ("id") DO NOTHING
          `),
          () => execute(client.raw.sql`
            UPDATE "Route" r SET "originLocationId" = l."id"
            FROM "Campus" c JOIN "Destination" l ON l."code" = c."code"
            WHERE r."originLocationId" = c."id" AND r."originLocationId" <> l."id"
          `),
          () => execute(client.raw.sql`
            UPDATE "Trip" t SET "originLocationId" = l."id"
            FROM "Campus" c JOIN "Destination" l ON l."code" = c."code"
            WHERE t."originLocationId" = c."id" AND t."originLocationId" <> l."id"
          `),
          () => execute(client.raw.sql`
            UPDATE "DemandRequest" d SET "destinationLocationId" = r."destinationLocationId"
            FROM "Route" r
            WHERE d."routeId" = r."id" AND d."destinationLocationId" IS NULL
          `),
        ],
      }),
      this.dropTable({ schema: 'public', table: 'Campus' }),
      this.setNotNull({
        schema: 'public',
        table: 'DemandRequest',
        column: 'destinationLocationId',
      }),
      this.addColumn({
        schema: 'public',
        table: 'DemandRequest',
        column: col('originLocationId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.dataTransform(contract, 'backfill-DemandRequest-originLocationId', {
        backfillsColumn: { schema: 'public', table: 'DemandRequest', column: 'originLocationId' },
        check: () => pendingQuery(client.raw.sql`
          SELECT 'pending'::text AS "code" WHERE EXISTS (SELECT 1 FROM "DemandRequest" WHERE "originLocationId" IS NULL)
        `),
        run: () => execute(client.raw.sql`
          UPDATE "DemandRequest" d SET "originLocationId" = r."originLocationId"
          FROM "Route" r WHERE d."routeId" = r."id" AND d."originLocationId" IS NULL
        `),
      }),
      this.setNotNull({ schema: 'public', table: 'DemandRequest', column: 'originLocationId' }),
      this.addColumn({
        schema: 'public',
        table: 'Trip',
        column: col('destinationLocationId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.dataTransform(contract, 'backfill-Trip-destinationLocationId', {
        backfillsColumn: { schema: 'public', table: 'Trip', column: 'destinationLocationId' },
        check: () => pendingQuery(client.raw.sql`
          SELECT 'pending'::text AS "code" WHERE EXISTS (SELECT 1 FROM "Trip" WHERE "destinationLocationId" IS NULL)
        `),
        run: () => execute(client.raw.sql`
          UPDATE "Trip" t SET "destinationLocationId" = r."destinationLocationId"
          FROM "Route" r WHERE t."routeId" = r."id" AND t."destinationLocationId" IS NULL
        `),
      }),
      this.setNotNull({ schema: 'public', table: 'Trip', column: 'destinationLocationId' }),
      this.addColumn({
        schema: 'public',
        table: 'Trip',
        column: col('purposeId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.dataTransform(contract, 'backfill-Trip-purposeId', {
        backfillsColumn: { schema: 'public', table: 'Trip', column: 'purposeId' },
        check: () => pendingQuery(client.raw.sql`
          SELECT 'pending'::text AS "code" WHERE EXISTS (SELECT 1 FROM "Trip" WHERE "purposeId" IS NULL)
        `),
        run: () => execute(client.raw.sql`
          UPDATE "Trip" SET "purposeId" = '00000000-0000-7000-8000-000000000110' WHERE "purposeId" IS NULL
        `),
      }),
      this.setNotNull({ schema: 'public', table: 'Trip', column: 'purposeId' }),
      this.dropNotNull({ schema: 'public', table: 'DemandRequest', column: 'routeId' }),
      this.dropNotNull({ schema: 'public', table: 'Trip', column: 'routeId' }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'Destination',
        constraint: 'Destination_kind_check_dabea381',
        expression: sql`"kind" IN ('CAMPUS', 'EXTERNAL')`,
      }),
      this.addUnique({
        schema: 'public',
        table: 'TripPurpose',
        constraint: 'TripPurpose_code_key',
        columns: ['code'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'DemandRequest',
        index: 'DemandRequest_destinationLocationId_idx_307b052b',
        columns: ['destinationLocationId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'DemandRequest',
        index: 'DemandRequest_originLocationId_idx_e5686e06',
        columns: ['originLocationId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'DemandRequest',
        index: 'demand_location_date_0975cc9f',
        columns: ['originLocationId', 'destinationLocationId', 'travelDate'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Trip',
        index: 'Trip_destinationLocationId_idx_307b052b',
        columns: ['destinationLocationId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Trip',
        index: 'Trip_originLocationId_destinationLocationId_idx_3ddde4f7',
        columns: ['originLocationId', 'destinationLocationId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Trip',
        index: 'Trip_purposeId_idx_6b9d8485',
        columns: ['purposeId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'DemandRequest',
        foreignKey: {
          name: 'DemandRequest_destinationLocationId_fkey',
          columns: ['destinationLocationId'],
          references: { schema: 'public', table: 'Destination', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'DemandRequest',
        foreignKey: {
          name: 'DemandRequest_originLocationId_fkey',
          columns: ['originLocationId'],
          references: { schema: 'public', table: 'Destination', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Route',
        foreignKey: {
          name: 'Route_originLocationId_fkey',
          columns: ['originLocationId'],
          references: { schema: 'public', table: 'Destination', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Trip',
        foreignKey: {
          name: 'Trip_destinationLocationId_fkey',
          columns: ['destinationLocationId'],
          references: { schema: 'public', table: 'Destination', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Trip',
        foreignKey: {
          name: 'Trip_originLocationId_fkey',
          columns: ['originLocationId'],
          references: { schema: 'public', table: 'Destination', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Trip',
        foreignKey: {
          name: 'Trip_purposeId_fkey',
          columns: ['purposeId'],
          references: { schema: 'public', table: 'TripPurpose', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
