import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Clock, User } from 'lucide-react'
import api, { getErrorMessage } from '../../api/client'
import { useApi } from '../../hooks/useApi'
import {
  Alert,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  Table,
} from '../../components/ui'
import { formatDate, formatSchedules, formatTerm, labelize } from '../../lib/format'

const isActive = (e) => e.status === 'ENROLLED' || e.status === 'PENDING'

/** Groups enrollments by term, newest term first. */
function groupByTerm(enrollments) {
  const groups = new Map()
  for (const e of enrollments) {
    const key = `${e.schoolYear}|${e.semester}`
    if (!groups.has(key)) groups.set(key, { semester: e.semester, schoolYear: e.schoolYear, items: [], latest: 0 })
    const group = groups.get(key)
    group.items.push(e)
    group.latest = Math.max(group.latest, new Date(e.enrolledAt).getTime() || 0)
  }
  return [...groups.values()].sort((a, b) => b.latest - a.latest)
}

export default function MySubjectsPage() {
  const enrollments = useApi('/enrollment')
  // EnrollmentDto has no schedules, so all sections are loaded once and matched by id.
  const sections = useApi('/sections')
  const [toDrop, setToDrop] = useState(null)
  const [dropping, setDropping] = useState(false)
  const [message, setMessage] = useState(null)

  if (enrollments.loading && !enrollments.data) return <LoadingState />
  if (enrollments.error) return <ErrorState message={enrollments.error} onRetry={enrollments.reload} />

  const sectionById = new Map((sections.data ?? []).map((s) => [s.id, s]))
  const terms = groupByTerm(enrollments.data ?? [])

  const drop = async () => {
    setDropping(true)
    try {
      await api.post(`/enrollment/${toDrop.id}/drop`)
      setMessage({ type: 'success', text: `${toDrop.subjectCode} was dropped.` })
      setToDrop(null)
      enrollments.reload()
      sections.reload()
    } catch (err) {
      setMessage({ type: 'error', text: getErrorMessage(err) })
      setToDrop(null)
    } finally {
      setDropping(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="My Subjects" description="Your enrolled subjects, schedules and enrollment history." />

      {message && (
        <Alert type={message.type} className="mb-4" onClose={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}

      {terms.length === 0 ? (
        <Card>
          <EmptyState icon={BookOpen} title="You have no subjects yet">
            <Link to="/student/enrollment" className="font-medium text-accent hover:underline">
              Go to enrollment
            </Link>
          </EmptyState>
        </Card>
      ) : (
        <div className="space-y-6">
          {terms.map((term, index) => {
            const activeUnits = term.items.filter(isActive).reduce((sum, e) => sum + e.units, 0)
            return (
              <Card
                key={`${term.schoolYear}-${term.semester}`}
                title={formatTerm(term.semester, term.schoolYear)}
                actions={
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    {activeUnits} units{index === 0 && ' · current'}
                  </span>
                }
                bodyClassName=""
              >
                <Table columns={['Subject', 'Section', 'Schedule', 'Units', 'Status', { label: '', align: 'right' }]}>
                  {term.items.map((e) => {
                    const section = sectionById.get(e.sectionId)
                    return (
                      <tr key={e.id} className={e.status === 'DROPPED' ? 'text-slate-400 dark:text-slate-500' : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/40'}>
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-900 dark:text-white">{e.subjectCode}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{e.subjectName}</p>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 font-mono">{e.sectionCode}</td>
                        <td className="px-4 py-3">
                          {section ? (
                            <div className="space-y-0.5 text-xs text-slate-600 dark:text-slate-300">
                              {formatSchedules(section.schedules).map((line) => (
                                <p key={line} className="flex items-center gap-1.5 whitespace-nowrap">
                                  <Clock className="h-3.5 w-3.5 shrink-0" /> {line}
                                </p>
                              ))}
                              {section.facultyName && (
                                <p className="flex items-center gap-1.5">
                                  <User className="h-3.5 w-3.5 shrink-0" /> {section.facultyName}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 dark:text-slate-500">{sections.loading ? 'Loading…' : '—'}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{e.units}</td>
                        <td className="px-4 py-3">
                          <Badge value={e.status}>{labelize(e.status)}</Badge>
                          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{formatDate(e.enrolledAt)}</p>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {isActive(e) && (
                            <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40" onClick={() => setToDrop(e)}>
                              Drop
                            </Button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </Table>
              </Card>
            )
          })}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(toDrop)}
        title={`Drop ${toDrop?.subjectCode}?`}
        confirmLabel="Drop subject"
        variant="danger"
        loading={dropping}
        onConfirm={drop}
        onCancel={() => setToDrop(null)}
      >
        <p>
          You will be removed from <strong>{toDrop?.sectionCode}</strong> ({toDrop?.subjectName}) and your slot will be
          given up. This can't be undone.
        </p>
      </ConfirmDialog>
    </div>
  )
}

