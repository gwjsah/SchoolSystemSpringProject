import { useState } from 'react'
import { Megaphone } from 'lucide-react'
import { Badge, EmptyState } from './ui'
import { formatDate, labelize } from '../lib/format'

/** Read-only list of announcements, newest first. Long posts are clamped with a "Read more" toggle. */
export default function AnnouncementList({ announcements = [], limit }) {
  const [expanded, setExpanded] = useState(() => new Set())

  const sorted = [...announcements].sort((a, b) => new Date(b.postedAt) - new Date(a.postedAt))
  const shown = limit ? sorted.slice(0, limit) : sorted

  if (shown.length === 0) {
    return <EmptyState icon={Megaphone} title="No announcements right now" />
  }

  const toggle = (id) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  return (
    <ul className="divide-y divide-slate-100 dark:divide-slate-800">
      {shown.map((a) => {
        const isOpen = expanded.has(a.id)
        const isLong = a.content.length > 180
        return (
          <li key={a.id} className="px-5 py-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge value={a.category}>{labelize(a.category)}</Badge>
              <span className="text-xs text-slate-500 dark:text-slate-400">{formatDate(a.postedAt)}</span>
            </div>
            <h3 className="mt-1.5 font-medium text-slate-900 dark:text-white">{a.title}</h3>
            <p className={`mt-1 text-sm text-slate-600 dark:text-slate-300 ${!isOpen && isLong ? 'line-clamp-2' : ''}`}>{a.content}</p>
            {isLong && (
              <button onClick={() => toggle(a.id)} className="mt-1 text-xs font-medium text-accent hover:underline">
                {isOpen ? 'Show less' : 'Read more'}
              </button>
            )}
          </li>
        )
      })}
    </ul>
  )
}

