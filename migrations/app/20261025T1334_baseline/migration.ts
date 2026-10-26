#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/70e00256faba85048a27cd613b16814f0cde64c19bb71d5f908dcb2f40df84f9/contract';
import endContract from '../../snapshots/70e00256faba85048a27cd613b16814f0cde64c19bb71d5f908dcb2f40df84f9/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  fn,
  lit,
  primaryKey,
  sql,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<never, End> {
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createSchema({ schema: 'public' }),
      this.createTable({
        schema: 'public',
        table: 'Account',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('email', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('fullName', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('isActive', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('passwordHash', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('phone', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('role', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'Account_role_check_c40efed1',
            sql`"role" IN ('TRAVELER', 'STAFF', 'ADMIN')`,
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'AuditEvent',
        columns: [
          col('action', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('actorId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('detail', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('entityId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('entityType', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'Booking',
        columns: [
          col('accountId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('partySize', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('paymentStatus', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('reference', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('rejectionReason', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('reviewedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('reviewedById', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('tripId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'Booking_paymentStatus_check_d982bdb6',
            sql`"paymentStatus" IN ('UNPAID', 'SUBMITTED', 'APPROVED', 'REJECTED')`,
          ),
          checkExpression(
            'Booking_status_check_ab23d93e',
            sql`"status" IN ('PENDING_PAYMENT', 'PENDING_REVIEW', 'CONFIRMED', 'REJECTED', 'CANCELLED')`,
          ),
          checkExpression('booking_party_positive_891887d5', sql`"partySize" > 0`),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'Campus',
        columns: [
          col('code', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
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
      this.createTable({
        schema: 'public',
        table: 'DemandRequest',
        columns: [
          col('accountId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('eventId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('note', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('passengerCount', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('routeId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('travelDate', 'date', { notNull: true, codecRef: { codecId: 'pg/date-string@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'DemandRequest_status_check_ea952804',
            sql`"status" IN ('OPEN', 'REVIEWED', 'CLOSED')`,
          ),
          checkExpression('demand_passengers_positive_3a64d135', sql`"passengerCount" > 0`),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'Destination',
        columns: [
          col('code', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
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
      this.createTable({
        schema: 'public',
        table: 'Passenger',
        columns: [
          col('bookingId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('checkInStatus', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('checkedInAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('checkedInById', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('fullName', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('identityNumber', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('identityType', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('phone', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('recordedById', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'Passenger_checkInStatus_check_56b65945',
            sql`"checkInStatus" IN ('NOT_CHECKED', 'CHECKED_IN', 'NO_SHOW')`,
          ),
          checkExpression(
            'Passenger_identityType_check_2e2cb43e',
            sql`"identityType" IN ('NATIONAL_ID', 'STUDENT_ID', 'PASSPORT', 'STAFF_ID', 'OTHER')`,
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'PaymentProof',
        columns: [
          col('bookingId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('fileName', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('mimeType', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('note', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('storageKey', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('uploadedById', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'Route',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('destinationId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('isActive', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('originCampusId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'Session',
        columns: [
          col('accountId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('expiresAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('tokenHash', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'Ticket',
        columns: [
          col('bookingId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('issuedById', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('passengerId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('publicCode', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('tokenHash', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'TravelEvent',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('endsOn', 'date', { notNull: true, codecRef: { codecId: 'pg/date-string@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('isActive', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('startsOn', 'date', { notNull: true, codecRef: { codecId: 'pg/date-string@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'Trip',
        columns: [
          col('arrivalAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('bookingDeadline', 'timestamptz', {
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('createdById', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('departureAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('eventId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('farePerSeat', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('notes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('originCampusId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('routeId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('seatCapacity', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('seatsReserved', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('status', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('vehicleId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'Trip_status_check_014991e3',
            sql`"status" IN ('DRAFT', 'PUBLISHED', 'CLOSED', 'DEPARTED', 'COMPLETED', 'CANCELLED')`,
          ),
          checkExpression('trip_capacity_positive_bb6dc7b6', sql`"seatCapacity" > 0`),
          checkExpression(
            'trip_reserved_within_capacity_eb1f4ee5',
            sql`"seatsReserved" >= 0 AND "seatsReserved" <= "seatCapacity"`,
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'Vehicle',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('isActive', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('plateNumber', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('seatCapacity', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression('vehicle_capacity_positive_bb6dc7b6', sql`"seatCapacity" > 0`),
        ],
      }),
      this.addUnique({
        schema: 'public',
        table: 'Account',
        constraint: 'Account_email_key',
        columns: ['email'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'Booking',
        constraint: 'Booking_reference_key',
        columns: ['reference'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'Campus',
        constraint: 'Campus_code_key',
        columns: ['code'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'Destination',
        constraint: 'Destination_code_key',
        columns: ['code'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'Route',
        constraint: 'Route_originCampusId_destinationId_key',
        columns: ['originCampusId', 'destinationId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'Session',
        constraint: 'Session_tokenHash_key',
        columns: ['tokenHash'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'Ticket',
        constraint: 'Ticket_passengerId_key',
        columns: ['passengerId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'Ticket',
        constraint: 'Ticket_publicCode_key',
        columns: ['publicCode'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'Ticket',
        constraint: 'Ticket_tokenHash_key',
        columns: ['tokenHash'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'Vehicle',
        constraint: 'Vehicle_plateNumber_key',
        columns: ['plateNumber'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'AuditEvent',
        index: 'AuditEvent_actorId_idx_a58f6b4b',
        columns: ['actorId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'AuditEvent',
        index: 'AuditEvent_createdAt_idx_9575dbd7',
        columns: ['createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'AuditEvent',
        index: 'AuditEvent_entityType_entityId_idx_ea0fa809',
        columns: ['entityType', 'entityId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Booking',
        index: 'Booking_accountId_idx_cbfb3085',
        columns: ['accountId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Booking',
        index: 'Booking_reviewedById_idx_e2835478',
        columns: ['reviewedById'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Booking',
        index: 'Booking_status_idx_e98638ab',
        columns: ['status'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Booking',
        index: 'Booking_tripId_idx_75da6d97',
        columns: ['tripId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'DemandRequest',
        index: 'DemandRequest_accountId_idx_cbfb3085',
        columns: ['accountId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'DemandRequest',
        index: 'DemandRequest_eventId_idx_6a266d47',
        columns: ['eventId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'DemandRequest',
        index: 'DemandRequest_routeId_idx_91ae2fd6',
        columns: ['routeId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'DemandRequest',
        index: 'DemandRequest_travelDate_idx_6e971307',
        columns: ['travelDate'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Passenger',
        index: 'Passenger_bookingId_idx_17848f4a',
        columns: ['bookingId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Passenger',
        index: 'Passenger_checkedInById_idx_eaacafcf',
        columns: ['checkedInById'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Passenger',
        index: 'Passenger_identityNumber_idx_b1661219',
        columns: ['identityNumber'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Passenger',
        index: 'Passenger_recordedById_idx_6595df66',
        columns: ['recordedById'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'PaymentProof',
        index: 'PaymentProof_bookingId_idx_17848f4a',
        columns: ['bookingId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'PaymentProof',
        index: 'PaymentProof_uploadedById_idx_b92fad21',
        columns: ['uploadedById'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Route',
        index: 'Route_destinationId_idx_1646ee5c',
        columns: ['destinationId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Route',
        index: 'Route_originCampusId_idx_c7831415',
        columns: ['originCampusId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Session',
        index: 'Session_accountId_idx_cbfb3085',
        columns: ['accountId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Ticket',
        index: 'Ticket_bookingId_idx_17848f4a',
        columns: ['bookingId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Ticket',
        index: 'Ticket_issuedById_idx_c14f1329',
        columns: ['issuedById'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Trip',
        index: 'Trip_createdById_idx_8bf640ed',
        columns: ['createdById'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Trip',
        index: 'Trip_departureAt_idx_03e68107',
        columns: ['departureAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Trip',
        index: 'Trip_eventId_idx_6a266d47',
        columns: ['eventId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Trip',
        index: 'Trip_originCampusId_idx_c7831415',
        columns: ['originCampusId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Trip',
        index: 'Trip_routeId_idx_91ae2fd6',
        columns: ['routeId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Trip',
        index: 'Trip_status_idx_e98638ab',
        columns: ['status'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Trip',
        index: 'Trip_vehicleId_idx_e2df58fc',
        columns: ['vehicleId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'AuditEvent',
        foreignKey: {
          name: 'AuditEvent_actorId_fkey',
          columns: ['actorId'],
          references: { schema: 'public', table: 'Account', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Booking',
        foreignKey: {
          name: 'Booking_accountId_fkey',
          columns: ['accountId'],
          references: { schema: 'public', table: 'Account', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Booking',
        foreignKey: {
          name: 'Booking_tripId_fkey',
          columns: ['tripId'],
          references: { schema: 'public', table: 'Trip', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Booking',
        foreignKey: {
          name: 'Booking_reviewedById_fkey',
          columns: ['reviewedById'],
          references: { schema: 'public', table: 'Account', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'DemandRequest',
        foreignKey: {
          name: 'DemandRequest_accountId_fkey',
          columns: ['accountId'],
          references: { schema: 'public', table: 'Account', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'DemandRequest',
        foreignKey: {
          name: 'DemandRequest_routeId_fkey',
          columns: ['routeId'],
          references: { schema: 'public', table: 'Route', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'DemandRequest',
        foreignKey: {
          name: 'DemandRequest_eventId_fkey',
          columns: ['eventId'],
          references: { schema: 'public', table: 'TravelEvent', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Passenger',
        foreignKey: {
          name: 'Passenger_bookingId_fkey',
          columns: ['bookingId'],
          references: { schema: 'public', table: 'Booking', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Passenger',
        foreignKey: {
          name: 'Passenger_recordedById_fkey',
          columns: ['recordedById'],
          references: { schema: 'public', table: 'Account', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Passenger',
        foreignKey: {
          name: 'Passenger_checkedInById_fkey',
          columns: ['checkedInById'],
          references: { schema: 'public', table: 'Account', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'PaymentProof',
        foreignKey: {
          name: 'PaymentProof_bookingId_fkey',
          columns: ['bookingId'],
          references: { schema: 'public', table: 'Booking', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'PaymentProof',
        foreignKey: {
          name: 'PaymentProof_uploadedById_fkey',
          columns: ['uploadedById'],
          references: { schema: 'public', table: 'Account', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Route',
        foreignKey: {
          name: 'Route_originCampusId_fkey',
          columns: ['originCampusId'],
          references: { schema: 'public', table: 'Campus', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Route',
        foreignKey: {
          name: 'Route_destinationId_fkey',
          columns: ['destinationId'],
          references: { schema: 'public', table: 'Destination', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Session',
        foreignKey: {
          name: 'Session_accountId_fkey',
          columns: ['accountId'],
          references: { schema: 'public', table: 'Account', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Ticket',
        foreignKey: {
          name: 'Ticket_bookingId_fkey',
          columns: ['bookingId'],
          references: { schema: 'public', table: 'Booking', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Ticket',
        foreignKey: {
          name: 'Ticket_passengerId_fkey',
          columns: ['passengerId'],
          references: { schema: 'public', table: 'Passenger', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Ticket',
        foreignKey: {
          name: 'Ticket_issuedById_fkey',
          columns: ['issuedById'],
          references: { schema: 'public', table: 'Account', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Trip',
        foreignKey: {
          name: 'Trip_routeId_fkey',
          columns: ['routeId'],
          references: { schema: 'public', table: 'Route', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Trip',
        foreignKey: {
          name: 'Trip_originCampusId_fkey',
          columns: ['originCampusId'],
          references: { schema: 'public', table: 'Campus', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Trip',
        foreignKey: {
          name: 'Trip_eventId_fkey',
          columns: ['eventId'],
          references: { schema: 'public', table: 'TravelEvent', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Trip',
        foreignKey: {
          name: 'Trip_vehicleId_fkey',
          columns: ['vehicleId'],
          references: { schema: 'public', table: 'Vehicle', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Trip',
        foreignKey: {
          name: 'Trip_createdById_fkey',
          columns: ['createdById'],
          references: { schema: 'public', table: 'Account', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
