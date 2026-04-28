import { createFileRoute, Link } from "@tanstack/react-router";
import { Construction } from "lucide-react";

export const Route = createFileRoute("/wip")({ component: WipPage });

function WipPage() {
  return (
    <div
      className="min-h-[calc(100vh-64px)] flex flex-col items-center justify-center gap-6 px-6 text-center"
      style={{ background: "#0b1326" }}
    >
      <div
        className="flex items-center justify-center w-16 h-16 rounded-2xl"
        style={{ background: "#131b2e", border: "1px solid #2d3449" }}
      >
        <Construction size={28} style={{ color: "#6366f1" }} />
      </div>

      <div>
        <h1
          className="text-2xl font-extrabold mb-2"
          style={{ color: "#dae2fd", letterSpacing: "-0.02em" }}
        >
          Work in Progress
        </h1>
        <p className="text-sm max-w-xs mx-auto leading-relaxed" style={{ color: "#908fa0" }}>
          This page is under construction. Check back soon.
        </p>
      </div>

      <Link
        to="/"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded text-sm font-semibold transition-colors active:scale-95"
        style={{ background: "#6366f1", color: "white", boxShadow: "0 0 12px rgba(99,102,241,0.3)" }}
      >
        Back to Home
      </Link>
    </div>
  );
}
