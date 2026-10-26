import { RegisterForm } from "@/components/auth-form";
import { FullBrandLogo } from "@/components/brand-logo";
import { authPageHref, safeReturnTo } from "@/lib/return-to";
import Link from "next/link";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const returnTo = safeReturnTo(params.next) || undefined;

  return (
    <section className="mx-auto w-full max-w-md rounded-xl border border-[#DCE4EC] bg-white p-5 sm:p-7">
      <FullBrandLogo className="mx-auto mb-5 h-auto w-full max-w-[260px]" />
      <div className="mb-5 mt-7">
        <h1 className="text-2xl font-bold tracking-tight text-[#102A43]">Create account</h1>
        <p className="mt-1 text-xs text-[#52677D]">One account can book for multiple passengers.</p>
      </div>
      <RegisterForm returnTo={returnTo} />
      <p className="mt-5 text-center text-xs text-[#52677D]">
        Already registered?{" "}
        <Link href={authPageHref("login", returnTo)} className="font-semibold text-[#2563EB] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">
          Sign in
        </Link>
      </p>
    </section>
  );
}
