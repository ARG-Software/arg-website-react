export function OutreachFilters({ filters, onChange }) {
  return (
    <div className="outreach-filters">
      <div className="outreach-filters__search">
        <input
          type="text"
          placeholder="Search by company, contact, or notes..."
          value={filters.search || ''}
          onChange={e => onChange({ search: e.target.value })}
        />
      </div>

      <div className="outreach-filters__status">
        <select value={filters.status || ''} onChange={e => onChange({ status: e.target.value })}>
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="contacted">Contacted</option>
          <option value="replied">Replied</option>
          <option value="converted">Converted</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>
    </div>
  );
}
