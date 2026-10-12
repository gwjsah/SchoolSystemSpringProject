import { useState } from 'react'
import { Megaphone, Plus, Edit2, Archive, Trash2, CheckCircle2 } from 'lucide-react'
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
import { formatDate, labelize } from '../../lib/format'

const CATEGORIES = ['GENERAL', 'ENROLLMENT', 'EXAM', 'HOLIDAY', 'REMINDER']
const TARGET_AUDIENCES = ['ALL', 'STUDENTS', 'FACULTY', 'ADMIN']

export default function AdminAnnouncementsPage() {
  const announcements = useApi('/announcements/all')

  const [formOpen, setFormOpen] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'GENERAL',
    targetAudience: 'ALL',
  })
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [confirmDialog, setConfirmDialog] = useState(null) // { action: 'delete'|'archive', item }
  const [dialogLoading, setDialogLoading] = useState(false)
  const [actionMessage, setActionMessage] = useState(null)

  if (announcements.loading && !announcements.data) return <LoadingState />
  if (announcements.error) return <ErrorState message={announcements.error} onRetry={announcements.reload} />

  const list = announcements.data ?? []

  const openCreate = () => {
    setEditingItem(null)
    setFormData({ title: '', content: '', category: 'GENERAL', targetAudience: 'ALL' })
    setFormError('')
    setFormOpen(true)
  }

  const openEdit = (item) => {
    setEditingItem(item)
    setFormData({
      title: item.title,
      content: item.content,
      category: item.category,
      targetAudience: item.targetAudience,
    })
    setFormError('')
    setFormOpen(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setFormError('')
    setSubmitting(true)

    try {
      if (editingItem) {
        await api.put(`/announcements/${editingItem.id}`, formData)
        setActionMessage({ type: 'success', text: 'Announcement updated successfully.' })
      } else {
        await api.post('/announcements', formData)
        setActionMessage({ type: 'success', text: 'New announcement posted.' })
      }
      setFormOpen(false)
      announcements.reload()
    } catch (err) {
      setFormError(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  const handleArchive = async () => {
    if (!confirmDialog?.item) return
    setDialogLoading(true)
    try {
      await api.patch(`/announcements/${confirmDialog.item.id}/archive`)
      setActionMessage({ type: 'success', text: 'Announcement archived.' })
      setConfirmDialog(null)
      announcements.reload()
    } catch (err) {
      setActionMessage({ type: 'error', text: getErrorMessage(err) })
    } finally {
      setDialogLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirmDialog?.item) return
    setDialogLoading(true)
    try {
      await api.delete(`/announcements/${confirmDialog.item.id}`)
      setActionMessage({ type: 'success', text: 'Announcement deleted permanently.' })
      setConfirmDialog(null)
      announcements.reload()
    } catch (err) {
      setActionMessage({ type: 'error', text: getErrorMessage(err) })
    } finally {
      setDialogLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Announcements Management"
        description="Publish bulletins, announcements, and reminders for campus groups."
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> New Announcement
          </Button>
        }
      />

      {actionMessage && (
        <Alert type={actionMessage.type} className="mb-4" onClose={() => setActionMessage(null)}>
          {actionMessage.text}
        </Alert>
      )}

      {/* Create / Edit Form Modal */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 dark:bg-black/70" onClick={() => !submitting && setFormOpen(false)} />
          <div className="relative w-full max-w-lg rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xl text-slate-900 dark:text-slate-100">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              {editingItem ? 'Edit Announcement' : 'Create New Announcement'}
            </h2>

            <form onSubmit={handleSave} className="mt-4 space-y-4">
              {formError && <Alert type="error">{formError}</Alert>}

              <Field label="Title" htmlFor="title">
                <input
                  id="title"
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Enrollment Period Extended"
                  className={inputClass}
                />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Category" htmlFor="category">
                  <select
                    id="category"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className={inputClass}
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {labelize(cat)}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Target Audience" htmlFor="targetAudience">
                  <select
                    id="targetAudience"
                    value={formData.targetAudience}
                    onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
                    className={inputClass}
                  >
                    {TARGET_AUDIENCES.map((aud) => (
                      <option key={aud} value={aud}>
                        {labelize(aud)}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <Field label="Message Content" htmlFor="content">
                <textarea
                  id="content"
                  rows={4}
                  required
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Type the announcement details here..."
                  className={inputClass}
                />
              </Field>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="secondary" onClick={() => setFormOpen(false)} disabled={submitting}>
                  Cancel
                </Button>
                <Button type="submit" loading={submitting}>
                  {editingItem ? 'Save Changes' : 'Post Announcement'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation modal for archive / delete */}
      <ConfirmDialog
        open={Boolean(confirmDialog)}
        title={confirmDialog?.action === 'archive' ? 'Archive Announcement?' : 'Delete Announcement?'}
        confirmLabel={confirmDialog?.action === 'archive' ? 'Archive' : 'Delete'}
        variant={confirmDialog?.action === 'archive' ? 'primary' : 'danger'}
        loading={dialogLoading}
        onConfirm={confirmDialog?.action === 'archive' ? handleArchive : handleDelete}
        onCancel={() => setConfirmDialog(null)}
      >
        <p>
          Are you sure you want to {confirmDialog?.action === 'archive' ? 'archive' : 'permanently delete'}{' '}
          <strong>"{confirmDialog?.item?.title}"</strong>?
        </p>
      </ConfirmDialog>

      {/* Table list */}
      <Card bodyClassName="p-0">
        {list.length === 0 ? (
          <EmptyState icon={Megaphone} title="No announcements posted yet" />
        ) : (
          <Table columns={['Title & Content', 'Category', 'Audience', 'Posted Date', 'Status', { label: 'Actions', align: 'right' }]}>
            {list.map((item) => (
              <tr key={item.id} className={item.isArchived ? 'bg-slate-50/50 dark:bg-slate-900/50 text-slate-400 dark:text-slate-500' : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/40'}>
                <td className="px-4 py-3 max-w-sm">
                  <p className="font-semibold text-slate-900 dark:text-white">{item.title}</p>
                  <p className="line-clamp-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">{item.content}</p>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <Badge value={item.category}>{labelize(item.category)}</Badge>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{labelize(item.targetAudience)}</span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-500 dark:text-slate-400">
                  {formatDate(item.postedAt, true)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {item.isArchived ? (
                    <Badge tone="slate">Archived</Badge>
                  ) : (
                    <Badge tone="green">Active</Badge>
                  )}
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openEdit(item)}
                      title="Edit announcement"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    {!item.isArchived && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setConfirmDialog({ action: 'archive', item })}
                        title="Archive announcement"
                      >
                        <Archive className="h-3.5 w-3.5 text-amber-600" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setConfirmDialog({ action: 'delete', item })}
                      className="text-red-600 hover:bg-red-50"
                      title="Delete permanently"
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

