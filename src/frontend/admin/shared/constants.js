export const ADMIN_ROUTES = {
  dashboard: '/admin/',
  all: '/admin/all/',
  sent: '/admin/sent/',
  notSent: '/admin/not-sent/',
  aiBot: '/admin/ai-bot/',
  visits: '/admin/visits/',
  visitsAll: '/admin/visits/all/',
  help: '/admin/help/',
  settings: '/admin/settings/',
};

export const CHART_RANGES = [
  { value: 'all', label: 'All time' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: 'monthly', label: 'Monthly' },
];

export const VISIT_CHART_RANGES = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'this_week', label: 'This week' },
  { value: 'last_week', label: 'Last week' },
  { value: 'this_month', label: 'This month' },
  { value: 'two_months', label: 'Two months' },
  { value: 'all_time', label: 'All time' },
];

export const VISIT_CHART_SERIES_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'page_views', label: 'Page views' },
  { value: 'visits', label: 'Visits' },
  { value: 'events', label: 'Events' },
];

export const VISIT_CHART_LINES = [
  { dataKey: 'pageViews', name: 'Page views', color: '#f0060d' },
  { dataKey: 'visits', name: 'Visits', color: '#7904fd' },
  { dataKey: 'events', name: 'Events', color: '#ffb020' },
];

export const PAGE_SIZE = 10;
export const SEARCH_DEBOUNCE_MS = 350;

export const EMPTY_TABLE_FILTERS = {
  companyName: '',
  contactMethod: '',
  dateSentFrom: '',
  dateSentTo: '',
};

export const EMPTY_FORM = {
  companyName: '',
  website: '',
  contactEmail: '',
  contactInfo: '',
  contactMethod: '',
  fitReason: '',
  emailSubject: '',
  emailBody: '',
  status: 'not_sent',
  dateSent: '',
  followUpDate: '',
  replyObtained: false,
  replySummary: '',
  notes: '',
};

export function createEmptyTableData() {
  return {
    records: [],
    pagination: {
      page: 1,
      pageSize: PAGE_SIZE,
      totalRecords: 0,
      totalPages: 1,
    },
  };
}
