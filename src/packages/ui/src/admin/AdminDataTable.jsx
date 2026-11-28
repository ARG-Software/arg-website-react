import { Fragment } from 'react';
import { Pagination } from '../navigation/Pagination.jsx';
import { UiCard } from '../primitives/UiCard.jsx';
import { UiSpinner } from '../primitives/UiSpinner.jsx';

// `selection` adds a checkbox column: { selectedKeys: string[], onChange(keys) }. The header box selects the rows on this page.
export function AdminDataTable({
  title,
  description,
  filters,
  filtersClassName = '',
  columns,
  rows,
  getRowKey = row => row.id,
  onRowClick,
  pagination,
  sort,
  onSortChange,
  rowActions,
  selection,
  loading = false,
  emptyMessage = 'No records found.',
  tone = 'default',
}) {
  return (
    <UiCard className="admin-data-table" tone={tone}>
      {(title || description || filters) && (
        <div className="admin-data-table__header">
          {(title || description) && (
            <div className="admin-data-table__intro">
              {title && <h2>{title}</h2>}
              {description && <p>{description}</p>}
            </div>
          )}
          {filters && (
            <div
              className={['admin-data-table__filters', filtersClassName].filter(Boolean).join(' ')}
            >
              {filters}
            </div>
          )}
        </div>
      )}

      {loading && (
        <div className="admin-data-table__loading">
          <UiSpinner label="Loading records…" />
        </div>
      )}

      {!loading && rows.length > 0 && (
        <div className="admin-data-table__scroll">
          <table>
            <thead>
              <tr>
                {selection && (
                  <th scope="col" className="admin-data-table__select-cell">
                    <input
                      type="checkbox"
                      aria-label="Select all rows on this page"
                      checked={rows.every(row => selection.selectedKeys.includes(getRowKey(row)))}
                      onChange={event =>
                        selection.onChange(event.target.checked ? rows.map(getRowKey) : [])
                      }
                    />
                  </th>
                )}
                {columns.map(column => {
                  const isSorted = sort?.sortBy === column.key;
                  const sortDirection = isSorted ? sort.sortDirection : undefined;

                  return (
                    <th key={column.key} scope="col" aria-sort={getAriaSort(column, sortDirection)}>
                      {column.sortable ? (
                        <button
                          type="button"
                          className="admin-data-table__sort"
                          onClick={() => onSortChange?.(column.key)}
                        >
                          {column.label}
                          <span className="admin-data-table__sort-indicator" aria-hidden="true">
                            {getSortIndicator(sortDirection)}
                          </span>
                        </button>
                      ) : (
                        column.label
                      )}
                    </th>
                  );
                })}
                {rowActions && <th scope="col">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr
                  key={getRowKey(row)}
                  onClick={() => onRowClick?.(row)}
                  onKeyDown={event => {
                    if (event.target !== event.currentTarget) return;
                    if (event.key === 'Enter' || event.key === ' ') onRowClick?.(row);
                  }}
                  tabIndex={0}
                >
                  {selection && (
                    <td
                      className="admin-data-table__select-cell"
                      onClick={event => event.stopPropagation()}
                      onKeyDown={event => event.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        aria-label="Select row"
                        checked={selection.selectedKeys.includes(getRowKey(row))}
                        onChange={event =>
                          selection.onChange(
                            event.target.checked
                              ? [...selection.selectedKeys, getRowKey(row)]
                              : selection.selectedKeys.filter(key => key !== getRowKey(row))
                          )
                        }
                      />
                    </td>
                  )}
                  {columns.map(column => {
                    const content = column.render ? column.render(row) : row[column.key];

                    return column.truncate ? (
                      <td key={column.key}>
                        <span
                          className="admin-data-table__truncate"
                          style={{ maxWidth: column.maxWidth }}
                          onMouseEnter={showFullTextWhenTruncated}
                        >
                          {typeof content === 'string' ? breakAtSeparators(content) : content}
                        </span>
                      </td>
                    ) : (
                      <td key={column.key}>{content}</td>
                    );
                  })}
                  {rowActions && (
                    <td
                      className="admin-data-table__actions-cell"
                      onClick={event => event.stopPropagation()}
                      onKeyDown={event => event.stopPropagation()}
                    >
                      {rowActions(row)}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && rows.length === 0 && <p className="admin-data-table__empty">{emptyMessage}</p>}

      {pagination && (
        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          onPageChange={pagination.onPageChange}
          ariaLabel={`${title || 'Table'} pagination`}
          className="admin-data-table__pagination"
          arrowIcon={<span aria-hidden="true">→</span>}
        />
      )}
    </UiCard>
  );
}

function breakAtSeparators(text) {
  return text.split(/(?<=[,./?&=:;_-])/).map((part, index) => (
    <Fragment key={index}>
      {index > 0 && <wbr />}
      {part}
    </Fragment>
  ));
}

function showFullTextWhenTruncated(event) {
  const cell = event.currentTarget;
  cell.title = cell.scrollHeight > cell.clientHeight ? cell.textContent : '';
}

function getSortIndicator(sortDirection) {
  if (sortDirection === 'asc') return '↑';
  if (sortDirection === 'desc') return '↓';

  return '↕';
}

function getAriaSort(column, sortDirection) {
  if (!column.sortable) return undefined;
  if (sortDirection === 'asc') return 'ascending';
  if (sortDirection === 'desc') return 'descending';

  return 'none';
}
