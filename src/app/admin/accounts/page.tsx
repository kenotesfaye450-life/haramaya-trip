import { AccountForm } from "@/components/account-form";
import { DataTable, PageHeader, Panel, StatusBadge } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { orm } from "@/lib/db";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminAccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ editId?: string }>;
}) {
  await requireRole("ADMIN");
  const { editId } = await searchParams;

  const accounts = await orm.Account.orderBy((a) => a.createdAt.desc()).limit(200).all();
  const accountToEdit = editId ? accounts.find((a) => a.id === editId) : null;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Accounts & Role-Based Access Control"
        description="User accounts are strictly separated from passenger travel records. Manage access permissions for Administrators, Departure Desk Staff, and Travelers."
      />

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-base font-semibold tracking-tight text-zinc-950">
            Registered Accounts ({accounts.length})
          </h2>

          <DataTable headers={["Full Name", "Email", "Role", "Phone", "Status", "Registered", "Action"]}>
            {accounts.map((acc) => (
              <tr key={acc.id}>
                <td className="px-4 py-3 font-medium text-zinc-950">{acc.fullName}</td>
                <td className="px-4 py-3 text-xs text-zinc-600">{acc.email}</td>
                <td className="px-4 py-3">
                  <StatusBadge
                    tone={
                      acc.role === "ADMIN"
                        ? "danger"
                        : acc.role === "STAFF"
                        ? "warning"
                        : "neutral"
                    }
                  >
                    {acc.role}
                  </StatusBadge>
                </td>
                <td className="px-4 py-3 text-xs text-zinc-600">{acc.phone ?? "—"}</td>
                <td className="px-4 py-3">
                  <StatusBadge tone={acc.isActive ? "success" : "danger"}>
                    {acc.isActive ? "Active" : "Disabled"}
                  </StatusBadge>
                </td>
                <td className="px-4 py-3 text-xs text-zinc-400">{formatDateTime(acc.createdAt)}</td>
                <td className="px-4 py-3 text-right">
                  <a
                    href={`/admin/accounts?editId=${acc.id}`}
                    className="text-xs font-medium underline text-zinc-900"
                  >
                    Edit
                  </a>
                </td>
              </tr>
            ))}
          </DataTable>
        </div>

        <div>
          <Panel className="p-6">
            <h3 className="text-sm font-semibold text-zinc-950 mb-3">
              {accountToEdit ? `Edit: ${accountToEdit.fullName}` : "Create New Account"}
            </h3>
            <AccountForm accountToEdit={accountToEdit} />
          </Panel>
        </div>
      </div>
    </div>
  );
}
