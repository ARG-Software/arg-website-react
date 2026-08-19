import { Pagination } from '../navigation/Pagination.jsx';
import { UiCard } from '../primitives/UiCard.jsx';

export function AdminDataTable({
  title,
  description,
  columns,
  rows,
  getRowKey = row => row.id,
  onRowClick,
  pagination,
  emptyMessage = 'No records found.',
}) {
  return (
    <UiCard className="admin-data-table">
      {(title || description) && (
        <div className="admin-data-table__header">
          {title && <h2>{title}</h2>}
          {description && <p>{description}</p>}
        </div>
      )}

      {rows.length ? (
        <div className="admin-data-table__scroll">
          <table>
            <thead>
              <tr>
                {columns.map(column => (
                  <th key={column.key} scope="col">
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr
                  key={getRowKey(row)}
                  onClick={() => onRowClick?.(row)}
                  onKeyDown={event => {
                    if (event.key === 'Enter' || event.key === ' ') onRowClick?.(row);
                  }}
                  tabIndex={0}
                >
                  {columns.map(column => (
                    <td key={column.key}>{column.render ? column.render(row) : row[column.key]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="admin-data-table__empty">{emptyMessage}</p>
      )}

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
