import { AdminMetricChart } from './AdminMetricChart.jsx';

export default {
  title: 'Admin/AdminMetricChart',
  component: AdminMetricChart,
};

const ranges = [
  { value: 'all', label: 'All time' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: 'monthly', label: 'Monthly' },
];

const points = [
  { label: '2026-08-13', sent: 12, replied: 2 },
  { label: '2026-08-14', sent: 18, replied: 4 },
  { label: '2026-08-15', sent: 7, replied: 3 },
  { label: '2026-08-16', sent: 22, replied: 6 },
  { label: '2026-08-17', sent: 16, replied: 5 },
];

export const Default = {
  args: {
    title: 'Sent vs replied',
    description: 'Outbound performance over the selected period.',
    range: '7d',
    ranges,
    points,
  },
};
