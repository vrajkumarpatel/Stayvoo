interface Props {
  children: string
  className?: string
}

export default function SectionEyebrow({ children, className = '' }: Props) {
  return (
    <p className={`font-sans text-xs font-medium uppercase tracking-[2.4px] text-accent ${className}`}>
      {children}
    </p>
  )
}
