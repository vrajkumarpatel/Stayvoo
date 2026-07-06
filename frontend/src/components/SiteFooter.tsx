import { Link } from 'react-router-dom'
import LogoMark from './LogoMark'

export default function SiteFooter() {
  return (
    <footer className="bg-navy text-paper/60">
      <div className="max-w-6xl mx-auto px-4 py-14 grid grid-cols-1 sm:grid-cols-3 gap-10">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <LogoMark size={26} />
            <span className="font-serif font-bold text-lg text-paper">Stayvoo</span>
          </div>
          <p className="font-sans text-sm leading-relaxed max-w-xs">
            An extended-stay and group booking agency serving the Milwaukee area and Chicagoland. We match travelers
            and organizations with the right partner hotel — from a single long stay to a multi-room block.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <p className="font-sans text-xs font-medium uppercase tracking-[2.4px] text-paper/50">Services</p>
          <nav className="flex flex-col gap-2 font-sans text-sm">
            <Link to="/exclusive" className="hover:text-paper transition-colors">Extended stay</Link>
            <Link to="/groups" className="hover:text-paper transition-colors">Groups &amp; corporate</Link>
            <Link to="/contact" className="hover:text-paper transition-colors">Request a quote</Link>
          </nav>
        </div>

        <div className="flex flex-col gap-3">
          <p className="font-sans text-xs font-medium uppercase tracking-[2.4px] text-paper/50">Company</p>
          <nav className="flex flex-col gap-2 font-sans text-sm">
            <Link to="/about" className="hover:text-paper transition-colors">About</Link>
            <Link to="/contact" className="hover:text-paper transition-colors">Contact</Link>
            <a href="mailto:hello@stayvoo.com" className="hover:text-paper transition-colors">hello@stayvoo.com</a>
            <a href="tel:+18883528151" className="hover:text-paper transition-colors">+1 (888) 352-8151</a>
          </nav>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-2 font-sans text-xs text-paper/50">
          <p>© 2026 Stayvoo LLC. All rights reserved.</p>
          <p>Commission-based booking agency · Milwaukee Area &amp; Chicagoland</p>
        </div>
      </div>
    </footer>
  )
}
