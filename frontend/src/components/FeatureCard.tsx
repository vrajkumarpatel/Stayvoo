import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface Props {
  icon?: ReactNode
  image?: string
  title: string
  body: string
  eyebrow?: string
  href?: string
  linkLabel?: string
  className?: string
}

export default function FeatureCard({ icon, image, title, body, eyebrow, href, linkLabel, className = '' }: Props) {
  const interactive = Boolean(href)

  const content = (
    <div
      className={`bg-white border border-border rounded-card overflow-hidden h-full flex flex-col transition-shadow ${interactive ? 'hover:shadow-lg' : ''} ${className}`}
    >
      {image && (
        <div className="aspect-[16/10] w-full overflow-hidden">
          <img src={image} alt="" className="w-full h-full object-cover" />
        </div>
      )}
      <div className="p-6 flex flex-col gap-3 flex-1">
        {icon && (
          <span className="inline-flex items-center justify-center w-10 h-10 rounded-control bg-navy text-paper flex-shrink-0">
            {icon}
          </span>
        )}
        {eyebrow && <SectionEyebrowInline>{eyebrow}</SectionEyebrowInline>}
        <h3 className="font-serif font-bold text-2xl text-navy leading-snug">{title}</h3>
        <p className="font-sans text-[15px] leading-relaxed text-ink-muted flex-1">{body}</p>
        {href && (
          <span className="font-sans text-sm font-medium text-accent mt-1">
            {linkLabel ?? 'Learn more'} →
          </span>
        )}
      </div>
    </div>
  )

  if (!href) return content

  return (
    <Link to={href} className="block h-full">
      {content}
    </Link>
  )
}

function SectionEyebrowInline({ children }: { children: string }) {
  return <p className="font-sans text-xs font-medium uppercase tracking-[2.4px] text-accent">{children}</p>
}
