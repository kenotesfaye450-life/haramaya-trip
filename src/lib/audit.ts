import { orm } from "@/lib/db";

export async function writeAudit(input: {
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  detail?: string | null;
}) {
  await orm.AuditEvent.create({
    actorId: input.actorId ?? null,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    detail: input.detail ?? null,
  });
}
