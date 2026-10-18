import { createFileRoute, Link } from "@tanstack/react-router"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Suspense, lazy, useState } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { ArrowLeft, Flag, MessageSquare, ThumbsUp, Trash2 } from "lucide-react"
import { useTheme } from "@/hooks/useTheme"

const API = import.meta.env.VITE_API_URL ?? "http://localhost:3001"
const Excalidraw = lazy(() => import("@excalidraw/excalidraw").then((m) => ({ default: m.Excalidraw })))
export const Route = createFileRoute("/community/$threadId")({ component: CommunityThreadPage })
interface Comment { id: string; authorId: string; authorName: string; content: string; createdAt: string; voteCount: number; hasVoted: boolean }
interface Post { id: string; authorId: string; authorName: string; title: string; answerText: string; diagram: unknown; createdAt: string; voteCount: number; hasVoted: boolean; question: { title: string; category: string; difficulty: string }; evaluation: { overallScore: number; feedback: string; improvements: string[]; componentScores: unknown } | null; comments: Comment[] }

function CommunityThreadPage() {
  const { threadId } = Route.useParams()
  const queryClient = useQueryClient()
  const [content, setContent] = useState("")
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")
  const { theme } = useTheme()
  const { data: session } = useQuery<{ user?: { id: string } } | null>({ queryKey: ["session"], queryFn: () => fetch(`${API}/api/auth/get-session`, { credentials: "include" }).then((r) => r.ok ? r.json() : null) })
  const { data: post, isLoading, error } = useQuery<Post>({ queryKey: ["community", threadId], queryFn: async () => { const r = await fetch(`${API}/api/community/${threadId}`, { credentials: "include" }); if (!r.ok) throw new Error("Post not found"); return r.json() } })
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["community"] })
  async function request(path: string, method: string, body?: unknown) { setBusy(true); setMessage(""); try { const r = await fetch(`${API}${path}`, { method, credentials: "include", headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined }); const data = await r.json().catch(() => ({})); if (!r.ok) throw new Error(data.error ?? "Request failed"); refresh(); return data } catch (e) { setMessage(e instanceof Error ? e.message : "Request failed") } finally { setBusy(false) } }
  if (isLoading) return <p className="page-shell max-w-4xl text-center text-base-content/60">Loading post…</p>
  if (error || !post) return <div className="page-shell max-w-4xl text-center"><p className="text-base-content/80">This shared design is unavailable.</p><Link className="mt-4 inline-block text-primary" to="/community">Back to community</Link></div>
  const isAuthor = session?.user?.id === post.authorId
  return <article className="page-shell max-w-4xl" style={{ paddingTop: "2rem", paddingBottom: "3rem" }}>
    <Link to="/community" className="inline-flex items-center gap-2 text-sm text-base-content/60 hover:text-base-content/90"><ArrowLeft size={15}/>Community</Link>
    <header className="mt-7 border-b border-base-300 pb-6"><p className="text-xs font-semibold uppercase tracking-widest text-primary">{post.question.category} · {post.question.difficulty.toLowerCase()}</p><h1 className="mt-2 text-3xl font-bold text-base-content">{post.title}</h1><p className="mt-3 text-sm text-base-content/60">{post.question.title} · Shared by {post.authorName} on {new Date(post.createdAt).toLocaleDateString()}</p>
      <div className="mt-4 flex flex-wrap gap-2"><button disabled={busy || !session?.user} title={!session?.user ? "Sign in to vote" : undefined} onClick={() => void request(`/api/community/${post.id}/vote`, post.hasVoted ? "DELETE" : "PUT")} className="inline-flex items-center gap-2 rounded-lg border border-base-300 px-3 py-2 text-sm text-base-content/80 disabled:opacity-50"><ThumbsUp size={15}/>{post.voteCount} {post.hasVoted ? "Voted" : "Vote"}</button><button disabled={busy || !session?.user} onClick={() => { const reason = window.prompt("Why are you reporting this post?"); if (reason?.trim()) void request(`/api/community/${post.id}/reports`, "POST", { reason }) }} className="inline-flex items-center gap-2 rounded-lg border border-base-300 px-3 py-2 text-sm text-base-content/80 disabled:opacity-50"><Flag size={15}/>Report</button>{isAuthor && <button disabled={busy} onClick={() => { if (window.confirm("Delete this public post?")) void request(`/api/community/${post.id}`, "DELETE").then(() => { window.location.href = "/community" }) }} className="inline-flex items-center gap-2 rounded-lg border border-rose-900 px-3 py-2 text-sm text-error disabled:opacity-50"><Trash2 size={15}/>Delete post</button>}</div>
      {message && <p role="status" className="mt-3 text-sm text-amber-300">{message}</p>}
    </header>
    <section className="prose prose-sm mt-7 max-w-none rounded-xl border border-base-300 bg-base-200/50 p-5 sm:p-7 text-base-content/90"><ReactMarkdown remarkPlugins={[remarkGfm]}>{post.answerText}</ReactMarkdown></section>
    {Array.isArray(post.diagram) && post.diagram.length > 0 && <section className="surface-panel mt-5 overflow-hidden"><div className="border-b border-base-300 px-4 py-3 text-sm font-medium text-base-content">Architecture diagram</div><div className="h-[min(70vh,480px)]"><Suspense fallback={<p className="p-5 text-sm text-base-content/45">Loading diagram…</p>}><Excalidraw initialData={{ elements: post.diagram as never[] }} viewModeEnabled zenModeEnabled theme={theme} /></Suspense></div></section>}
    {post.evaluation && <section className="mt-5 rounded-xl border border-primary/30 bg-primary/5 p-5"><h2 className="font-semibold text-primary">Author opted to share evaluation</h2><p className="mt-2 text-sm text-base-content/80">Score: {Math.round(post.evaluation.overallScore)}/100</p><p className="mt-3 whitespace-pre-wrap text-sm text-base-content/80">{post.evaluation.feedback}</p></section>}
    <section className="mt-10"><h2 className="flex items-center gap-2 text-lg font-semibold text-base-content"><MessageSquare size={18}/>{post.comments.length} comments</h2><form className="mt-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (content.trim()) void request(`/api/community/${post.id}/comments`, "POST", { content }).then((r) => { if (r) setContent("") }) }}><textarea value={content} onChange={(e) => setContent(e.target.value)} maxLength={5000} placeholder={session?.user ? "Add a constructive comment…" : "Sign in to comment"} disabled={!session?.user || busy} className="min-h-20 flex-1 rounded-lg border border-base-300 bg-base-200 p-3 text-sm text-base-content outline-none focus:border-indigo-500"/><button disabled={!session?.user || busy || !content.trim()} className="self-end rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Post</button></form>
      <div className="mt-5 space-y-3">{post.comments.map((c) => <div key={c.id} className="rounded-lg border border-base-300 bg-base-200/50 p-4"><div className="flex items-center justify-between gap-3"><p className="text-xs text-base-content/60">{c.authorName} · {new Date(c.createdAt).toLocaleDateString()}</p><div className="flex gap-3">{session?.user && <button disabled={busy} onClick={() => void request(`/api/community/${post.id}/comments/${c.id}/vote`, c.hasVoted ? "DELETE" : "PUT")} className="inline-flex items-center gap-1 text-xs text-base-content/60"><ThumbsUp size={13}/>{c.voteCount}</button>}{session?.user && <button disabled={busy} onClick={() => { const reason = window.prompt("Why are you reporting this comment?"); if (reason?.trim()) void request(`/api/community/${post.id}/reports`, "POST", { reason, commentId: c.id }) }} className="text-xs text-base-content/45">Report</button>}{session?.user?.id === c.authorId && <button disabled={busy} onClick={() => void request(`/api/community/${post.id}/comments/${c.id}`, "DELETE")} aria-label="Delete your comment" className="text-error"><Trash2 size={13}/></button>}</div></div><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-base-content/90">{c.content}</p></div>)}</div>
    </section>
  </article>
}
