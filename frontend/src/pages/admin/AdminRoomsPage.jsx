import { useMemo, useState } from 'react'
import { DoorOpen, Plus, Edit2, Trash2, ArrowUpDown, ArrowUp, ArrowDown, Building, Filter } from 'lucide-react'
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
} from '../../components/ui'
import { labelize } from '../../lib/format'

const ROOM_TYPES = ['LECTURE', 'LAB', 'FIELD']

export default function AdminRoomsPage() {
  const rooms = useApi('/rooms')

  const [formOpen, setFormOpen] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [formData, setFormData] = useState({
    roomName: '',
    capacity: 30,
    roomType: 'LECTURE',
    isActive: true,
  })
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [actionMessage, setActionMessage] = useState(null)

  // UX Filters & Sorting State
  const [selectedBuilding, setSelectedBuilding] = useState('ALL')
  const [sortField, setSortField] = useState('roomName') // 'roomName' | 'roomType' | 'capacity' | 'isActive'
  const [sortDirection, setSortDirection] = useState('asc') // 'asc' | 'desc'
  const [searchQuery, setSearchQuery] = useState('')

  const rawList = rooms.data ?? []

  // Extract unique building prefixes (e.g. RTL, NGE, GLE) dynamically from room names
  const detectedBuildings = useMemo(() => {
    const prefixes = new Set()
    for (const r of rawList) {
      const match = (r.roomName || '').trim().match(/^([A-Za-z]+)/)
      if (match) {
        prefixes.add(match[1].toUpperCase())
      }
    }
    return Array.from(prefixes).sort()
  }, [rawList])

  // Filter & Sort list
  const filteredAndSortedList = useMemo(() => {
    let result = [...rawList]

    // Building filter
    if (selectedBuilding !== 'ALL') {
      result = result.filter((r) =>
        (r.roomName || '').trim().toUpperCase().startsWith(selectedBuilding)
      )
    }

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      result = result.filter(
        (r) =>
          r.roomName.toLowerCase().includes(q) ||
          r.roomType.toLowerCase().includes(q) ||
          String(r.capacity).includes(q)
      )
    }

    // Sorting
    result.sort((a, b) => {
      let valA
      let valB

      if (sortField === 'roomName') {
        valA = a.roomName.toLowerCase()
        valB = b.roomName.toLowerCase()
      } else if (sortField === 'roomType') {
        valA = a.roomType.toLowerCase()
        valB = b.roomType.toLowerCase()
      } else if (sortField === 'capacity') {
        valA = a.capacity
        valB = b.capacity
      } else if (sortField === 'isActive') {
        valA = a.isActive ? 1 : 0
        valB = b.isActive ? 1 : 0
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    return result
  }, [rawList, selectedBuilding, searchQuery, sortField, sortDirection])

  if (rooms.loading && !rooms.data) return <LoadingState />
  if (rooms.error) return <ErrorState message={rooms.error} onRetry={rooms.reload} />

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const openCreate = () => {
    setEditingItem(null)
    setFormData({ roomName: '', capacity: 30, roomType: 'LECTURE', isActive: true })
    setFormError('')
    setFormOpen(true)
  }

  const openEdit = (room) => {
    setEditingItem(room)
    setFormData({
      roomName: room.roomName,
      capacity: room.capacity,
      roomType: room.roomType,
      isActive: room.isActive,
    })
    setFormError('')
    setFormOpen(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setFormError('')

    const name = formData.roomName.trim()
    if (!name) {
      setFormError('Room name cannot be empty.')
      return
    }

    // Client-side uniqueness check for instant feedback
    const duplicate = rawList.find(
      (r) =>
        r.roomName.trim().toLowerCase() === name.toLowerCase() &&
        (!editingItem || r.id !== editingItem.id)
    )
    if (duplicate) {
      setFormError(`A room with the name "${duplicate.roomName}" already exists (regardless of room type).`)
      return
    }

    setSubmitting(true)

    try {
      if (editingItem) {
        await api.put(`/rooms/${editingItem.id}`, formData)
        setActionMessage({ type: 'success', text: `Room "${name}" updated.` })
      } else {
        await api.post('/rooms', formData)
        setActionMessage({ type: 'success', text: `Room "${name}" created.` })
      }
      setFormOpen(false)
      rooms.reload()
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
      await api.delete(`/rooms/${deleteTarget.id}`)
      setActionMessage({ type: 'success', text: `Room "${deleteTarget.roomName}" deleted.` })
      setDeleteTarget(null)
      rooms.reload()
    } catch (err) {
      setActionMessage({ type: 'error', text: getErrorMessage(err) })
    } finally {
      setDeleting(false)
    }
  }

  const renderSortIcon = (field) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3 w-3 text-slate-400 opacity-60" />
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="h-3.5 w-3.5 text-accent font-bold" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5 text-accent font-bold" />
    )
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Rooms & Facilities Management"
        description="Configure academic lecture halls, computer laboratories, and building rooms."
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Add Room
          </Button>
        }
      />

      {actionMessage && (
        <Alert type={actionMessage.type} className="mb-4" onClose={() => setActionMessage(null)}>
          {actionMessage.text}
        </Alert>
      )}

      {/* Filter and Control Bar */}
      <div className="mb-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-xs">
        {/* Building Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mr-1.5">
            <Building className="h-3.5 w-3.5" /> Building:
          </span>
          <button
            onClick={() => setSelectedBuilding('ALL')}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
              selectedBuilding === 'ALL'
                ? 'bg-accent text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            All ({rawList.length})
          </button>
          {detectedBuildings.map((bldg) => {
            const count = rawList.filter((r) =>
              (r.roomName || '').trim().toUpperCase().startsWith(bldg)
            ).length
            const isSelected = selectedBuilding === bldg
            return (
              <button
                key={bldg}
                onClick={() => setSelectedBuilding(bldg)}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                  isSelected
                    ? 'bg-accent text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {bldg} ({count})
              </button>
            )
          })}
        </div>

        {/* Search input & Active count */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search room..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-40 sm:w-48 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-accent"
          />
          <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0">
            {filteredAndSortedList.length} of {rawList.length}
          </span>
        </div>
      </div>

      {/* Form modal */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 dark:bg-black/70" onClick={() => !submitting && setFormOpen(false)} />
          <div className="relative w-full max-w-md rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xl text-slate-900 dark:text-slate-100">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              {editingItem ? 'Edit Room' : 'Add New Room'}
            </h2>

            <form onSubmit={handleSave} className="mt-4 space-y-4">
              {formError && <Alert type="error">{formError}</Alert>}

              <Field
                label="Room Name"
                htmlFor="roomName"
                hint="Must be globally unique (e.g., RTL300, NGE101, GLE201). Name duplicates are blocked regardless of room type."
              >
                <input
                  id="roomName"
                  type="text"
                  required
                  value={formData.roomName}
                  onChange={(e) => setFormData({ ...formData, roomName: e.target.value })}
                  placeholder="e.g. RTL300 or NGE101"
                  className={inputClass}
                />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Capacity (Seats)" htmlFor="capacity">
                  <input
                    id="capacity"
                    type="number"
                    min="1"
                    max="500"
                    required
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
                    className={inputClass}
                  />
                </Field>

                <Field label="Room Type" htmlFor="roomType">
                  <select
                    id="roomType"
                    value={formData.roomType}
                    onChange={(e) => setFormData({ ...formData, roomType: e.target.value })}
                    className={inputClass}
                  >
                    {ROOM_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {labelize(t)}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  id="isActive"
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded border-slate-300 text-accent focus:ring-accent"
                />
                <label htmlFor="isActive" className="text-sm font-medium text-slate-700 cursor-pointer">
                  Room is active & available for class scheduling
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="secondary" onClick={() => setFormOpen(false)} disabled={submitting}>
                  Cancel
                </Button>
                <Button type="submit" loading={submitting}>
                  {editingItem ? 'Save Changes' : 'Create Room'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Room?"
        confirmLabel="Delete Room"
        variant="danger"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      >
        <p>
          Are you sure you want to delete room <strong>"{deleteTarget?.roomName}"</strong>? This action will fail if
          schedules currently reference this room.
        </p>
      </ConfirmDialog>

      {/* Table with interactive sort headers */}
      <Card bodyClassName="p-0">
        {filteredAndSortedList.length === 0 ? (
          <EmptyState icon={DoorOpen} title="No rooms match your filter">
            {searchQuery || selectedBuilding !== 'ALL'
              ? 'Try adjusting your building selection or search keywords.'
              : 'No rooms configured yet.'}
          </EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 select-none">
                  <th
                    onClick={() => toggleSort('roomName')}
                    className="cursor-pointer px-4 py-3 hover:text-slate-900 dark:hover:text-white transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Room Name</span>
                      {renderSortIcon('roomName')}
                    </div>
                  </th>

                  <th
                    onClick={() => toggleSort('roomType')}
                    className="cursor-pointer px-4 py-3 hover:text-slate-900 dark:hover:text-white transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Type</span>
                      {renderSortIcon('roomType')}
                    </div>
                  </th>

                  <th
                    onClick={() => toggleSort('capacity')}
                    className="cursor-pointer px-4 py-3 hover:text-slate-900 dark:hover:text-white transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Capacity</span>
                      {renderSortIcon('capacity')}
                    </div>
                  </th>

                  <th
                    onClick={() => toggleSort('isActive')}
                    className="cursor-pointer px-4 py-3 hover:text-slate-900 dark:hover:text-white transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Status</span>
                      {renderSortIcon('isActive')}
                    </div>
                  </th>

                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredAndSortedList.map((room) => (
                  <tr key={room.id} className={!room.isActive ? 'bg-slate-50/50 dark:bg-slate-900/50 text-slate-400 dark:text-slate-500' : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/40'}>
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        <span className="font-mono">{room.roomName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Badge tone={room.roomType === 'LAB' ? 'blue' : 'slate'}>{labelize(room.roomType)}</Badge>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-700 dark:text-slate-300">{room.capacity} seats</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {room.isActive ? <Badge tone="green">Active</Badge> : <Badge tone="slate">Inactive</Badge>}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(room)} title="Edit room">
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeleteTarget(room)}
                          className="text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                          title="Delete room"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
