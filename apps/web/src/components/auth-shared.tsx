// Shared components used by both login and register pages

import { Terminal, BookOpen, Users, Zap } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function BrandingPanel() {
  return (
    <div
      className="hidden lg:flex w-120 shrink-0 flex-col justify-between p-12 relative overflow-hidden"
      style={{ background: "#0b1326", borderRight: "1px solid #1e2a3d" }}
    >
      {/* Background Image */}
      <img
        src="/login.png"
        alt="Abstract technical architectural wireframe"
        className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-luminosity"
      />

      {/* Gradient overlay */}
      <div
        className="absolute inset-0 opacity-40 pointer-events-none"
        style={{
          background:
            "linear-gradient(135deg, rgba(128,131,255,0.15) 0%, rgba(78,222,163,0.05) 100%)",
        }}
      />

      {/* Content */}
      <div className="relative z-10">
        <div
          className="text-xl font-black tracking-tighter mb-12"
          style={{ color: "#dae2fd" }}
        >
          Hello Design
        </div>

        <div className="mb-8">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs mb-6"
            style={{
              background: "#131b2e",
              border: "1px solid #2d3449",
              color: "#c7c4d7",
              fontFamily: "'Space Grotesk', monospace",
            }}
          >
            <Terminal size={12} style={{ color: "#8083ff" }} />
            SYS.AUTH.INIT
          </div>

          <h2
            className="text-3xl font-extrabold leading-tight mb-4"
            style={{ color: "#dae2fd", letterSpacing: "-0.02em" }}
          >
            Technical Precision
            <br />
            <span style={{ color: "#8083ff" }}>in System Design.</span>
          </h2>

          <p className="text-sm leading-relaxed" style={{ color: "#908fa0" }}>
            Access the high-density environment engineered for power users,
            developers, and architects.
          </p>
        </div>
      </div>

      <div className="relative z-10">
        <p className="text-xs" style={{ color: "#2d3449" }}>
          © 2026 Hello Design. All rights reserved.
        </p>
      </div>
    </div>
  );
}

export function SocialButton({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded text-sm font-medium transition-all duration-150 active:scale-95"
      style={{
        background: "#131b2e",
        border: "1px solid #2d3449",
        color: "#c7c4d7",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "#464554";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "#2d3449";
      }}
    >
      {icon}
      {label}
    </a>
  );
}

export function Divider() {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="flex-1 h-px" style={{ background: "#2d3449" }} />
      <span className="text-xs" style={{ color: "#464554" }}>
        or continue with email
      </span>
      <div className="flex-1 h-px" style={{ background: "#2d3449" }} />
    </div>
  );
}

export function Field({
  label,
  icon,
  children,
  trailingAction,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  trailingAction?: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <p
        className="block text-xs font-bold uppercase tracking-wider"
        style={{ color: "#908fa0" }}
      >
        {label}
      </p>
      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10">
            {icon}
          </span>
        )}
        <div className={icon ? "[&_.auth-input]:pl-10" : ""}>{children}</div>
        {trailingAction}
      </div>
    </div>
  );
}

export function GoogleIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

export function RightPanel() {
  return (
    <div
      className="hidden lg:flex w-1/2 flex-col justify-end p-12 relative overflow-hidden"
      style={{
        background: "#0b1326",
        borderLeft: "1px solid #1e2a3d",
      }}
    >
      {/* Background Image */}
      <img
        alt="Abstract optical fibers and server architecture"
        src="/register.png"
        className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-luminosity"
      />

      {/* Gradient overlays */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(to top, rgba(11,19,38,0.6), rgba(11,19,38,0.3), transparent)",
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(to right, rgba(11,19,38,0.7) 0%, rgba(11,19,38,0.3) 33%, transparent)",
        }}
      />

      {/* Content */}
      <div className="relative z-10 space-y-6">
        {/* Status Badge */}
        <div
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs w-fit"
          style={{
            background: "rgba(11, 19, 38, 0.6)",
            border: "1px solid rgba(78,222,163,0.3)",
            backdropFilter: "blur(8px)",
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{
              background: "#4edea3",
              boxShadow: "0 0 8px rgba(78,222,163,0.8)",
            }}
          />
          <span
            style={{
              color: "#4edea3",
              fontFamily: "'Space Grotesk', monospace",
            }}
          >
            System Status: Optimal
          </span>
        </div>

        {/* Quote */}
        <p className="text-sm leading-relaxed" style={{ color: "#c7c4d7" }}>
          "The Hello Design infrastructure provides an uncompromising foundation
          for high-density data visualization and technical application
          development."
        </p>

        {/* Social Proof */}
        <div
          className="flex items-center gap-3 pt-4"
          style={{ borderTop: "1px solid rgba(78,222,163,0.1)" }}
        >
          {/* Avatars */}
          <div className="flex -space-x-2">
            {["A", "B", "C"].map((letter) => (
              <div
                key={letter}
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                style={{
                  background: "#131b2e",
                  border: "1px solid #2d3449",
                  color: "#dae2fd",
                }}
              >
                {letter}
              </div>
            ))}
          </div>
          {/* Text */}
          <div className="text-xs" style={{ color: "#c7c4d7" }}>
            Join{" "}
            <span style={{ color: "#dae2fd", fontWeight: 600 }}>10,000+</span>{" "}
            engineers building the future.
          </div>
        </div>
      </div>
    </div>
  );
}

export function AuthHeader() {
  return (
    <header
      className="fixed top-0 w-full z-50 border-b"
      style={{
        background: "rgba(6, 8, 20, 0.9)",
        backdropFilter: "blur(12px)",
        borderColor: "#1e293b",
      }}
    >
      <nav className="flex items-center justify-between h-16 px-6 max-w-[1440px] mx-auto">
        {/* Brand */}
        <Link
          to="/"
          className="flex items-center gap-2 text-xl font-black tracking-tighter text-slate-50 hover:text-white transition-colors duration-150 shrink-0"
        >
          <HdLogo />
          Hello Design
        </Link>

        {/* Nav links */}
        <div className="hidden md:flex items-center gap-6">
          <AuthNavLink to="/questions" label="Explore" icon={<BookOpen size={14} />} />
          <AuthNavLink to="/community" label="Community" icon={<Users size={14} />} />
          <AuthNavLink to="/pricing" label="Pricing" icon={<Zap size={14} />} />
        </div>
      </nav>
    </header>
  );
}

function AuthNavLink({ to, label, icon }: { to: string; label: string; icon?: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-1.5 text-sm font-medium text-slate-400 hover:text-indigo-400 transition-colors duration-150 active:scale-95"
    >
      {icon}
      {label}
    </Link>
  );
}

function HdLogo() {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="shrink-0"
    >
      <rect width="32" height="32" rx="7" fill="#0b1326" />
      {/* Material Symbol: polyline (outlined, FILL=1), indigo */}
      <svg x="3" y="3" width="26" height="26" viewBox="0 -960 960 960">
        <path
          d="M600-80v-100L320-320H120v-240h172l108-124v-196h240v240H468L360-516v126l240 120v-50h240v240H600ZM480-720h80v-80h-80v80ZM200-400h80v-80h-80v80Zm480 240h80v-80h-80v80Z"
          fill="#6366f1"
        />
      </svg>
    </svg>
  );
}
