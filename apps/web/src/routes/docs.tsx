import { createFileRoute, Link } from "@tanstack/react-router"
export const Route = createFileRoute("/docs")({ component: DocsPage })

function DocsPage() {
  return (
    <main className="page-shell max-w-5xl">
      <header className="mb-10 max-w-3xl">
        <p className="page-eyebrow">Help center</p>
        <h1 className="page-title mt-3">Documentation</h1>
        <p className="page-description mt-3">Hello Design helps engineers practice system design interviews using their own model provider key.</p>
      </header>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="surface-panel p-6 sm:p-7">
          <h2 className="text-lg font-semibold text-base-content">Practice workflow</h2>
          <ol className="mt-5 list-decimal space-y-3 pl-5 text-sm leading-6 text-base-content/75">
            <li>Choose a published question and write an answer. You can also add an architecture diagram.</li>
            <li>Choose Quick for a direct evaluation, or Deep for a simulated interview that may ask clarifying questions.</li>
            <li>Read the rubric scores and feedback. Scores are AI-generated coaching feedback, not hiring outcomes.</li>
            <li>On a completed result, choose Publish to share your answer and diagram with your account name. Evaluation details are shared only when you opt in.</li>
          </ol>
        </section>
        <section className="surface-panel p-6 sm:p-7">
          <h2 className="text-lg font-semibold text-base-content">Bring your own key</h2>
          <p className="mt-4 text-sm leading-6 text-base-content/75">Add an OpenAI-compatible API key in Settings. OpenRouter is preselected; you may enter another HTTPS-compatible API base URL and a model identifier when prompted. Your key is encrypted in the application database and sent to the configured provider to run evaluations. Provider availability, pricing, and data handling are governed by that provider.</p>
          <p className="mt-3 text-sm leading-6 text-base-content/75">You are responsible for your provider account and any charges it incurs. Never enter a key you are not authorized to use. Remove the key in Settings to stop using it.</p>
          <Link to="/settings" className="btn btn-primary btn-sm mt-5">Configure provider key</Link>
        </section>
        <section className="surface-panel p-6 sm:p-7 lg:col-span-2">
          <h2 className="text-lg font-semibold text-base-content">Guest and account data</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-base-content/75">Guest answers, results, and keys are tied to this browser session. Settings offers a clear guest data action. Creating an account does not currently migrate guest activity automatically. Signed-in users can delete their account and associated submissions, keys, shared posts, and comments from Settings.</p>
        </section>
        <section id="api-reference" className="surface-panel scroll-mt-24 overflow-hidden lg:col-span-2">
          <div className="border-b border-base-300 px-6 py-5">
            <h2 className="text-lg font-semibold text-base-content">API reference</h2>
            <p className="mt-2 text-sm text-base-content/60">The HTTP API is intended for the application and currently has no separate public API authentication keys or stability guarantee.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-base-200 text-base-content/80"><tr><th className="px-6 py-3 font-medium">Endpoint</th><th className="px-6 py-3 font-medium">Purpose</th></tr></thead>
              <tbody className="divide-y divide-base-300 text-base-content/65">{[["GET /api/questions", "List published practice questions"],["GET /api/questions/:id", "Read a question and rubric"],["POST /api/submissions", "Submit an answer for evaluation"],["GET /api/submissions/:id", "Read your submission and result"],["GET /api/me/submissions", "Read your personal history (guest session or account)"],["GET /api/community", "Browse public shared answers"],["POST /api/community", "Publish a completed answer (sign-in required)"],["POST /api/community/:id/comments", "Comment on a shared answer (sign-in required)"],["GET /api/models", "List OpenRouter model identifiers"]].map(([endpoint, purpose])=><tr key={endpoint}><td className="whitespace-nowrap px-6 py-3 font-mono text-xs text-primary">{endpoint}</td><td className="px-6 py-3">{purpose}</td></tr>)}</tbody>
            </table>
          </div>
        </section>
      </div>
      <p className="mt-8 text-sm text-base-content/60">See <Link to="/legal" hash="privacy" className="font-medium text-primary">Privacy</Link> and <Link to="/legal" hash="terms" className="font-medium text-primary">Terms</Link>.</p>
    </main>
  )
}
