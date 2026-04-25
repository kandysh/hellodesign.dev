import { Link } from "@tanstack/react-router"
import { BookOpen, LayoutDashboard, LogIn } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-base-300 bg-base-100/95 backdrop-blur supports-[backdrop-filter]:bg-base-100/60">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 font-bold text-lg">
          <span className="text-primary">SysDesign</span>
          <span className="text-base-content/50 font-normal text-sm">Prep</span>
        </Link>

        <nav className="flex items-center gap-1">
          <Button variant="ghost" size="sm" asChild>
            <Link
              to="/questions"
              activeProps={{ className: "bg-base-200 text-base-content" }}
            >
              <BookOpen size={16} />
              Questions
            </Link>
          </Button>

          <Button variant="ghost" size="sm" asChild>
            <Link
              to="/me"
              activeProps={{ className: "bg-base-200 text-base-content" }}
            >
              <LayoutDashboard size={16} />
              Dashboard
            </Link>
          </Button>

          <Button variant="ghost" size="sm" asChild>
            <Link to="/auth/login">
              <LogIn size={16} />
              Sign in
            </Link>
          </Button>
        </nav>
      </div>
    </header>
  )
}
