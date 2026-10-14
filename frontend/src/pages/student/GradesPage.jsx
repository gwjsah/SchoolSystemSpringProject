import { useState } from 'react'
import { GraduationCap, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react'
import { useApi } from '../../hooks/useApi'
import { Badge, Card, EmptyState, ErrorState, LoadingState, PageHeader } from '../../components/ui'
import { formatGrade, formatTerm } from '../../lib/format'

/** Groups grades by term, newest school year first. */
function groupByTerm(grades) {
  const order = { FIRST: 1, SECOND: 2, SUMMER: 3 }
  const groups = new Map()
  for (const g of grades) {
    const key = `${g.schoolYear}|${g.semester}`
    if (!groups.has(key)) groups.set(key, { semester: g.semester, schoolYear: g.schoolYear, items: [] })
    groups.get(key).items.push(g)
  }
  return [...groups.values()].sort((a, b) =>
    a.schoolYear === b.schoolYear ? order[b.semester] - order[a.semester] : b.schoolYear.localeCompare(a.schoolYear),
  )
}

const COLUMNS = [
  { key: 'subjectCode', label: 'Subject', type: 'text', align: 'left' },
  { key: 'sectionCode', label: 'Section', type: 'text', align: 'left' },
  { key: 'units', label: 'Units', type: 'number', align: 'right' },
  { key: 'prelimGrade', label: 'Prelim', type: 'number', align: 'right' },
  { key: 'midtermGrade', label: 'Midterm', type: 'number', align: 'right' },
  { key: 'preFinalGrade', label: 'Pre-final', type: 'number', align: 'right' },
  { key: 'finalGrade', label: 'Final', type: 'number', align: 'right' },
  { key: 'computedMidterm', label: 'Midterm grade', type: 'number', align: 'right' },
  { key: 'computedFinal', label: 'Final grade', type: 'number', align: 'right' },
  { key: 'overallGrade', label: 'Overall', type: 'number', align: 'right' },
  { key: 'remarks', label: 'Remarks', type: 'text', align: 'left' },
  { key: 'teacherName', label: "Teacher's Name", type: 'text', align: 'left' },
]

function sortTermItems(items, sortKey, sortDir, sortType) {
  if (!sortKey || !sortDir) return items

  return [...items].sort((a, b) => {
    let valA = a[sortKey]
    let valB = b[sortKey]

    if (sortKey === 'subjectCode') {
      valA = `${a.subjectCode || ''} ${a.subjectName || ''}`
      valB = `${b.subjectCode || ''} ${b.subjectName || ''}`
    } else if (sortKey === 'remarks') {
      valA = a.overallGrade != null ? a.remarks : null
      valB = b.overallGrade != null ? b.remarks : null
    }

    const isMissingA = valA === null || valA === undefined || valA === ''
    const isMissingB = valB === null || valB === undefined || valB === ''

    if (isMissingA && isMissingB) return 0
    if (isMissingA) return 1
    if (isMissingB) return -1

    if (sortType === 'number') {
      const numA = Number(valA)
      const numB = Number(valB)
      return sortDir === 'asc' ? numA - numB : numB - numA
    } else {
      const strA = String(valA)
      const strB = String(valB)
      const comp = strA.localeCompare(strB, undefined, { sensitivity: 'base' })
      return sortDir === 'asc' ? comp : -comp
    }
  })
}

function TermGradesTable({ term }) {
  const [sortKey, setSortKey] = useState(null)
  const [sortDir, setSortDir] = useState(null)
  const [sortType, setSortType] = useState('text')

  const handleToggleSort = (key, type) => {
    if (sortKey === key) {
      if (sortDir === 'asc') {
        setSortDir('desc')
      } else if (sortDir === 'desc') {
        setSortKey(null)
        setSortDir(null)
      }
    } else {
      setSortKey(key)
      setSortDir('asc')
      setSortType(type)
    }
  }

  const sortedItems = sortTermItems(term.items, sortKey, sortDir, sortType)
  const totalUnits = term.items.reduce((sum, item) => sum + (Number(item.units) || 0), 0)

  return (
    <Card
      key={`${term.schoolYear}-${term.semester}`}
      title={formatTerm(term.semester, term.schoolYear)}
      bodyClassName="p-0 overflow-hidden"
    >
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm divide-y divide-slate-200 dark:divide-slate-800">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {COLUMNS.map((col) => {
                const isActive = sortKey === col.key
                return (
                  <th
                    key={col.key}
                    onClick={() => handleToggleSort(col.key, col.type)}
                    className={`whitespace-nowrap px-3.5 py-3 select-none cursor-pointer group hover:bg-slate-100/70 dark:hover:bg-slate-800/60 transition-colors ${
                      col.align === 'right' ? 'text-right' : 'text-left'
                    }`}
                    title={
                      col.type === 'text'
                        ? `Click to sort by ${col.label} (${isActive ? (sortDir === 'asc' ? 'Z → A' : 'Default') : 'A → Z'})`
                        : `Click to sort by ${col.label} (${isActive ? (sortDir === 'asc' ? 'High → Low' : 'Default') : 'Low → High'})`
                    }
                  >
                    <div
                      className={`inline-flex items-center gap-1.5 ${
                        col.align === 'right' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <span
                        className={`text-xs font-semibold uppercase tracking-wider transition-colors ${
                          isActive
                            ? 'text-accent font-bold'
                            : 'text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white'
                        }`}
                      >
                        {col.label}
                      </span>
                      <span
                        className={`inline-flex items-center justify-center rounded p-1 transition-all ${
                          isActive
                            ? 'bg-accent text-white shadow-xs'
                            : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300'
                        }`}
                      >
                        {isActive ? (
                          sortDir === 'asc' ? (
                            <ArrowUp className="h-3 w-3" />
                          ) : (
                            <ArrowDown className="h-3 w-3" />
                          )
                        ) : (
                          <ArrowUpDown className="h-3 w-3 opacity-60" />
                        )}
                      </span>
                    </div>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 bg-white dark:bg-slate-900">
            {sortedItems.map((g) => {
              const remarks = g.overallGrade != null ? g.remarks : null
              return (
                <tr
                  key={g.id || `${g.subjectCode}-${g.sectionCode}`}
                  className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                >
                  {/* 1. Subject */}
                  <td className="px-4 py-3 min-w-[200px]">
                    <p className="font-semibold text-slate-900 dark:text-white leading-tight">
                      {g.subjectCode}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {g.subjectName}
                    </p>
                  </td>

                  {/* 2. Section */}
                  <td className="whitespace-nowrap px-3.5 py-3 text-slate-700 dark:text-slate-300">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200/60 dark:border-slate-700/60">
                      {g.sectionCode || '—'}
                    </span>
                  </td>

                  {/* 3. Units */}
                  <td className="whitespace-nowrap px-3.5 py-3 text-right tabular-nums text-slate-700 dark:text-slate-300 font-medium text-sm">
                    {g.units != null ? g.units : '—'}
                  </td>

                  {/* 4. Prelim */}
                  <GradeCell value={g.prelimGrade} />

                  {/* 5. Midterm */}
                  <GradeCell value={g.midtermGrade} />

                  {/* 6. Pre-final */}
                  <GradeCell value={g.preFinalGrade} />

                  {/* 7. Final */}
                  <GradeCell value={g.finalGrade} />

                  {/* 8. Midterm grade */}
                  <GradeCell value={g.computedMidterm} strong />

                  {/* 9. Final grade */}
                  <GradeCell value={g.computedFinal} strong />

                  {/* 10. Overall */}
                  <GradeCell value={g.overallGrade} strong />

                  {/* 11. Remarks */}
                  <td className="whitespace-nowrap px-3.5 py-3">
                    {remarks && remarks !== '—' ? (
                      <Badge value={remarks}>{remarks}</Badge>
                    ) : (
                      <span className="text-slate-300 dark:text-slate-600 font-normal">—</span>
                    )}
                  </td>

                  {/* 12. Teacher's Name */}
                  <td className="whitespace-nowrap px-3.5 py-3 text-xs text-slate-700 dark:text-slate-300 font-medium">
                    {g.teacherName || '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            {/* Bottom row: tally only the number of units */}
            <tr className="border-t-2 border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/40 font-semibold text-sm">
              <td className="px-4 py-3 text-slate-700 dark:text-slate-200 font-bold whitespace-nowrap">
                Total Units
              </td>
              <td className="px-3.5 py-3"></td>
              <td className="px-3.5 py-3 text-right text-slate-900 dark:text-white font-bold tabular-nums whitespace-nowrap">
                {totalUnits}
              </td>
              <td className="px-3.5 py-3"></td>
              <td className="px-3.5 py-3"></td>
              <td className="px-3.5 py-3"></td>
              <td className="px-3.5 py-3"></td>
              <td className="px-3.5 py-3"></td>
              <td className="px-3.5 py-3"></td>
              <td className="px-3.5 py-3"></td>
              <td className="px-3.5 py-3"></td>
              <td className="px-3.5 py-3"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </Card>
  )
}

export default function GradesPage() {
  const grades = useApi('/grades/my')

  if (grades.loading && !grades.data) return <LoadingState />
  if (grades.error) return <ErrorState message={grades.error} onRetry={grades.reload} />

  const terms = groupByTerm(grades.data ?? [])

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Grades"
        description="1.00 is the highest grade and 3.00 is the lowest passing grade. Midterm = 40% prelim + 60% midterm; final = 40% pre-final + 60% final."
      />

      {terms.length === 0 ? (
        <Card>
          <EmptyState icon={GraduationCap} title="No grades yet">
            Grades appear here once you enroll in subjects or when your instructors submit them.
          </EmptyState>
        </Card>
      ) : (
        <div className="space-y-6">
          {terms.map((term) => (
            <TermGradesTable key={`${term.schoolYear}-${term.semester}`} term={term} />
          ))}
        </div>
      )}
    </div>
  )
}

function GradeCell({ value, strong = false }) {
  const missing = value === null || value === undefined
  return (
    <td
      className={`whitespace-nowrap px-3.5 py-3 text-right tabular-nums text-sm ${
        missing
          ? 'text-slate-300 dark:text-slate-600 font-normal'
          : strong
            ? 'font-bold text-slate-900 dark:text-white'
            : 'text-slate-700 dark:text-slate-300'
      }`}
    >
      {missing ? '—' : formatGrade(value)}
    </td>
  )
}
