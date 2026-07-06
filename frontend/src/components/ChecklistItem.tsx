import { Check } from 'lucide-react'

interface Props {
  children: string
  className?: string
}

export default function ChecklistItem({ children, className = '' }: Props) {
  return (
    <li className={`flex items-start gap-3 ${className}`}>
      <span className="mt-0.5 flex-shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-full bg-accent/10">
        <Check className="w-3.5 h-3.5 text-accent" strokeWidth={2.75} />
      </span>
      <span className="font-sans text-[15px] leading-relaxed text-ink-muted">{children}</span>
    </li>
  )
}
