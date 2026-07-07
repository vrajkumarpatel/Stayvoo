import { useState } from 'react'

const NAVY = '#091A36'
const PAPER = '#F8FAFD'

function Swatch({ bg, src, size, sizeLabel }: { bg: string; src: string; size: number; sizeLabel: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="flex items-center justify-center rounded-lg"
        style={{ background: bg, width: size < 100 ? 160 : 420, height: size < 100 ? 100 : 160, padding: 16 }}
      >
        <img src={src} alt={sizeLabel} style={{ height: size, maxWidth: '100%' }} />
      </div>
      <span className="text-xs text-slate-400 font-mono">{sizeLabel}</span>
    </div>
  )
}

function IconStrip({ bg, label }: { bg: string; label: string }) {
  const sizes: { s: number; src: string }[] = [
    { s: 16, src: '/brand/monogram-16.svg' },
    { s: 32, src: '/brand/monogram.svg' },
    { s: 64, src: '/brand/monogram.svg' },
  ]
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs text-slate-400 font-mono">{label}</span>
      <div className="flex items-end gap-8 rounded-lg p-6" style={{ background: bg }}>
        {sizes.map(({ s, src }) => (
          <div key={s} className="flex flex-col items-center gap-2">
            <img src={src} alt={`monogram ${s}px`} width={s} height={s} style={{ width: s, height: s }} />
            <span className="text-[11px] font-mono" style={{ color: bg === NAVY ? '#93a4c2' : '#8a94a6' }}>{s}px</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function BrowserTabMock() {
  return (
    <div className="rounded-t-lg overflow-hidden border border-slate-300 max-w-sm" style={{ background: '#dee1e6' }}>
      <div className="flex items-end gap-1 px-2 pt-2">
        <div className="flex items-center gap-2 bg-white rounded-t-md px-3 py-2 min-w-0">
          <img src="/brand/monogram-16.svg" alt="tab icon" width={16} height={16} className="shrink-0" />
          <span className="text-xs text-slate-700 truncate">Stayvoo | Extended Stay Hotel…</span>
        </div>
      </div>
      <div className="h-9 bg-white flex items-center px-3 gap-2 border-t border-slate-100">
        <div className="w-2 h-2 rounded-full bg-slate-300" />
        <div className="w-2 h-2 rounded-full bg-slate-300" />
        <div className="flex-1 h-5 rounded-full bg-slate-100 ml-2" />
      </div>
    </div>
  )
}

function NavPreview() {
  const [replayKey, setReplayKey] = useState(0)
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs text-slate-400 font-mono">nav preview (300ms fade-in on first load, respects prefers-reduced-motion)</span>
      <div className="rounded-lg border border-slate-300 overflow-hidden">
        <div className="flex items-center justify-between px-5 h-16" style={{ background: PAPER }}>
          <img
            key={replayKey}
            src="/brand/logo-full.svg"
            alt="Stayvoo"
            style={{ height: 40, width: 'auto', animation: 'brand-fade-in 300ms ease-out' }}
          />
          <div className="hidden sm:flex items-center gap-6 text-sm text-slate-400">
            <span>Extended Stay</span>
            <span>Groups &amp; Corporate</span>
            <span>About</span>
            <span>Contact</span>
          </div>
        </div>
      </div>
      <button
        onClick={() => setReplayKey((k) => k + 1)}
        className="self-start text-xs font-mono text-slate-400 hover:text-slate-600 underline"
      >
        replay fade-in
      </button>
      <style>{`
        @media (prefers-reduced-motion: reduce) {
          img[style*="brand-fade-in"] { animation: none !important; }
        }
        @keyframes brand-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  )
}

function FooterPreview() {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs text-slate-400 font-mono">footer preview</span>
      <div className="rounded-lg overflow-hidden" style={{ background: NAVY }}>
        <div className="px-6 py-8 flex flex-col items-start gap-4">
          <img src="/brand/logo-full-white.svg" alt="Stayvoo" style={{ height: 36, width: 'auto' }} />
          <p className="text-xs max-w-xs" style={{ color: 'rgba(248,250,253,0.6)' }}>
            An extended-stay and group booking agency serving the Milwaukee area and Chicagoland.
          </p>
          <p className="text-xs" style={{ color: 'rgba(248,250,253,0.4)' }}>© 2026 Stayvoo LLC. All rights reserved.</p>
        </div>
      </div>
    </div>
  )
}

export default function Brand() {
  return (
    <div className="min-h-screen py-16 px-6" style={{ background: '#eef1f6' }}>
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-2" style={{ color: NAVY }}>Stayvoo Logo Package: Final Review</h1>
        <p className="text-slate-500 mb-12">
          Serif wordmark, thin pitched roofline (brand orange) over the "oo", tagline fixed for navy contrast. Not committed, review below.
        </p>

        <div className="flex flex-col gap-16">
          <section className="border-t border-slate-300 pt-8">
            <h2 className="text-xl font-semibold mb-1" style={{ color: NAVY }}>Wordmark</h2>
            <p className="text-slate-500 mb-6 max-w-2xl">
              Libre Baskerville Bold + IBM Plex Sans Medium tagline, paths only. Roofline is a single stroke path: steep ~34° symmetric pitch to a centered peak, a zigzag notch (diagonal top parallel to the slope, not a flat chimney box) on the descent, tapered pen-stroke tips at both eaves, reused identically in the monogram below.
            </p>
            <div className="flex flex-wrap gap-10">
              <Swatch bg={PAPER} src="/brand/logo-full.svg" size={140} sizeLabel="full size, light bg" />
              <Swatch bg={NAVY} src="/brand/logo-full-white.svg" size={140} sizeLabel="full size, navy bg" />
              <Swatch bg={PAPER} src="/brand/logo-full.svg" size={24} sizeLabel="24px, light bg" />
              <Swatch bg={NAVY} src="/brand/logo-full-white.svg" size={24} sizeLabel="24px, navy bg" />
            </div>
          </section>

          <section className="border-t border-slate-300 pt-8">
            <h2 className="text-xl font-semibold mb-1" style={{ color: NAVY }}>Browser icons</h2>
            <p className="text-slate-500 mb-6 max-w-2xl">
              Monogram (identical oo+roofline geometry, scaled) on a navy rounded square. The 16px cut drops the chimney notch and thickens the stroke slightly, 32px and up keep full detail and master proportions.
            </p>

            <div className="flex flex-wrap gap-10 mb-10">
              <IconStrip bg={PAPER} label="light strip" />
              <IconStrip bg={NAVY} label="dark strip" />
            </div>

            <span className="text-xs text-slate-400 font-mono block mb-2">mock browser tab</span>
            <BrowserTabMock />
          </section>

          <section className="border-t border-slate-300 pt-8">
            <h2 className="text-xl font-semibold mb-1" style={{ color: NAVY }}>Nav &amp; footer: live preview</h2>
            <p className="text-slate-500 mb-6 max-w-2xl">
              Not wired into the real components yet. Shows how logo-full / logo-full-white will look once integrated.
            </p>
            <div className="flex flex-col gap-10">
              <NavPreview />
              <FooterPreview />
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
