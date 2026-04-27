export function Footer() {
  return (
    <footer
      className="w-full border-t mt-auto"
      style={{ background: "#060e20", borderColor: "#1e293b" }}
    >
      <div className="flex flex-col md:flex-row justify-between items-center py-10 px-8 max-w-[1440px] mx-auto gap-4">
        {/* Brand */}
        <div className="text-base font-bold" style={{ color: "#dae2fd" }}>
          © 2025 Hello Design. Technical Precision in System Design.
        </div>

        {/* Links */}
        <div className="flex flex-wrap justify-center md:justify-end gap-6 text-sm">
          {[
            { label: "Documentation", href: "#" },
            { label: "API Reference", href: "#" },
            { label: "Terms of Service", href: "#" },
            { label: "Privacy Policy", href: "#" },
          ].map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="transition-colors"
              style={{ color: "#464554" }}
              onMouseEnter={(e) => {
                ;(e.currentTarget as HTMLAnchorElement).style.color = "#dae2fd"
              }}
              onMouseLeave={(e) => {
                ;(e.currentTarget as HTMLAnchorElement).style.color = "#464554"
              }}
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </footer>
  )
}
