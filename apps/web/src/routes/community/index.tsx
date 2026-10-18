import { createFileRoute, Link } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { useState } from "react"
import { MessageSquare, Search, ThumbsUp } from "lucide-react"

const API = import.meta.env.VITE_API_URL ?? "http://localhost:3001"
export const Route = createFileRoute("/community/")({ component: CommunityPage })

interface Post { id: string; title: string; answerText: string; authorName: string; createdAt: string; voteCount: number; commentCount: number; question: { title: string; category: string; difficulty: string }; evaluation: { overallScore: number } | null }

function CommunityPage() {
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("")
  const [difficulty, setDifficulty] = useState("")
  const { data: session } = useQuery<{ user?: { isAdmin?: boolean } } | null>({ queryKey: ["session"], queryFn: () => fetch(`${API}/api/auth/get-session`, { credentials: "include" }).then((r) => r.ok ? r.json() : null) })
  const { data = [], isLoading, error } = useQuery<Post[]>({
    queryKey: ["community", search, category, difficulty],
    queryFn: async () => { const params = new URLSearchParams(); if (search) params.set("q", search); if (category) params.set("category", category); if (difficulty) params.set("difficulty", difficulty); const res = await fetch(`${API}/api/community?${params}`, { credentials: "include" }); if (!res.ok) throw new Error("Could not load community posts"); return res.json() },
  })
  const { data: questions = [] } = useQuery<{ category: string }[]>({ queryKey: ["questions", "community-categories"], queryFn: async () => { const r = await fetch(`${API}/api/questions`); if (!r.ok) throw new Error("Could not load categories"); return r.json() }, staleTime: 60_000 })
  const categories = [...new Set(questions.map((q) => q.category))].sort()
  return <div className="mx-auto max-w-5xl px-6 py-10">
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest text-indigo-400">Community</p><h1 className="mt-2 text-3xl font-bold text-slate-100">Shared system designs</h1><p className="mt-2 text-sm text-slate-400">Answers published by members who chose to share their work.</p></div><div className="flex flex-wrap gap-2">{session?.user?.isAdmin && <Link to="/admin" className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300">Moderation</Link>}<label className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2"><Search size={15} className="text-slate-400"/><input aria-label="Search shared designs" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search designs" className="bg-transparent text-sm text-slate-100 outline-none"/></label><select aria-label="Filter by category" value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-300"><option value="">All categories</option>{categories.map((c) => <option key={c} value={c}>{c}</option>)}</select><select aria-label="Filter by difficulty" value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-300"><option value="">All levels</option><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select></div></div>
    {isLoading ? <p className="py-12 text-center text-sm text-slate-400">Loading shared designs…</p> : error ? <p role="alert" className="py-12 text-center text-sm text-rose-300">Community posts could not be loaded.</p> : data.length === 0 ? <div className="rounded-xl border border-dashed border-slate-700 p-12 text-center"><h2 className="font-semibold text-slate-200">No shared designs yet</h2><p className="mt-2 text-sm text-slate-400">Complete an answer and choose Share to publish it here.</p></div> : <div className="space-y-3">{data.map((post) => <Link key={post.id} to="/community/$threadId" params={{ threadId: post.id }} className="block rounded-xl border border-slate-800 bg-slate-900/70 p-5 transition hover:border-indigo-500/50"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-semibold text-slate-100">{post.title}</h2><p className="mt-1 text-xs text-slate-400">{post.question.title} · {post.question.category} · {post.question.difficulty.toLowerCase()}</p></div>{post.evaluation && <span className="rounded-full bg-indigo-500/10 px-2.5 py-1 text-xs text-indigo-300">Score {Math.round(post.evaluation.overallScore)}/100</span>}</div><p className="mt-4 line-clamp-3 whitespace-pre-wrap text-sm leading-6 text-slate-300">{post.answerText}</p><div className="mt-4 flex items-center gap-4 text-xs text-slate-400"><span>By {post.authorName}</span><span>{new Date(post.createdAt).toLocaleDateString()}</span><span className="inline-flex items-center gap-1"><ThumbsUp size={13}/>{post.voteCount}</span><span className="inline-flex items-center gap-1"><MessageSquare size={13}/>{post.commentCount}</span></div></Link>)}</div>}
  </div>
}
