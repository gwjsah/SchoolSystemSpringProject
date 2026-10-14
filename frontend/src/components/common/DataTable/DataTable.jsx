import React from 'react'
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react'

/**
 * Standard DataTable component modeled directly from the reference Student Portal Grade Page.
 * Single source of truth for regular data tables across the system.
 */
export default function DataTable({
  columns = [],
  data = [],
  sortKey = null,
  sortDir = null,
  onSort = null,
  rowKey = (row, index) => row.id ?? index,
  rowClassName = null,
  children = null,
  footer = null,
  emptyMessage = 'No records found',
  emptyIcon = null,
  emptyAction = null,
  className = '',
  tableClassName = '',
}) {
  const getRowKey = (row, index) => {
    if (typeof rowKey === 'function') return rowKey(row, index)
    return row[rowKey] ?? index
  }

  const getRowClassName = (row, index) => {
    let custom = ''
    if (typeof rowClassName === 'function') {
      custom = rowClassName(row, index) || ''
    } else if (typeof rowClassName === 'string') {
      custom = rowClassName
    }
    return `hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors ${custom}`
  }

  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className={`min-w-full text-sm divide-y divide-slate-200 dark:divide-slate-800 ${tableClassName}`}>
        {columns && columns.length > 0 && (
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {columns.map((col, index) => {
                const colKey = typeof col === 'string' ? col : (col.key || `col-${index}`)
                const colLabel = typeof col === 'string' ? col : col.label
                const align = typeof col === 'object' ? col.align : 'left'
                const isSortable = typeof col === 'object' && Boolean(col.sortable)
                const isActive = Boolean(sortKey && colKey && sortKey === colKey)
                const sortType = typeof col === 'object' ? (col.sortType || 'text') : 'text'

                const handleHeaderClick = () => {
                  if (isSortable && onSort) {
                    onSort(colKey, sortType)
                  }
                }

                let alignClass = 'text-left'
                let justifyClass = 'justify-start'
                if (align === 'right') {
                  alignClass = 'text-right'
                  justifyClass = 'justify-end'
                } else if (align === 'center') {
                  alignClass = 'text-center'
                  justifyClass = 'justify-center'
                }

                const sortTooltip = isSortable
                  ? sortType === 'number'
                    ? `Click to sort by ${colLabel} (${isActive ? (sortDir === 'asc' ? 'High → Low' : 'Default') : 'Low → High'})`
                    : `Click to sort by ${colLabel} (${isActive ? (sortDir === 'asc' ? 'Z → A' : 'Default') : 'A → Z'})`
                  : undefined

                return (
                  <th
                    key={colKey}
                    onClick={handleHeaderClick}
                    title={sortTooltip}
                    className={`whitespace-nowrap px-3.5 py-3 select-none transition-colors ${alignClass} ${
                      isSortable ? 'cursor-pointer group hover:bg-slate-100/70 dark:hover:bg-slate-800/60' : ''
                    } ${typeof col === 'object' && col.headerClassName ? col.headerClassName : ''}`}
                  >
                    {typeof col === 'object' && col.headerRender ? (
                      col.headerRender({ col, isActive, sortDir, sortKey })
                    ) : (
                      <div className={`inline-flex items-center gap-1.5 ${justifyClass}`}>
                        <span
                          className={`text-xs font-semibold uppercase tracking-wider transition-colors ${
                            isActive
                              ? 'text-accent font-bold'
                              : 'text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white'
                          }`}
                        >
                          {colLabel}
                        </span>
                        {isSortable && (
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
                        )}
                      </div>
                    )}
                  </th>
                )
              })}
            </tr>
          </thead>
        )}
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 bg-white dark:bg-slate-900">
          {children ? (
            children
          ) : data && data.length > 0 ? (
            data.map((row, index) => (
              <tr key={getRowKey(row, index)} className={getRowClassName(row, index)}>
                {columns.map((col, cIdx) => {
                  const colKey = typeof col === 'string' ? col : (col.key || `col-${cIdx}`)
                  const align = typeof col === 'object' ? col.align : 'left'
                  let alignClass = 'text-left'
                  if (align === 'right') alignClass = 'text-right'
                  else if (align === 'center') alignClass = 'text-center'

                  let content = null
                  if (typeof col === 'object' && col.render) {
                    content = col.render(row, index)
                  } else if (typeof col === 'string') {
                    content = row[col]
                  } else if (col.key) {
                    content = row[col.key]
                  }

                  return (
                    <td
                      key={colKey}
                      className={`px-3.5 py-3 ${alignClass} ${
                        typeof col === 'object' && col.className ? col.className : ''
                      }`}
                    >
                      {content !== null && content !== undefined && content !== '' ? (
                        content
                      ) : (
                        <span className="text-slate-300 dark:text-slate-600 font-normal">—</span>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))
          ) : (
            <tr>
              <td
                colSpan={columns.length || 1}
                className="px-4 py-12 text-center text-sm text-slate-500 dark:text-slate-400"
              >
                {emptyIcon && (
                  <div className="flex justify-center mb-2 text-slate-300 dark:text-slate-600">
                    {emptyIcon}
                  </div>
                )}
                <p className="font-medium">{emptyMessage}</p>
                {emptyAction && <div className="mt-2">{emptyAction}</div>}
              </td>
            </tr>
          )}
        </tbody>
        {footer && <tfoot>{footer}</tfoot>}
      </table>
    </div>
  )
}

