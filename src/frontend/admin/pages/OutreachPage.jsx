import { useState } from 'react';
import { useOutreachRecords, useUpdateOutreachRecord } from '../queries/outreachQueries';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { OutreachTable } from '../components/OutreachTable';
import { OutreachFilters } from '../components/OutreachFilters';

export default function OutreachPage() {
  const [filters, setFilters] = useState({
    status: '',
    search: '',
    page: 1,
    limit: 10,
  });

  const debouncedSearch = useDebouncedValue(filters.search, 300);
  const query = { ...filters, search: debouncedSearch };
  const { data, isLoading } = useOutreachRecords(query);
  const updateMutation = useUpdateOutreachRecord();

  const handleFilterChange = newFilters => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 }));
  };

  const handlePageChange = page => {
    setFilters(prev => ({ ...prev, page }));
  };

  const handleStatusChange = async (id, status) => {
    await updateMutation.mutateAsync({ id, changes: { status } });
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="outreach-page">
      <div className="outreach-page__header">
        <h2>Outreach Management</h2>
      </div>
      <OutreachFilters filters={filters} onChange={handleFilterChange} />
      <OutreachTable
        records={data?.records || []}
        pagination={data?.pagination}
        onPageChange={handlePageChange}
        onStatusChange={handleStatusChange}
      />
    </div>
  );
}
