import { createFileRoute, Link } from "@tanstack/react-router"
import { CheckCircle2, XCircle, Sparkles, Zap, Shield, ArrowRight } from "lucide-react"

export const Route = createFileRoute("/pricing")({ component: PricingPage })

// ── Pricing data ──────────────────────────────────────────────────────────────

interface PricingTier {
  id: string
  name: string
  price: string
  period: string
  description: string
  cta: string
  ctaVariant: "ghost" | "primary" | "secondary"
  popular?: boolean
  features: { label: string; included: boolean }[]
}

const TIERS: PricingTier[] = [
  {
    id: "architect",
    name: "Architect",
    price: "$0",
    period: "forever",
    description: "Essential tools for local system design and basic evaluations.",
    cta: "Current Plan",
    ctaVariant: "ghost",
    features: [
      { label: "5 AI Interviews / month", included: true },
      { label: "Standard Evaluation Metrics", included: true },
      { label: "Question Bank Access", included: true },
      { label: "Cloud Sync", included: false },
      { label: "Private Solutions", included: false },
      { label: "Advanced Evaluation Dimensions", included: false },
    ],
  },
  {
    id: "lead",
    name: "Lead Architect",
    price: "$49",
    period: "/ mo",
    description: "Full access to live feeds, deep metrics, and infinite evaluations.",
    cta: "Upgrade to Lead",
    ctaVariant: "primary",
    popular: true,
    features: [
      { label: "Unlimited AI Interviews", included: true },
      { label: "Advanced Evaluation Metrics", included: true },
      { label: "Question Bank Access", included: true },
      { label: "Cloud Sync (Real-time)", included: true },
      { label: "Private Solutions Workspace", included: true },
      { label: "Advanced Evaluation Dimensions", included: false },
    ],
  },
  {
    id: "cto",
    name: "CTO",
    price: "$499",
    period: "/ yr",
    description: "Enterprise-grade compliance and bulk export. Save ~15% annually.",
    cta: "Go Annual",
    ctaVariant: "secondary",
    features: [
      { label: "Everything in Lead Architect", included: true },
      { label: "Advanced Evaluation Dimensions", included: true },
      { label: "Priority Support Routing", included: true },
      { label: "Custom API Rate Limits", included: true },
      { label: "Team Licensing (up to 5)", included: true },
      { label: "Compliance Export (SOC 2)", included: true },
    ],
  },
]

// ── FAQ ───────────────────────────────────────────────────────────────────────

const FAQS = [
  {
    q: "Can I switch plans at any time?",
    a: "Yes. You can upgrade or downgrade your plan at any time. Upgrades take effect immediately; downgrades take effect at the next billing cycle.",
  },
  {
    q: "Are my API keys secure?",
    a: "Absolutely. Your API keys are encrypted with AES-256-GCM before storage and are never logged or transmitted in plaintext after the initial save.",
  },
  {
    q: "What counts as an AI Interview?",
    a: "Each practice session where you submit your design for AI evaluation counts as one interview. Viewing past results and browsing the question bank do not count.",
  },
  {
    q: "Is there a free trial for paid plans?",
    a: "The free Architect tier gives you full access to core features. Paid plans do not require a credit card to start a 7-day trial — contact us for a trial code.",
  },
]

// ── Page ──────────────────────────────────────────────────────────────────────

function PricingPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      {/* ── Hero ──────────────────────────────────────────────── */}
      <div className="mb-12 text-center">
        <div
          style={{
            background: "rgba(192,193,255,0.08)",
            border: "1px solid rgba(192,193,255,0.2)",
            color: "#c0c1ff",
          }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs mb-4"
        >
          <Sparkles size={12} />
          Unlock advanced AI evaluation
        </div>
        <h1
          style={{ color: "#dae2fd", letterSpacing: "-0.02em" }}
          className="mb-3 text-4xl font-extrabold md:text-5xl"
        >
          Upgrade to{" "}
          <span style={{ color: "#8083ff" }}>ArchMaster</span>
        </h1>
        <p style={{ color: "#908fa0" }} className="mx-auto max-w-xl leading-relaxed text-sm">
          Unlock advanced evaluation metrics, unlimited AI interviews, and secure cloud sync.
          Choose the technical tier that matches your architectural demands.
        </p>
      </div>

      {/* ── Pricing cards ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3 mb-16">
        {TIERS.map((tier) => (
          <TierCard key={tier.id} tier={tier} />
        ))}
      </div>

      {/* ── Feature comparison table ──────────────────────────── */}
      <section className="mb-16">
        <h2
          style={{ color: "#dae2fd" }}
          className="mb-6 text-center text-xl font-bold tracking-tight"
        >
          Compare plans
        </h2>
        <div
          style={{ background: "#171f33", border: "1px solid #2d3449" }}
          className="overflow-hidden rounded-xl"
        >
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "#131b2e", borderBottom: "1px solid #2d3449" }}>
                <th
                  style={{ color: "#908fa0" }}
                  className="px-5 py-3.5 text-left font-medium"
                >
                  Feature
                </th>
                {TIERS.map((t) => (
                  <th
                    key={t.id}
                    style={{ color: t.popular ? "#c0c1ff" : "#908fa0" }}
                    className="px-4 py-3.5 text-center font-semibold"
                  >
                    {t.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                "AI Interviews",
                "Cloud Sync",
                "Private Solutions",
                "Advanced Metrics",
                "Team Licensing",
                "Priority Support",
              ].map((feature, i) => (
                <tr
                  key={feature}
                  style={{
                    background: i % 2 === 0 ? "rgba(19,27,46,0.4)" : "transparent",
                    borderBottom: "1px solid #2d3449",
                  }}
                  className="last:border-0"
                >
                  <td className="px-5 py-3" style={{ color: "#908fa0" }}>
                    {feature}
                  </td>
                  <td className="px-4 py-3 text-center text-xs" style={{ color: "#464554" }}>
                    {feature === "AI Interviews" ? (
                      <span style={{ color: "#908fa0" }}>5 / mo</span>
                    ) : (
                      <XCircle size={14} className="mx-auto" style={{ color: "#464554" }} />
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {["AI Interviews", "Cloud Sync", "Private Solutions", "Advanced Metrics"].includes(feature) ? (
                      feature === "AI Interviews" ? (
                        <span className="text-xs font-medium" style={{ color: "#c0c1ff" }}>
                          Unlimited
                        </span>
                      ) : (
                        <CheckCircle2 size={14} className="mx-auto" style={{ color: "#4edea3" }} />
                      )
                    ) : (
                      <XCircle size={14} className="mx-auto" style={{ color: "#464554" }} />
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <CheckCircle2 size={14} className="mx-auto" style={{ color: "#4edea3" }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Security notice ───────────────────────────────────── */}
      <div
        className="mb-12 flex items-center justify-center gap-2 text-xs"
        style={{ color: "#464554" }}
      >
        <Shield size={12} />
        Secure 256-bit encryption. Cancel anytime from your settings.
      </div>

      {/* ── FAQ ──────────────────────────────────────────────── */}
      <section>
        <h2
          style={{ color: "#dae2fd" }}
          className="mb-6 text-center text-xl font-bold tracking-tight"
        >
          Frequently asked questions
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {FAQS.map((faq) => (
            <div
              key={faq.q}
              style={{ background: "#171f33", border: "1px solid #2d3449" }}
              className="rounded-lg p-5"
            >
              <p style={{ color: "#dae2fd" }} className="mb-2 font-semibold text-sm">
                {faq.q}
              </p>
              <p style={{ color: "#908fa0" }} className="text-sm leading-relaxed">
                {faq.a}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Bottom CTA ───────────────────────────────────────── */}
      <div
        style={{
          background: "rgba(99,102,241,0.08)",
          border: "1px solid rgba(128,131,255,0.2)",
        }}
        className="mt-12 rounded-xl p-8 text-center"
      >
        <Zap size={24} className="mx-auto mb-3" style={{ color: "#8083ff" }} />
        <h3 style={{ color: "#dae2fd" }} className="mb-2 text-xl font-bold">
          Ready to level up your designs?
        </h3>
        <p style={{ color: "#908fa0" }} className="mb-5 text-sm">
          Join engineers at top companies who use ArchMaster to ace system design interviews.
        </p>
        <Link
          to="/questions"
          style={{
            background: "#6366f1",
            color: "white",
            boxShadow: "0 0 12px rgba(99,102,241,0.3)",
          }}
          className="inline-flex items-center gap-2 px-6 py-3 rounded text-sm font-semibold transition-all active:scale-95"
        >
          Start for free <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  )
}

// ── Tier Card ─────────────────────────────────────────────────────────────────

function TierCard({ tier }: { tier: PricingTier }) {
  return (
    <div
      style={{
        background: tier.popular ? "rgba(99,102,241,0.08)" : "#171f33",
        border: tier.popular ? "1px solid rgba(128,131,255,0.4)" : "1px solid #2d3449",
        boxShadow: tier.popular ? "0 0 24px rgba(99,102,241,0.15)" : undefined,
      }}
      className="relative flex flex-col rounded-xl p-6"
    >
      {tier.popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span
            style={{
              background: "rgba(99,102,241,0.2)",
              border: "1px solid rgba(128,131,255,0.4)",
              color: "#c0c1ff",
            }}
            className="rounded-full px-3 py-0.5 text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap"
          >
            Most Popular
          </span>
        </div>
      )}

      {/* Header */}
      <div className="mb-5">
        <p
          style={{ color: "#908fa0" }}
          className="text-xs font-bold uppercase tracking-wider mb-1"
        >
          {tier.name}
        </p>
        <div className="flex items-baseline gap-1">
          <span
            style={{ color: "#dae2fd", letterSpacing: "-0.02em" }}
            className="text-4xl font-extrabold"
          >
            {tier.price}
          </span>
          <span style={{ color: "#464554" }} className="text-sm">
            {tier.period}
          </span>
        </div>
        <p style={{ color: "#908fa0" }} className="text-sm mt-2 leading-relaxed">
          {tier.description}
        </p>
      </div>

      {/* Features */}
      <ul className="mb-6 flex-1 space-y-2.5">
        {tier.features.map((f) => (
          <li key={f.label} className="flex items-center gap-2.5 text-sm">
            {f.included ? (
              <CheckCircle2 size={14} className="shrink-0" style={{ color: "#4edea3" }} />
            ) : (
              <XCircle size={14} className="shrink-0" style={{ color: "#464554" }} />
            )}
            <span style={{ color: f.included ? "#c7c4d7" : "#464554" }}>{f.label}</span>
          </li>
        ))}
      </ul>

      {/* CTA Button */}
      <button
        type="button"
        style={
          tier.ctaVariant === "primary"
            ? {
                background: "#6366f1",
                color: "white",
                border: "1px solid rgba(99,102,241,0.5)",
                boxShadow: "0 0 12px rgba(99,102,241,0.3)",
              }
            : tier.ctaVariant === "secondary"
            ? {
                background: "transparent",
                color: "#c0c1ff",
                border: "1px solid rgba(192,193,255,0.3)",
              }
            : {
                background: "transparent",
                color: "#908fa0",
                border: "1px solid #2d3449",
              }
        }
        className="w-full py-2.5 rounded text-sm font-semibold transition-all active:scale-95"
      >
        {tier.cta}
      </button>
    </div>
  )
}
