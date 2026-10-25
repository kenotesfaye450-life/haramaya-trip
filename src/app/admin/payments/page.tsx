import { getCurrentAccount } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PaymentReview } from "@/components/admin/payment-review";

export const dynamic = "force-dynamic";

export default async function AdminPaymentsPage() {
  const account = await getCurrentAccount();
  if (!account || account.role !== "ADMIN") {
    redirect("/");
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#0A0A0A]">Payment Review</h1>
        <p className="text-sm text-gray-600 mt-1">
          Review and approve payment proofs
        </p>
      </div>
      <PaymentReview />
    </div>
  );
}
