import { createFileRoute, Link } from "@tanstack/react-router"
import { ArrowRight, Brain, CheckCircle, Layers, Zap } from "lucide-react"

export const Route = createFileRoute("/")({ component: HomePage })

function HomePage() {
  return (
    <div className="flex flex-col items-center">
      {/* Hero */}
      <section className="py-20 text-center max-w-3xl">
        <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm text-muted-foreground mb-6">
          <Zap size={14} className="text-primary" />
          Multi-agent AI feedback on every answer
        </div>
        <h1 className="text-5xl font-extrabold tracking-tight mb-4">
          Ace your{" "}
          <span className="text-primary">System Design</span>{" "}
          interviews
        </h1>
        <p className="text-xl text-muted-foreground mb-8">
          Solve real system design questions, draw your architecture, and get
          instant AI-powered feedback across 7 evaluation dimensions.
        </p>
        <div className="flex gap-3 justify-center">
          <Link
            to="/questions"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Start Practicing <ArrowRight size={16} />
          </Link>
          <Link
            to="/auth/login"
            className="inline-flex items-center gap-2 rounded-lg border px-6 py-3 text-sm font-semibold hover:bg-accent transition-colors"
          >
            Sign in
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section className="w-full max-w-5xl py-16">
        <h2 className="text-2xl font-bold text-center mb-10">How it works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: <Layers className="text-primary" size={28} />,
              step: "1",
              title: "Pick a question",
              desc: "Browse questions by category and difficulty — from URL shorteners to distributed databases.",
            },
            {
              icon: <Brain className="text-primary" size={28} />,
              step: "2",
              title: "Write & draw your answer",
              desc: "Use our rich text editor and Excalidraw canvas to explain your architecture in detail.",
            },
            {
              icon: <CheckCircle className="text-primary" size={28} />,
              step: "3",
              title: "Get AI feedback",
              desc: "7 specialist agents evaluate your answer in parallel — requirements, scalability, data model, and more.",
            },
          ].map((item) => (
            <div key={item.step} className="rounded-lg border bg-card p-6">
              <div className="flex items-center gap-3 mb-3">
                {item.icon}
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                  Step {item.step}
                </span>
              </div>
              <h3 className="font-semibold mb-2">{item.title}</h3>
              <p className="text-sm text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Evaluation dimensions */}
      <section className="w-full max-w-5xl py-16 border-t">
        <h2 className="text-2xl font-bold text-center mb-3">
          7 evaluation dimensions
        </h2>
        <p className="text-center text-muted-foreground mb-10">
          Every answer is reviewed by a team of specialized AI agents — just like a real panel interview.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            "Requirements",
            "Capacity Estimation",
            "High-Level Design",
            "Data Model",
            "API Design",
            "Scalability",
            "Diagram Consistency",
            "Overall Score",
          ].map((dim) => (
            <div
              key={dim}
              className="rounded-lg border bg-card px-4 py-3 text-sm font-medium text-center hover:border-primary/50 transition-colors"
            >
              {dim}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
