import { LoginForm } from "@/components/auth-form";
import { FullBrandLogo } from "@/components/brand-logo";
import Link from "next/link";

export default function LoginPage() {
  return (
    <section className="mx-auto w-full max-w-md rounded-xl border border-[#DCE4EC] bg-white p-5 sm:p-7">
      <FullBrandLogo className="mx-auto mb-5 h-auto w-full max-w-[260px]" />
      <div className="mb-5 mt-7">
        <h1 className="text-2xl font-bold tracking-tight text-[#102A43]">Sign in</h1>
        <p className="mt-1 text-xs text-[#52677D]">Use your traveler account.</p>
      </div>
      <LoginForm />
      <p className="mt-5 text-center text-xs text-[#52677D]">
        New to Haramaya Trip?{" "}
        <Link href="/register" className="font-semibold text-brand-green hover:underline">
          Create account
        </Link>
      </p>
    </section>
  );
}
