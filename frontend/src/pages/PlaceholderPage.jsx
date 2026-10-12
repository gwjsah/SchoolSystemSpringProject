import { Construction } from 'lucide-react'

/** Temporary page shown until a screen is built. Lists what it will do and which endpoints it will use. */
export default function PlaceholderPage({ title, planned = [], endpoints = [] }) {
  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">{title}</h1>

      <div className="mt-6 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-6">
        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
          <Construction className="h-5 w-5" />
          <span className="text-sm font-medium">This screen is not built yet</span>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Planned</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700 dark:text-slate-300">
              {planned.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Endpoints</h2>
            <ul className="mt-2 space-y-1">
              {endpoints.map((endpoint) => (
                <li key={endpoint}>
                  <code className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-xs text-slate-700 dark:text-slate-300">{endpoint}</code>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  )
}

