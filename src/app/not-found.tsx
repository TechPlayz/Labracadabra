import React from "react";
import { FlaskConical, Home, Search } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-accent-soft border border-accent/25 flex items-center justify-center mb-6 shadow-xs text-accent-ink">
        <FlaskConical className="w-8 h-8" />
      </div>

      <span className="text-xs font-mono font-bold uppercase tracking-widest text-accent-ink mb-2">
        404 — Page Not Found
      </span>

      <h1 className="text-3xl sm:text-4xl font-semibold text-ink tracking-tight mb-3">
        Laboratory Resource Not Located
      </h1>

      <p className="text-sm text-quiet max-w-md mb-8 leading-relaxed">
        The requested path does not exist in the Labracadabra campus registry or may have been moved to another core facility.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button
          href="/"
          variant="primary"
          leftIcon={<Home className="w-4 h-4" />}
          className="font-semibold"
        >
          Return to Dashboard
        </Button>
        <Button
          href="/equipment"
          variant="secondary"
          leftIcon={<Search className="w-4 h-4" />}
        >
          Browse Equipment Catalog
        </Button>
      </div>
    </div>
  );
}
