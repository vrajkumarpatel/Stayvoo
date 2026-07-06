import { Link } from 'react-router-dom'

interface Props {
  heading: string
  body: string
  buttonLabel: string
  buttonHref: string
  className?: string
}

export default function CtaBanner({ heading, body, buttonLabel, buttonHref, className = '' }: Props) {
  return (
    <div className={`max-w-6xl mx-auto px-4 ${className}`}>
      <div className="bg-navy rounded-card px-8 py-14 sm:px-16 sm:py-16 text-center flex flex-col items-center gap-5">
        <h2 className="font-serif font-bold text-3xl sm:text-4xl text-paper max-w-2xl">{heading}</h2>
        <p className="font-sans text-base sm:text-lg text-paper/75 max-w-xl leading-relaxed">{body}</p>
        <Link
          to={buttonHref}
          className="mt-2 inline-flex items-center justify-center rounded-control bg-brand-orange hover:bg-brand-orange-dark text-white text-sm font-medium px-6 py-3 transition-colors"
        >
          {buttonLabel}
        </Link>
      </div>
    </div>
  )
}
