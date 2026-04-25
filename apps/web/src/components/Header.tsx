import { Link } from "@tanstack/react-router"
import { BookOpen, LayoutDashboard, LogIn, User } from "lucide-react"

export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 font-bold text-lg">
          <span className="text-primary">SysDesign</span>
          <span className="text-muted-foreground font-normal text-sm">Prep</span>
        </Link>

        <nav className="flex items-center gap-1">
          <Link
            to="/questions"
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            activeProps={{ className: "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-foreground bg-accent" }}
          >
            <BookOpen size={16} />
            Questions
          </Link>

          <Link
            to="/me"
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            activeProps={{ className: "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-foreground bg-accent" }}
          >
            <LayoutDashboard size={16} />
            Dashboard
          </Link>

          <Link
            to="/auth/login"
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <LogIn size={16} />
            Sign in
          </Link>
        </nav>
      </div>
    </header>
  )
}
