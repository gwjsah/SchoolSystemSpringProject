import { useState, useMemo } from 'react'
import {
  Megaphone,
  Plus,
  Edit2,
  Archive,
  Trash2,
  RotateCcw,
  Search,
  X,
  Filter,
} from 'lucide-react'
import api, { getErrorMessage } from '../../api/client'
import { useApi } from '../../hooks/useApi'
import {
  Alert,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  DataTable,
  EmptyState,
  ErrorState,
  Field,
  inputClass,
  LoadingState,
  PageHeader,
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

  // Column Filtering and Sorting State
  const [searchQuery, setSearchQuery] = useState('')
  const [titleSort, setTitleSort] = useState('none') // 'none' | 'asc' | 'desc'
  const [categoryFilter, setCategoryFilter] = useState('ALL') // 'ALL' | string
  const [audienceFilter, setAudienceFilter] = useState('ALL') // 'ALL' | string
  const [dateSort, setDateSort] = useState('desc') // 'desc' (Latest-Oldest) | 'asc' (Oldest-Latest)
  const [statusFilter, setStatusFilter] = useState('ALL') // 'ALL' | 'ACTIVE' | 'ARCHIVED'
  const [primarySort, setPrimarySort] = useState('date') // 'title' | 'date'

  const list = announcements.data ?? []

  // Filter & sort logic
  const filteredAndSortedList = useMemo(() => {
    return list
      .filter((item) => {
        // Category filter
        if (categoryFilter !== 'ALL' && item.category !== categoryFilter) {
          return false
        }
        // Audience filter
        if (audienceFilter !== 'ALL' && item.targetAudience !== audienceFilter) {
          return false
        }
        // Status filter (Active or Archived)
        if (statusFilter === 'ACTIVE' && item.isArchived) {
          return false
        }
        if (statusFilter === 'ARCHIVED' && !item.isArchived) {
          return false
        }
        // Search query on title and content
        if (searchQuery.trim()) {
          const q = searchQuery.trim().toLowerCase()
          const title = (item.title || '').toLowerCase()
          const content = (item.content || '').toLowerCase()
          if (!title.includes(q) && !content.includes(q)) {
            return false
          }
        }
        return true
      })
      .sort((a, b) => {
        // If sorting primarily by Title (A-Z or Z-A)
        if (primarySort === 'title' && titleSort !== 'none') {
          const comp = (a.title || '').localeCompare(b.title || '', undefined, { sensitivity: 'base' })
          if (comp !== 0) {
            return titleSort === 'asc' ? comp : -comp
          }
        }

        // Sorting by Posted Date (Oldest-Latest or Latest-Oldest)
        const dateA = new Date(a.postedAt || 0).getTime()
        const dateB = new Date(b.postedAt || 0).getTime()
        const dateComp = dateSort === 'asc' ? dateA - dateB : dateB - dateA
        if (dateComp !== 0) return dateComp

        // Secondary fallback
        return (a.title || '').localeCompare(b.title || '', undefined, { sensitivity: 'base' })
      })
  }, [list, categoryFilter, audienceFilter, statusFilter, searchQuery, primarySort, titleSort, dateSort])

  const handleToggleTitleSort = () => {
    const next = titleSort === 'asc' ? 'desc' : 'asc'
    setTitleSort(next)
    setPrimarySort('title')
  }

  const handleToggleDateSort = () => {
    const next = dateSort === 'desc' ? 'asc' : 'desc'
    setDateSort(next)
    setPrimarySort('date')
    setTitleSort('none')
  }

  const hasActiveFilters =
    categoryFilter !== 'ALL' ||
    audienceFilter !== 'ALL' ||
    statusFilter !== 'ALL' ||
    Boolean(searchQuery.trim()) ||
    titleSort !== 'none' ||
    dateSort !== 'desc'

  const resetAllFilters = () => {
    setSearchQuery('')
    setTitleSort('none')
    setCategoryFilter('ALL')
    setAudienceFilter('ALL')
    setDateSort('desc')
    setStatusFilter('ALL')
    setPrimarySort('date')
  }

  if (announcements.loading && !announcements.data) return <LoadingState />
  if (announcements.error) return <ErrorState message={announcements.error} onRetry={announcements.reload} />

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
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !submitting && setFormOpen(false)} />
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
      <Card bodyClassName="p-0 overflow-hidden">
        {list.length === 0 ? (
          <EmptyState icon={Megaphone} title="No announcements posted yet" />
        ) : (
          <div>
            {/* Quick search and summary bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Quick search title or content..."
                  className="w-full pl-8 pr-8 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-accent"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Showing <strong className="text-slate-700 dark:text-slate-200">{filteredAndSortedList.length}</strong> of{' '}
                  <strong className="text-slate-700 dark:text-slate-200">{list.length}</strong> announcements
                </span>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={resetAllFilters}
                    className="inline-flex items-center gap-1 text-xs text-rose-600 dark:text-rose-400 hover:underline font-medium ml-2 cursor-pointer"
                  >
                    <RotateCcw className="h-3 w-3" /> Clear filters
                  </button>
                )}
              </div>
            </div>

            {/* Table with column filter controls */}
            <DataTable
              columns={[
                {
                  key: 'title',
                  headerClassName: 'min-w-[260px] align-top',
                  headerRender: () => (
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-300 mb-1.5">
                        <span className={primarySort === 'title' && titleSort !== 'none' ? 'text-accent font-bold' : ''}>
                          Title & Content
                        </span>
                      </div>
                      <select
                        value={titleSort}
                        onChange={(e) => {
                          const val = e.target.value
                          setTitleSort(val)
                          if (val === 'none') {
                            setPrimarySort('date')
                          } else {
                            setPrimarySort('title')
                          }
                        }}
                        className="w-full text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-accent"
                      >
                        <option value="none">Sort: Default</option>
                        <option value="asc">Title: A → Z</option>
                        <option value="desc">Title: Z → A</option>
                      </select>
                    </div>
                  ),
                },
                {
                  key: 'category',
                  headerClassName: 'min-w-[150px] align-top',
                  headerRender: () => (
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-300 mb-1.5">
                        Category
                      </div>
                      <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="w-full text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-accent"
                      >
                        <option value="ALL">All Categories</option>
                        {CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {labelize(cat)}
                          </option>
                        ))}
                      </select>
                    </div>
                  ),
                },
                {
                  key: 'audience',
                  headerClassName: 'min-w-[130px] align-top',
                  headerRender: () => (
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-300 mb-1.5">
                        Audience
                      </div>
                      <select
                        value={audienceFilter}
                        onChange={(e) => setAudienceFilter(e.target.value)}
                        className="w-full text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-accent"
                      >
                        <option value="ALL">All Audiences</option>
                        {TARGET_AUDIENCES.filter((a) => a !== 'ALL').map((aud) => (
                          <option key={aud} value={aud}>
                            {labelize(aud)}
                          </option>
                        ))}
                      </select>
                    </div>
                  ),
                },
                {
                  key: 'postedDate',
                  headerClassName: 'min-w-[160px] align-top',
                  headerRender: () => (
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-300 mb-1.5">
                        <span className={primarySort === 'date' ? 'text-accent font-bold' : ''}>Posted Date</span>
                      </div>
                      <select
                        value={dateSort}
                        onChange={(e) => {
                          const val = e.target.value
                          setDateSort(val)
                          setPrimarySort('date')
                          setTitleSort('none')
                        }}
                        className="w-full text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-accent"
                      >
                        <option value="desc">Latest → Oldest</option>
                        <option value="asc">Oldest → Latest</option>
                      </select>
                    </div>
                  ),
                },
                {
                  key: 'status',
                  headerClassName: 'min-w-[130px] align-top',
                  headerRender: () => (
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-300 mb-1.5">
                        Status
                      </div>
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-accent"
                      >
                        <option value="ALL">All Status</option>
                        <option value="ACTIVE">Active</option>
                        <option value="ARCHIVED">Archived</option>
                      </select>
                    </div>
                  ),
                },
                {
                  key: 'actions',
                  align: 'right',
                  headerClassName: 'min-w-[100px] align-top',
                  headerRender: () => (
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-300 mb-1.5 text-right">
                        Actions
                      </div>
                      {hasActiveFilters ? (
                        <button
                          type="button"
                          onClick={resetAllFilters}
                          className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 py-1 transition-colors cursor-pointer"
                          title="Reset all filters and sorting"
                        >
                          <RotateCcw className="h-3 w-3" />
                          Reset
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400 dark:text-slate-600 py-1 block">—</span>
                      )}
                    </div>
                  ),
                },
              ]}
            >
                  {filteredAndSortedList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center">
                        <div className="flex flex-col items-center justify-center text-slate-500 dark:text-slate-400">
                          <Filter className="h-8 w-8 mb-2 opacity-40 text-slate-400" />
                          <p className="font-medium text-sm text-slate-700 dark:text-slate-200">
                            No announcements match your filters
                          </p>
                          <p className="text-xs mt-1 text-slate-500 dark:text-slate-400">
                            Try adjusting your category, status, or search keywords.
                          </p>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={resetAllFilters}
                            className="mt-3"
                          >
                            <RotateCcw className="h-3.5 w-3.5" /> Reset Filters
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredAndSortedList.map((item) => (
                      <tr
                        key={item.id}
                        className={
                          item.isArchived
                            ? 'bg-slate-50/50 dark:bg-slate-900/50 text-slate-400 dark:text-slate-500'
                            : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/40'
                        }
                      >
                        <td className="px-4 py-3 max-w-sm">
                          <p className="font-semibold text-slate-900 dark:text-white">{item.title}</p>
                          <p className="line-clamp-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {item.content}
                          </p>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <Badge value={item.category}>{labelize(item.category)}</Badge>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                            {labelize(item.targetAudience)}
                          </span>
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
                            <button
                              type="button"
                              onClick={() => setConfirmDialog({ action: 'delete', item })}
                              className="rounded p-1.5 text-slate-400 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer"
                              title="Delete permanently"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
            </DataTable>
          </div>
        )}
      </Card>
    </div>
  )
}

