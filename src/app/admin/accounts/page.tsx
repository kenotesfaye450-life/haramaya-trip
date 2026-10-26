import { AccountManagement } from "@/components/account-management";
import { PageHeader } from "@/components/ui";
import { requireRoleAt } from "@/lib/auth";
import { orm } from "@/lib/db";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminAccountsPage() {
  await requireRoleAt("/admin/accounts", "ADMIN");
  const accountRows = await orm.Account
    .select("id", "fullName", "email", "phone", "role", "isActive", "createdAt")
    .orderBy((account) => account.createdAt.desc())
    .limit(200)
    .all();
  const accounts = accountRows.map((account) => ({
    ...account,
    createdAt: formatDateTime(account.createdAt),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Management"
        description="Create accounts and manage roles, sign-in status, and temporary passwords."
      />
      <AccountManagement accounts={accounts} />
    </div>
  );
}
