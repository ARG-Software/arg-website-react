import { UiDatePicker } from '@ui/primitives/UiDatePicker.jsx';
import { UiField, UiSelect } from '@ui/primitives/UiField.jsx';
import { OUTREACH_CONTACT_METHODS } from '../../outreach.js';

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
      <UiSelect
        id="admin-contact-method-filter"
        label="Contact method"
        labelHidden
        aria-label="Contact method"
        value={filters.contactMethod}
        onChange={event => onFilterChange('contactMethod', event.target.value)}
      >
        <option value="">All methods</option>
        {OUTREACH_CONTACT_METHODS.map(method => (
          <option key={method.value} value={method.value}>
            {method.label}
          </option>
        ))}
      </UiSelect>
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
