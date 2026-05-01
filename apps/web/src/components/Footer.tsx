import { Link } from "@tanstack/react-router";

function HdLogo() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="shrink-0"
    >
      <rect width="32" height="32" rx="7" fill="var(--app-surface)" />
      <svg x="3" y="3" width="26" height="26" viewBox="0 -960 960 960">
        <path
          d="M600-80v-100L320-320H120v-240h172l108-124v-196h240v240H468L360-516v126l240 120v-50h240v240H600ZM480-720h80v-80h-80v80ZM200-400h80v-80h-80v80Zm480 240h80v-80h-80v80Z"
          fill="#6366f1"
        />
      </svg>
    </svg>
  );
}

export function Footer() {
  return (
    <footer
      className="w-full border-t mt-auto"
      style={{ background: "var(--app-bg-deep)", borderColor: "#1e293b" }}
    >
      <div className="flex flex-col md:flex-row justify-between items-center py-10 px-8 max-w-[1440px] mx-auto gap-4">
        {/* Brand */}
        <div className="flex items-center gap-2">
          <HdLogo />
          <span className="text-sm font-bold" style={{ color: "var(--app-fg)" }}>
            Hello Design
          </span>
          <span className="text-sm" style={{ color: "var(--app-muted)" }}>
            · © 2026
          </span>
        </div>

        {/* Links */}
        <div className="flex flex-wrap justify-center md:justify-end gap-6 text-sm">
          {[
            "Documentation",
            "API Reference",
            "Terms of Service",
            "Privacy Policy",
          ].map((label) => (
            <Link
              key={label}
              to="/wip"
              className="transition-colors"
              style={{ color: "var(--app-muted)" }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.color = "var(--app-fg)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.color = "var(--app-muted)";
              }}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
