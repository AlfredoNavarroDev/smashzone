import type { ReactNode } from 'react'
import './ShardIconLink.css'

export default function ShardIconLink({ to, label, direction, className = '', children }: {
  to: string; label: string; direction: 'left' | 'right'; className?: string; children: ReactNode
}) {
  return <a href={to} aria-label={label} title={label} className={`shard-icon-link ${className}`} data-direction={direction}>
    {children}
    <span className="shard-icon-wash" aria-hidden="true" />
    <svg className="shard-icon-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 12H5m6-6-6 6 6 6" />
    </svg>
  </a>
}
