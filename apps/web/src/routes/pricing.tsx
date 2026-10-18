import { createFileRoute, Link } from "@tanstack/react-router"
import { ArrowRight, KeyRound, ShieldCheck, Wallet } from "lucide-react"

export const Route = createFileRoute("/pricing")({ component: PricingPage })

function PricingPage() {
  return (
    <main className="page-shell max-w-5xl">
      <header className="mx-auto mb-12 max-w-3xl text-center">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border" style={{ background: "var(--app-indigo-10)", borderColor: "var(--app-indigo-20)", color: "var(--app-indigo)" }}>
          <Wallet size={21} />
        </div>
        <p className="page-eyebrow mb-3">Bring your own key</p>
        <h1 className="page-title mb-4">
          Practice with a model you choose
        </h1>
        <p className="page-description mx-auto">
          Hello Design uses a bring-your-own-key model. There are no platform AI credits or
          subscriptions to manage. You choose the provider and model, and pay that provider directly.
        </p>
      </header>

      <section className="mb-8 grid gap-4 md:grid-cols-3">
        {[
          { icon: <KeyRound size={18} />, title: "Connect a provider", text: "Add an OpenAI or OpenAI-compatible API key in Settings. OpenRouter is preconfigured." },
          { icon: <Wallet size={18} />, title: "You control spend", text: "AI requests are billed by your provider under your account and its current pricing." },
          { icon: <ShieldCheck size={18} />, title: "Encrypted at rest", text: "Saved keys are encrypted in Hello Design and used by the server to run your evaluations." },
        ].map((item) => (
          <article
            key={item.title}
            className="surface-card rounded-2xl p-6"
          >
            <div className="mb-3" style={{ color: "var(--app-indigo)" }}>{item.icon}</div>
            <h2 className="mb-2 text-sm font-bold" style={{ color: "var(--app-fg)" }}>{item.title}</h2>
            <p className="text-sm leading-relaxed" style={{ color: "var(--app-subtle)" }}>{item.text}</p>
          </article>
        ))}
      </section>

      <aside className="surface-panel mb-8 flex gap-3 p-5 text-sm leading-relaxed" style={{ color: "var(--app-subtle)" }}>
        <ShieldCheck size={17} className="mt-0.5 shrink-0" style={{ color: "var(--app-indigo)" }} />
        <span>
        Key storage is optional for browsing and writing. To run an AI evaluation, save a key in
        Settings first. Guest keys and submissions stay tied to the guest browser session. Signed-in
        activity is saved to your account; existing guest activity is not migrated automatically.
        </span>
      </aside>

      <div className="text-center">
        <Link
          to="/settings"
          className="btn btn-primary inline-flex gap-2 px-5"
        >
          Configure your key <ArrowRight size={14} />
        </Link>
      </div>
    </main>
  )
}
