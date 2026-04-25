import { createFileRoute, Link } from "@tanstack/react-router"
import { CheckCircle2, XCircle, Sparkles, Zap, Shield, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"

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
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs text-primary">
          <Sparkles size={12} />
          Unlock advanced AI evaluation
        </div>
        <h1 className="mb-3 text-4xl font-extrabold tracking-tight md:text-5xl">
          Upgrade to{" "}
          <span className="text-primary">ArchMaster</span>
        </h1>
        <p className="mx-auto max-w-xl text-base-content/50 leading-relaxed">
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
        <h2 className="mb-6 text-center text-xl font-bold tracking-tight">Compare plans</h2>
        <div className="overflow-hidden rounded-xl border border-base-300/40">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-base-300/40 bg-base-200/60">
                <th className="px-5 py-3.5 text-left font-medium text-base-content/60">Feature</th>
                {TIERS.map((t) => (
                  <th key={t.id} className={cn("px-4 py-3.5 text-center font-semibold", t.popular ? "text-primary" : "")}>
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
                  className={cn("border-b border-base-300/40 last:border-0", i % 2 === 0 ? "bg-base-200/20" : "")}
                >
                  <td className="px-5 py-3 text-base-content/70">{feature}</td>
                  <td className="px-4 py-3 text-center text-xs text-base-content/50">
                    {feature === "AI Interviews" ? "5 / mo" : <XCircle size={14} className="mx-auto text-base-content/25" />}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {["AI Interviews", "Cloud Sync", "Private Solutions", "Advanced Metrics"].includes(feature) ? (
                      feature === "AI Interviews" ? <span className="text-xs font-medium text-primary">Unlimited</span> : <CheckCircle2 size={14} className="mx-auto text-success" />
                    ) : (
                      <XCircle size={14} className="mx-auto text-base-content/25" />
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <CheckCircle2 size={14} className="mx-auto text-success" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Security notice ───────────────────────────────────── */}
      <div className="mb-12 flex items-center justify-center gap-2 text-xs text-base-content/40">
        <Shield size={12} />
        Secure 256-bit encryption. Cancel anytime from your settings.
      </div>

      {/* ── FAQ ──────────────────────────────────────────────── */}
      <section>
        <h2 className="mb-6 text-center text-xl font-bold tracking-tight">Frequently asked questions</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {FAQS.map((faq) => (
            <div
              key={faq.q}
              className="rounded-xl border border-base-300/40 bg-base-200/50 p-5"
            >
              <p className="mb-2 font-semibold text-sm">{faq.q}</p>
              <p className="text-sm text-base-content/60 leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Bottom CTA ───────────────────────────────────────── */}
      <div className="mt-12 rounded-2xl border border-primary/20 bg-primary/5 p-8 text-center">
        <Zap size={24} className="mx-auto mb-3 text-primary" />
        <h3 className="mb-2 text-xl font-bold">Ready to level up your designs?</h3>
        <p className="mb-5 text-sm text-base-content/50">
          Join engineers at top companies who use ArchMaster to ace system design interviews.
        </p>
        <Link
          to="/questions"
          className="btn btn-primary rounded-lg gap-2 shadow-lg shadow-primary/20"
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
      className={cn(
        "relative flex flex-col rounded-2xl border p-6 transition-default",
        tier.popular
          ? "border-primary/40 bg-primary/5 shadow-lg shadow-primary/10"
          : "border-base-300/40 bg-base-200/50",
      )}
    >
      {tier.popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="rounded-full border border-primary/30 bg-primary/20 px-3 py-0.5 text-[11px] font-semibold text-primary uppercase tracking-wide">
            Most Popular
          </span>
        </div>
      )}

      {/* Header */}
      <div className="mb-5">
        <p className="mb-1 text-sm font-semibold uppercase tracking-wide text-base-content/60">{tier.name}</p>
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-extrabold tracking-tight">{tier.price}</span>
          <span className="text-sm text-base-content/50">{tier.period}</span>
        </div>
        <p className="mt-2 text-sm text-base-content/60 leading-relaxed">{tier.description}</p>
      </div>

      {/* Features */}
      <ul className="mb-6 flex-1 space-y-2.5">
        {tier.features.map((f) => (
          <li key={f.label} className="flex items-center gap-2.5 text-sm">
            {f.included ? (
              <CheckCircle2 size={14} className="shrink-0 text-success" />
            ) : (
              <XCircle size={14} className="shrink-0 text-base-content/25" />
            )}
            <span className={cn(f.included ? "text-base-content/80" : "text-base-content/40")}>
              {f.label}
            </span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      <button
        type="button"
        className={cn(
          "btn w-full rounded-xl",
          tier.ctaVariant === "primary" && "btn-primary shadow-md shadow-primary/20",
          tier.ctaVariant === "ghost" && "btn-ghost border border-base-300/60",
          tier.ctaVariant === "secondary" && "btn-secondary",
        )}
      >
        {tier.cta}
      </button>
    </div>
  )
}
