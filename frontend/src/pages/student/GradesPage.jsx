import { GraduationCap } from 'lucide-react'
import { useApi } from '../../hooks/useApi'
import { Badge, Card, EmptyState, ErrorState, LoadingState, PageHeader, Table } from '../../components/ui'
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

export default function GradesPage() {
  const grades = useApi('/grades/my')

  if (grades.loading && !grades.data) return <LoadingState />
  if (grades.error) return <ErrorState message={grades.error} onRetry={grades.reload} />

  const terms = groupByTerm(grades.data ?? [])

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Grades"
        description="1.00 is the highest grade and 3.00 is the lowest passing grade. Midterm = 40% prelim + 60% midterm; final = 40% pre-final + 60% final."
      />

      {terms.length === 0 ? (
        <Card>
          <EmptyState icon={GraduationCap} title="No grades yet">
            Grades appear here once your instructors submit them.
          </EmptyState>
        </Card>
      ) : (
        <div className="space-y-6">
          {terms.map((term) => (
            <Card key={`${term.schoolYear}-${term.semester}`} title={formatTerm(term.semester, term.schoolYear)} bodyClassName="">
              <Table
                columns={[
                  'Subject',
                  { label: 'Prelim', align: 'right' },
                  { label: 'Midterm', align: 'right' },
                  { label: 'Pre-final', align: 'right' },
                  { label: 'Final', align: 'right' },
                  { label: 'Midterm grade', align: 'right' },
                  { label: 'Final grade', align: 'right' },
                  { label: 'Overall', align: 'right' },
                  'Remarks',
                ]}
              >
                {term.items.map((g) => {
                  // Remarks only mean something once there is an overall grade.
                  const remarks = g.overallGrade != null ? g.remarks : null
                  return (
                    <tr key={g.id}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900 dark:text-white">{g.subjectCode}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {g.subjectName} · {g.sectionCode}
                        </p>
                      </td>
                      <GradeCell value={g.prelimGrade} />
                      <GradeCell value={g.midtermGrade} />
                      <GradeCell value={g.preFinalGrade} />
                      <GradeCell value={g.finalGrade} />
                      <GradeCell value={g.computedMidterm} strong />
                      <GradeCell value={g.computedFinal} strong />
                      <GradeCell value={g.overallGrade} strong />
                      <td className="px-4 py-3">
                        {remarks ? (
                          <Badge value={remarks}>{remarks}</Badge>
                        ) : (
                          <span className="text-xs text-slate-400 dark:text-slate-500">In progress</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </Table>
            </Card>
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
      className={`whitespace-nowrap px-4 py-3 text-right tabular-nums ${
        missing ? 'text-slate-300 dark:text-slate-600' : strong ? 'font-semibold text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'
      }`}
    >
      {formatGrade(value)}
    </td>
  )
}

