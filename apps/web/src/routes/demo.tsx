import { ScoreRing } from "@sysdesign/ui"
import { createFileRoute, Link } from "@tanstack/react-router"
import { ArrowRight, CheckCircle2, Lightbulb, LockKeyhole } from "lucide-react"

export const Route = createFileRoute("/demo")({ component: DemoPage })

const sampleScores = [
  { label: "Requirements", score: 92 },
  { label: "Scalability", score: 84 },
  { label: "Data model", score: 78 },
  { label: "Fault tolerance", score: 72 },
  { label: "Trade-offs", score: 83 },
]

function DemoPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6" style={{ color: "var(--app-fg)" }}>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p
            className="mb-2 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold text-emerald-200"
            style={{ borderColor: "var(--app-border)", background: "var(--app-surface-2)" }}
          >
            <LockKeyhole size={13} /> No account or provider key needed
          </p>
          <h1 className="text-3xl font-bold tracking-tight">Sample evaluation</h1>
          <p className="mt-2 text-sm" style={{ color: "var(--app-subtle)" }}>
            A prewritten example showing the feedback format. It does not send data to an AI
            provider.
          </p>
        </div>
        <Link
          to="/questions"
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold"
          style={{ background: "var(--app-indigo)", color: "white" }}
        >
          Browse questions <ArrowRight size={15} />
        </Link>
      </div>

      <section className="grid gap-5 md:grid-cols-[220px_1fr]">
        <div
          className="rounded-2xl border p-6"
          style={{ background: "var(--app-surface-2)", borderColor: "var(--app-border)" }}
        >
          <ScoreRing score={82} size={128} label="Sample" />
          <div className="mt-6 space-y-3">
            {sampleScores.map(({ label, score }) => (
              <div key={label} className="flex items-center justify-between text-xs">
                <span style={{ color: "var(--app-subtle)" }}>{label}</span>
                <span className="font-semibold">{score}/100</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-5">
          <article
            className="rounded-2xl border p-6"
            style={{ background: "var(--app-surface-2)", borderColor: "var(--app-border)" }}
          >
            <p
              className="mb-2 text-xs font-semibold uppercase tracking-wider"
              style={{ color: "var(--app-indigo-pale)" }}
            >
              Design a URL Shortener
            </p>
            <h2 className="mb-4 text-lg font-semibold">Example answer</h2>
            <p className="text-sm leading-7" style={{ color: "var(--app-body)" }}>
              I would expose a write API that validates the destination and stores an immutable
              alias mapping. A collision-resistant ID generator creates compact aliases, with a
              unique database constraint as the final guard. Redirect reads use a regional cache in
              front of a replicated key-value store. Click events go to a stream and are aggregated
              asynchronously, keeping analytics off the redirect path. I would monitor cache misses,
              redirect latency, and mapping creation failures, then add hot-key protection for viral
              links.
            </p>
          </article>

          <article
            className="rounded-2xl border p-6"
            style={{ background: "var(--app-surface-2)", borderColor: "var(--app-border)" }}
          >
            <h2 className="mb-4 text-lg font-semibold">Evaluation feedback</h2>
            <div className="space-y-4 text-sm leading-6" style={{ color: "var(--app-body)" }}>
              <p>
                The design separates the latency-sensitive redirect path from analytics and names
                useful reliability signals. The unique constraint gives alias creation a clear
                correctness boundary.
              </p>
              <p className="flex gap-2">
                <CheckCircle2 className="mt-1 shrink-0 text-emerald-300" size={16} />
                Strong coverage of caching, durable mapping storage, and asynchronous click
                processing.
              </p>
              <p className="flex gap-2">
                <Lightbulb className="mt-1 shrink-0 text-amber-200" size={16} />
                Clarify the alias allocation strategy, deletion behavior, and how cache invalidation
                works when a destination changes. Add a rough capacity estimate for 10 billion daily
                redirects.
              </p>
            </div>
          </article>
        </div>
      </section>
    </main>
  )
}
