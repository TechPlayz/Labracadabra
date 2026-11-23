"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FlaskConical } from "lucide-react";
import { useState } from "react";
import { useCampus } from "@/components/layout/CampusProvider";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export default function LoginPage() {
  const router = useRouter();
  const { submit, workspace, error } = useCampus();
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <main className="grid min-h-dvh place-items-center px-4 py-12">
      <Card className="w-full max-w-md space-y-5 p-6 sm:p-8">
        <FlaskConical className="size-8 text-violet-300" />
        <h1 className="text-3xl font-bold">Campus sign-in</h1>
        {workspace ? <Button href="/">Open workspace</Button> : (
          <form className="space-y-4" onSubmit={async (event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            setBusy(true);
            setNotice("");
            try {
              await submit({ type: "signIn", email: String(data.get("email")), password: String(data.get("password")) });
              router.replace("/");
            } catch (error) {
              setNotice(error instanceof Error ? error.message : "Unable to sign in.");
            } finally { setBusy(false); }
          }}>
            <label className="block text-sm">Campus email<input className="field mt-1" type="email" name="email" autoComplete="username" required /></label>
            <label className="block text-sm">Password<input className="field mt-1" type="password" name="password" autoComplete="current-password" required /></label>
            <Button type="submit" isLoading={busy}>Sign in</Button>
          </form>
        )}
        {(notice || (!workspace && error)) && <p role="status" className="text-sm text-amber-200">{notice || error}</p>}
        <Link href="/" className="inline-block text-sm text-violet-300">Labracadabra</Link>
      </Card>
    </main>
  );
}
