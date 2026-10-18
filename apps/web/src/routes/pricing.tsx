import { createFileRoute, Link } from "@tanstack/react-router"
import { ArrowRight, KeyRound, ShieldCheck, Wallet } from "lucide-react"

export const Route = createFileRoute("/pricing")({ component: PricingPage })

function PricingPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <header className="mb-12 text-center">
        <div
          className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl"
          style={{ background: "var(--app-indigo-10)", color: "var(--app-indigo)" }}
        >
          <Wallet size={22} />
        </div>
        <h1 className="mb-3 text-3xl font-extrabold" style={{ color: "var(--app-fg)" }}>
          Practice with your own AI key
        </h1>
        <p className="mx-auto max-w-2xl text-sm leading-relaxed" style={{ color: "var(--app-subtle)" }}>
          Hello Design uses a bring-your-own-key model. There are no platform AI credits or
          subscriptions to manage. You choose the provider and model, and pay that provider directly.
        </p>
      </header>

      <section className="mb-10 grid gap-4 md:grid-cols-3">
        {[
          { icon: <KeyRound size={18} />, title: "Connect a provider", text: "Add an OpenAI or OpenAI-compatible API key in Settings. OpenRouter is preconfigured." },
          { icon: <Wallet size={18} />, title: "You control spend", text: "AI requests are billed by your provider under your account and its current pricing." },
          { icon: <ShieldCheck size={18} />, title: "Encrypted at rest", text: "Saved keys are encrypted in Hello Design and used by the server to run your evaluations." },
        ].map((item) => (
          <article
            key={item.title}
            className="rounded-xl p-5"
            style={{ background: "var(--app-surface-2)", border: "1px solid var(--app-border)" }}
          >
            <div className="mb-3" style={{ color: "var(--app-indigo)" }}>{item.icon}</div>
            <h2 className="mb-2 text-sm font-bold" style={{ color: "var(--app-fg)" }}>{item.title}</h2>
            <p className="text-sm leading-relaxed" style={{ color: "var(--app-subtle)" }}>{item.text}</p>
          </article>
        ))}
      </section>

      <aside
        className="mb-10 rounded-xl p-5 text-sm leading-relaxed"
        style={{ background: "var(--app-indigo-10)", border: "1px solid var(--app-indigo-20)", color: "var(--app-subtle)" }}
      >
        Key storage is optional for browsing and writing. To run an AI evaluation, save a key in
        Settings first. Guest keys and submissions stay tied to the guest browser session. Signed-in
        activity is saved to your account; existing guest activity is not migrated automatically.
      </aside>

      <div className="text-center">
        <Link
          to="/settings"
          className="inline-flex items-center gap-2 rounded px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ background: "#6366f1", boxShadow: "0 0 12px var(--app-indigo-glow)" }}
        >
          Configure your key <ArrowRight size={14} />
        </Link>
      </div>
    </main>
  )
}
