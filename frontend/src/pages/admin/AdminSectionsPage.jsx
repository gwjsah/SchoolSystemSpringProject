import { useState } from 'react'
import { Users, Plus, Edit2, Trash2, Clock, User, CheckCircle2, AlertCircle } from 'lucide-react'
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
  Field,
  inputClass,
  LoadingState,
  PageHeader,
  Table,
} from '../../components/ui'
import { formatSchedules, formatTime, labelize } from '../../lib/format'

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']

export default function AdminSectionsPage() {
  const sections = useApi('/sections')
  const subjects = useApi('/subjects')
  const faculty = useApi('/faculty')
  const rooms = useApi('/rooms')

  const [formOpen, setFormOpen] = useState(false)
  const [editingItem, setEditingItem] = useState(null)

  const [formData, setFormData] = useState({
    subjectCode: '',
    facultyId: '',
    capacity: 30,
    schedules: [
      { day: 'MONDAY', startTime: '08:00', endTime: '10:00', roomId: '' },
    ],
  })

  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [actionMessage, setActionMessage] = useState(null)

  const loading =
    (sections.loading && !sections.data) ||
    (subjects.loading && !subjects.data) ||
    (faculty.loading && !faculty.data) ||
    (rooms.loading && !rooms.data)

  if (loading) return <LoadingState />
  if (sections.error) return <ErrorState message={sections.error} onRetry={sections.reload} />

  const sectionList = sections.data ?? []
  const subjectList = subjects.data ?? []
  const facultyList = faculty.data ?? []
  const roomList = (rooms.data ?? []).filter((r) => r.isActive)

  const openCreate = () => {
    setEditingItem(null)
    setFormData({
      subjectCode: subjectList[0]?.subjectCode || '',
      facultyId: facultyList[0]?.id || '',
      capacity: 30,
      schedules: [
        { day: 'MONDAY', startTime: '08:00', endTime: '10:00', roomId: roomList[0]?.id || '' },
      ],
    })
    setFormError('')
    setFormOpen(true)
  }

  const openEdit = (sec) => {
    setEditingItem(sec)
    setFormData({
      subjectCode: sec.subjectCode,
      facultyId: sec.facultyId,
      capacity: sec.capacity,
      schedules: (sec.schedules || []).map((s) => ({
        day: s.day,
        startTime: s.startTime.substring(0, 5),
        endTime: s.endTime.substring(0, 5),
        roomId: s.roomId,
      })),
    })
    setFormError('')
    setFormOpen(true)
  }

  const addScheduleRow = () => {
    setFormData((prev) => ({
      ...prev,
      schedules: [
        ...prev.schedules,
        { day: 'WEDNESDAY', startTime: '08:00', endTime: '10:00', roomId: roomList[0]?.id || '' },
      ],
    }))
  }

  const removeScheduleRow = (idx) => {
    setFormData((prev) => ({
      ...prev,
      schedules: prev.schedules.filter((_, i) => i !== idx),
    }))
  }

  const updateScheduleRow = (idx, field, value) => {
    setFormData((prev) => ({
      ...prev,
      schedules: prev.schedules.map((s, i) => (i === idx ? { ...s, [field]: value } : s)),
    }))
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setFormError('')

    if (formData.schedules.length === 0) {
      setFormError('At least one schedule time slot is required.')
      return
    }

    setSubmitting(true)

    const payload = {
      subjectCode: formData.subjectCode,
      facultyId: formData.facultyId,
      capacity: formData.capacity,
      schedules: formData.schedules.map((s) => ({
        day: s.day,
        startTime: `${s.startTime}:00`,
        endTime: `${s.endTime}:00`,
        roomId: s.roomId,
      })),
    }

    try {
      if (editingItem) {
        await api.put(`/sections/${editingItem.id}`, payload)
        setActionMessage({ type: 'success', text: `Section "${editingItem.sectionCode}" updated.` })
      } else {
        const res = await api.post('/sections', payload)
        setActionMessage({ type: 'success', text: `New section "${res.data.sectionCode}" created.` })
      }
      setFormOpen(false)
      sections.reload()
    } catch (err) {
      setFormError(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.delete(`/sections/${deleteTarget.id}`)
      setActionMessage({ type: 'success', text: `Section "${deleteTarget.sectionCode}" deleted.` })
      setDeleteTarget(null)
      sections.reload()
    } catch (err) {
      setActionMessage({ type: 'error', text: getErrorMessage(err) })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Class Sections Management"
        description="Create academic sections, allocate classroom schedules, and assign faculty."
        actions={
          <Button onClick={openCreate} disabled={subjectList.length === 0 || facultyList.length === 0}>
            <Plus className="h-4 w-4" /> Create Section
          </Button>
        }
      />

      {actionMessage && (
        <Alert type={actionMessage.type} className="mb-4" onClose={() => setActionMessage(null)}>
          {actionMessage.text}
        </Alert>
      )}

      {/* Form modal */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 dark:bg-black/70" onClick={() => !submitting && setFormOpen(false)} />
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xl text-slate-900 dark:text-slate-100">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              {editingItem ? `Edit Section: ${editingItem.sectionCode}` : 'Create New Section'}
            </h2>

            <form onSubmit={handleSave} className="mt-4 space-y-4">
              {formError && <Alert type="error">{formError}</Alert>}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Subject" htmlFor="subjectCode">
                  <select
                    id="subjectCode"
                    disabled={Boolean(editingItem)}
                    value={formData.subjectCode}
                    onChange={(e) => setFormData({ ...formData, subjectCode: e.target.value })}
                    className={inputClass}
                  >
                    {subjectList.map((sub) => (
                      <option key={sub.subjectCode} value={sub.subjectCode}>
                        {sub.subjectCode} - {sub.subjectName} ({sub.units}u)
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Assigned Faculty" htmlFor="facultyId">
                  <select
                    id="facultyId"
                    value={formData.facultyId}
                    onChange={(e) => setFormData({ ...formData, facultyId: e.target.value })}
                    className={inputClass}
                  >
                    {facultyList.map((fac) => (
                      <option key={fac.id} value={fac.id}>
                        {fac.name} ({fac.department})
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <Field label="Student Capacity (1 - 50)" htmlFor="capacity">
                <input
                  id="capacity"
                  type="number"
                  min="1"
                  max="50"
                  required
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
                  className={inputClass}
                />
              </Field>

              {/* Schedules Table in Form */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase">Class Schedule Slots</span>
                  <Button type="button" size="sm" variant="secondary" onClick={addScheduleRow}>
                    <Plus className="h-3 w-3" /> Add Day Slot
                  </Button>
                </div>

                {formData.schedules.map((row, idx) => (
                  <div key={idx} className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 first:border-t-0">
                    <select
                      value={row.day}
                      onChange={(e) => updateScheduleRow(idx, 'day', e.target.value)}
                      className="rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 py-1.5 px-2 text-xs"
                    >
                      {DAYS.map((d) => (
                        <option key={d} value={d}>
                          {labelize(d)}
                        </option>
                      ))}
                    </select>

                    <input
                      type="time"
                      value={row.startTime}
                      onChange={(e) => updateScheduleRow(idx, 'startTime', e.target.value)}
                      className="rounded border border-slate-300 py-1 px-1.5 text-xs"
                    />
                    <span className="text-xs text-slate-400">to</span>
                    <input
                      type="time"
                      value={row.endTime}
                      onChange={(e) => updateScheduleRow(idx, 'endTime', e.target.value)}
                      className="rounded border border-slate-300 py-1 px-1.5 text-xs"
                    />

                    <select
                      value={row.roomId}
                      onChange={(e) => updateScheduleRow(idx, 'roomId', e.target.value)}
                      className="flex-1 rounded border border-slate-300 py-1.5 px-2 text-xs min-w-[130px]"
                    >
                      {roomList.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.roomName} ({labelize(r.roomType)})
                        </option>
                      ))}
                    </select>

                    {formData.schedules.length > 1 && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => removeScheduleRow(idx)}
                        className="text-red-500 hover:bg-red-50 p-1"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="secondary" onClick={() => setFormOpen(false)} disabled={submitting}>
                  Cancel
                </Button>
                <Button type="submit" loading={submitting}>
                  {editingItem ? 'Save Changes' : 'Create Section'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={`Delete Section ${deleteTarget?.sectionCode}?`}
        confirmLabel="Delete Section"
        variant="danger"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      >
        <p>
          Are you sure you want to delete section <strong>"{deleteTarget?.sectionCode}"</strong> ({deleteTarget?.subjectName})?
          This action will fail if any students have already enrolled in it.
        </p>
      </ConfirmDialog>

      {/* Sections Table */}
      <Card bodyClassName="p-0">
        {sectionList.length === 0 ? (
          <EmptyState icon={Users} title="No class sections created yet" />
        ) : (
          <Table columns={['Section & Subject', 'Instructor', 'Weekly Schedules', 'Enrollment', 'Status', { label: 'Actions', align: 'right' }]}>
            {sectionList.map((sec) => (
              <tr key={sec.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-white">{sec.sectionCode}</span>
                    <span className="text-xs font-mono text-slate-500 dark:text-slate-400">({sec.subjectCode})</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">{sec.subjectName}</p>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className="flex items-center gap-1.5 text-xs text-slate-800 dark:text-slate-200">
                    <User className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                    {sec.facultyName || 'TBA'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="space-y-0.5 text-xs text-slate-600 dark:text-slate-300">
                    {formatSchedules(sec.schedules).map((line) => (
                      <p key={line} className="flex items-center gap-1.5 whitespace-nowrap">
                        <Clock className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 shrink-0" /> {line}
                      </p>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {sec.currentCount} / {sec.capacity} seats
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <Badge value={sec.full ? 'FULL' : 'OPEN'} tone={sec.full ? 'red' : 'green'}>
                    {sec.full ? 'Full' : `${sec.availableSlots} Open`}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <div className="flex items-center justify-end gap-1">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(sec)} title="Edit section">
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeleteTarget(sec)}
                      className="text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                      title="Delete section"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  )
}

