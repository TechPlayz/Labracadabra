"use client";

import React, { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log client error for debugging
    console.error("Labracadabra Runtime Error:", error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-error-soft border border-error-ink/20 flex items-center justify-center mb-5 text-error-ink">
        <AlertTriangle className="w-7 h-7" />
      </div>

      <h2 className="text-2xl font-semibold text-ink mb-2">
        This view could not load
      </h2>
      <p className="text-xs text-quiet max-w-md mb-6 leading-relaxed">
        An error occurred while loading this campus resource view. You can reload the view or return to the main dashboard.
      </p>

      <div className="flex items-center gap-3">
        <Button
          onClick={() => reset()}
          variant="primary"
          size="sm"
          leftIcon={<RefreshCw className="w-4 h-4" />}
        >
          Retry View
        </Button>
        <Button
          href="/"
          variant="secondary"
          size="sm"
          leftIcon={<Home className="w-4 h-4" />}
        >
          Dashboard
        </Button>
      </div>
    </div>
  );
}
