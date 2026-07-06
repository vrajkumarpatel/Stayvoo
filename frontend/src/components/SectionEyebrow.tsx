interface Props {
  children: string
  className?: string
  as?: 'p' | 'h2'
}

export default function SectionEyebrow({ children, className = '', as: Tag = 'p' }: Props) {
  return (
    <Tag className={`font-sans text-xs font-medium uppercase tracking-[2.4px] text-accent ${className}`}>
      {children}
    </Tag>
  )
}
