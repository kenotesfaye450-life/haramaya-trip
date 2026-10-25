import Link from "next/link";
import { Button } from "@/components/ui/button";

export function UnauthenticatedHome() {
  return (
    <div className="max-w-xl mx-auto py-12 text-center space-y-6">
      <div className="w-12 h-12 bg-zinc-950 text-white rounded font-bold text-lg flex items-center justify-center mx-auto">
        HU
      </div>
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-950">
          Haramaya University Transportation
        </h1>
        <p className="text-sm text-zinc-600 mt-2 max-w-md mx-auto">
          Official transport booking and departure platform for students and staff.
        </p>
      </div>

      <div className="flex items-center justify-center gap-3 pt-2">
        <Button asChild size="large">
          <Link href="/login">Sign in to book</Link>
        </Button>
        <Button variant="secondary" asChild size="large">
          <Link href="/register">Create account</Link>
        </Button>
      </div>
    </div>
  );
}
