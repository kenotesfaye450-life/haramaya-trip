import { db } from "@/prisma/db";

export { db };

export const orm = db.orm.public;
export const enums = db.enums.public;
