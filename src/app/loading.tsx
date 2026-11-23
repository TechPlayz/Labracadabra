import React from "react";
import { FlaskConical, Sparkles } from "lucide-react";

export default function Loading() {
  return (
    <div className="min-h-screen bg-[#080C15] flex flex-col items-center justify-center p-6 text-center">
      <div className="relative mb-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-cyan-500 p-0.5 animate-pulse shadow-[0_0_30px_rgba(139,92,246,0.5)]">
          <div className="w-full h-full bg-[#080C15] rounded-[14px] flex items-center justify-center">
            <FlaskConical className="w-8 h-8 text-violet-400 animate-bounce" />
          </div>
        </div>
        <Sparkles className="w-4 h-4 text-cyan-300 absolute -top-1 -right-1 animate-spin" />
      </div>

      <h2 className="text-lg font-bold text-white tracking-tight">
        Loading Labracadabra...
      </h2>
      <p className="text-xs text-slate-400 mt-1 max-w-xs">
        Syncing campus laboratory instruments and real-time schedules...
      </p>
    </div>
  );
}
