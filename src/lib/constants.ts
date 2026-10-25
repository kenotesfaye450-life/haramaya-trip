export const SESSION_COOKIE = "hu_session";
export const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 14;

export const ROLES = ["TRAVELER", "STAFF", "ADMIN"] as const;
export type Role = (typeof ROLES)[number];

export const IDENTITY_TYPES = [
  "NATIONAL_ID",
  "STUDENT_ID",
  "PASSPORT",
  "STAFF_ID",
  "OTHER",
] as const;
export type IdentityType = (typeof IDENTITY_TYPES)[number];

export const IDENTITY_LABELS: Record<IdentityType, string> = {
  NATIONAL_ID: "National ID",
  STUDENT_ID: "Student ID",
  PASSPORT: "Passport",
  STAFF_ID: "Staff ID",
  OTHER: "Other ID",
};

export const BOOKING_STATUS_LABELS: Record<string, string> = {
  PENDING_PAYMENT: "Pending payment",
  PENDING_REVIEW: "Pending review",
  CONFIRMED: "Confirmed",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  UNPAID: "Unpaid",
  SUBMITTED: "Proof submitted",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

export const TRIP_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  PUBLISHED: "Published",
  CLOSED: "Closed",
  DEPARTED: "Departed",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export const CHECKIN_LABELS: Record<string, string> = {
  NOT_CHECKED: "Not checked",
  CHECKED_IN: "Checked in",
  NO_SHOW: "No-show",
};

export const ACTIVE_BOOKING_STATUSES = [
  "PENDING_PAYMENT",
  "PENDING_REVIEW",
  "CONFIRMED",
] as const;
