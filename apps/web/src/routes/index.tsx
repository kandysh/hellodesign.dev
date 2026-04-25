import { createFileRoute, Link } from "@tanstack/react-router"
import { ArrowRight, Brain, CheckCircle, Layers, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export const Route = createFileRoute("/")({ component: HomePage })

function HomePage() {
  return (
    <div className="flex flex-col items-center">
      {/* Hero */}
      <section className="py-20 text-center max-w-3xl">
        <Badge variant="outline" className="mb-6 gap-2 rounded-full px-3 py-1 text-sm text-base-content/60">
          <Zap size={14} className="text-primary" />
          Multi-agent AI feedback on every answer
        </Badge>
        <h1 className="text-5xl font-extrabold tracking-tight mb-4">
          Ace your{" "}
          <span className="text-primary">System Design</span>{" "}
          interviews
        </h1>
        <p className="text-xl text-base-content/60 mb-8">
          Solve real system design questions, draw your architecture, and get
          instant AI-powered feedback across 7 evaluation dimensions.
        </p>
        <div className="flex gap-3 justify-center">
          <Button asChild size="lg">
            <Link to="/questions">
              Start Practicing <ArrowRight size={16} />
            </Link>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link to="/auth/login">Sign in</Link>
          </Button>
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
            <Card key={item.step} className="p-6">
              <div className="flex items-center gap-3 mb-3">
                {item.icon}
                <span className="text-xs font-bold text-base-content/50 uppercase tracking-wide">
                  Step {item.step}
                </span>
              </div>
              <h3 className="font-semibold mb-2">{item.title}</h3>
              <p className="text-sm text-base-content/60">{item.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Evaluation dimensions */}
      <section className="w-full max-w-5xl py-16 border-t border-base-300">
        <h2 className="text-2xl font-bold text-center mb-3">
          7 evaluation dimensions
        </h2>
        <p className="text-center text-base-content/60 mb-10">
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
            <Card
              key={dim}
              className="px-4 py-3 text-sm font-medium text-center hover:border-primary/50 transition-colors"
            >
              {dim}
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}
