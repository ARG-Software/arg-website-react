import { UiDatePicker } from '@ui/primitives/UiDatePicker.jsx';
import { UiField } from '@ui/primitives/UiField.jsx';

export function AdminTableFilters({ filters, onFilterChange }) {
  return (
    <div className="admin-table-filters">
      <UiField
        id="admin-company-search"
        aria-label="Search by company name"
        type="search"
        placeholder="Search company name"
        value={filters.companyName}
        onChange={event => onFilterChange('companyName', event.target.value)}
      />
      <UiDatePicker
        id="admin-date-sent-from"
        aria-label="Date sent from"
        value={filters.dateSentFrom}
        onChange={event => onFilterChange('dateSentFrom', event.target.value)}
      />
      <UiDatePicker
        id="admin-date-sent-to"
        aria-label="Date sent to"
        value={filters.dateSentTo}
        onChange={event => onFilterChange('dateSentTo', event.target.value)}
      />
    </div>
  );
}
