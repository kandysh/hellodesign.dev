// Shared components used by both login and register pages

export function BrandingPanel() {
  return (
    <div
      className="hidden lg:flex w-[480px] shrink-0 flex-col justify-between p-12"
      style={{ background: "#0b1326", borderRight: "1px solid #1e2a3d" }}
    >
      <div>
        <div className="text-xl font-black tracking-tighter mb-12" style={{ color: "#dae2fd" }}>
          Hello Design
        </div>

        <div className="mb-8">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs mb-6"
            style={{ background: "#131b2e", border: "1px solid #2d3449", color: "#c7c4d7", fontFamily: "'Space Grotesk', monospace" }}
          >
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#4edea3" }} />
            AI Interview Platform
          </div>

          <h2
            className="text-3xl font-extrabold leading-tight mb-4"
            style={{ color: "#dae2fd", letterSpacing: "-0.02em" }}
          >
            Design systems.<br />
            <span style={{ color: "#8083ff" }}>Get evaluated.</span>
          </h2>

          <p className="text-sm leading-relaxed" style={{ color: "#908fa0" }}>
            Practice real-world architectural challenges with AI-guided evaluation
            across scalability, reliability, performance, and more.
          </p>
        </div>

        <div
          className="rounded-lg p-4 space-y-2"
          style={{ background: "#131b2e", border: "1px solid #2d3449" }}
        >
          {[
            { label: "Scalability", score: 92, color: "#4edea3" },
            { label: "Reliability", score: 88, color: "#c0c1ff" },
            { label: "Performance", score: 76, color: "#ffb4ab" },
          ].map((row) => (
            <div key={row.label} className="flex items-center gap-3">
              <span className="text-xs w-24 shrink-0" style={{ color: "#908fa0", fontFamily: "'Space Grotesk', monospace" }}>
                {row.label}
              </span>
              <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "#2d3449" }}>
                <div className="h-full rounded-full" style={{ width: `${row.score}%`, background: row.color }} />
              </div>
              <span className="text-xs w-8 text-right" style={{ color: row.color, fontFamily: "'Space Grotesk', monospace" }}>
                {row.score}
              </span>
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs" style={{ color: "#2d3449" }}>
        © 2025 Hello Design. All rights reserved.
      </p>
    </div>
  )
}

export function SocialButton({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  return (
    <a
      href={href}
      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded text-sm font-medium transition-all duration-150 active:scale-95"
      style={{ background: "#131b2e", border: "1px solid #2d3449", color: "#c7c4d7" }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#464554" }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#2d3449" }}
    >
      {icon}
      {label}
    </a>
  )
}

export function Divider() {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="flex-1 h-px" style={{ background: "#2d3449" }} />
      <span className="text-xs" style={{ color: "#464554" }}>or continue with email</span>
      <div className="flex-1 h-px" style={{ background: "#2d3449" }} />
    </div>
  )
}

export function Field({
  label,
  icon,
  children,
  trailingAction,
}: {
  label: string
  icon?: React.ReactNode
  children: React.ReactNode
  trailingAction?: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <p className="block text-xs font-bold uppercase tracking-wider" style={{ color: "#908fa0" }}>
        {label}
      </p>
      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10">{icon}</span>
        )}
        <div className={icon ? "[&_.auth-input]:pl-10" : ""}>{children}</div>
        {trailingAction}
      </div>
    </div>
  )
}

export function GoogleIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}
