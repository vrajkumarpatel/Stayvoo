interface Props {
  size?: number
  className?: string
}

let gooId = 0

export default function LogoMark({ size = 36, className = '' }: Props) {
  const id = gooId++

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <filter id={`stayvoo-goo-${id}`}>
          <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
          <feColorMatrix
            in="blur"
            mode="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9"
            result="goo"
          />
        </filter>
        <linearGradient id={`stayvoo-gradient-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#c4703a" />
          <stop offset="100%" stopColor="#e8a85c" />
        </linearGradient>
      </defs>
      <g filter={`url(#stayvoo-goo-${id})`}>
        <circle className="stayvoo-blob-a" cx="16" cy="20" r="9" fill={`url(#stayvoo-gradient-${id})`} />
        <circle className="stayvoo-blob-b" cx="25" cy="20" r="7" fill={`url(#stayvoo-gradient-${id})`} />
      </g>
    </svg>
  )
}
