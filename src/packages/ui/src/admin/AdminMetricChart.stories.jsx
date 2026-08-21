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
  { label: '2026-08-13', sent: 12, repliesObtained: 2 },
  { label: '2026-08-14', sent: 18, repliesObtained: 4 },
  { label: '2026-08-15', sent: 7, repliesObtained: 3 },
  { label: '2026-08-16', sent: 22, repliesObtained: 6 },
  { label: '2026-08-17', sent: 16, repliesObtained: 5 },
];

const pie = [
  { label: 'Replies obtained', value: 20 },
  { label: 'Sent without reply', value: 55 },
];

export const Default = {
  args: {
    title: 'Sent and replies',
    description: 'Outbound performance over the selected period.',
    range: '7d',
    ranges,
    points,
    pie,
  },
};

export const Light = {
  args: {
    title: 'Sent and replies',
    description: 'Outbound performance over the selected period.',
    range: '7d',
    ranges,
    points,
    pie,
    tone: 'light',
  },
};

export const Empty = {
  args: {
    title: 'Sent and replies',
    description: 'Outbound performance over the selected period.',
    range: '7d',
    ranges,
    points: [],
    pie: [],
    tone: 'light',
  },
};
