interface DuckMarkProps {
  size?: number
  className?: string
}

/**
 * The Quack duck mark. A simple amber duck glyph used in the header and the
 * boot splash. Decorative, so it is hidden from assistive tech by default.
 */
export function DuckMark({ size = 28, className = '' }: DuckMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M20.5 11.5a3.5 3.5 0 1 0-6.7 1.4c-2.5.5-4.3 2.5-4.3 5.1 0 .9.2 1.7.6 2.4-.5.2-.9.6-1.1 1.1a.6.6 0 0 0 .6.9h8.9c3 0 5.5-2.4 5.5-5.4 0-2-1.1-3.8-2.8-4.7.1-.4.2-.8.2-1.2Z"
        fill="var(--color-amber)"
      />
      <circle cx="18.3" cy="11.2" r="1.05" fill="var(--color-base)" />
      <path d="M21 11.3l3-.8-2.1 2.1-.9-1.3Z" fill="var(--color-amber)" />
    </svg>
  )
}
