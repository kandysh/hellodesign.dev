import { Link } from "@tanstack/react-router"

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
      <svg x="3" y="3" width="26" height="26" viewBox="0 -960 960 960" aria-hidden="true">
        <path
          d="M600-80v-100L320-320H120v-240h172l108-124v-196h240v240H468L360-516v126l240 120v-50h240v240H600ZM480-720h80v-80h-80v80ZM200-400h80v-80h-80v80Zm480 240h80v-80h-80v80Z"
          fill="var(--app-indigo)"
        />
      </svg>
    </svg>
  )
}

export function Footer() {
  return (
    <footer
      className="w-full border-t mt-auto"
      style={{ background: "var(--app-bg-elevated)", borderColor: "var(--app-border-2)" }}
    >
      <div className="mx-auto flex max-w-[1440px] flex-col items-center justify-between gap-5 px-6 py-8 md:flex-row">
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
            { label: "Documentation", to: "/docs" as const },
            { label: "API Reference", to: "/docs" as const, hash: "api-reference" },
            { label: "Terms of Service", to: "/legal" as const, hash: "terms" },
            { label: "Privacy Policy", to: "/legal" as const, hash: "privacy" },
          ].map(({ label, to, hash }) => (
            <Link
              key={label}
              to={to}
              hash={hash}
              className="transition-colors"
              style={{ color: "var(--app-muted)" }}
              onMouseEnter={(e) => {
                ;(e.currentTarget as HTMLElement).style.color = "var(--app-fg)"
              }}
              onMouseLeave={(e) => {
                ;(e.currentTarget as HTMLElement).style.color = "var(--app-muted)"
              }}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  )
}
