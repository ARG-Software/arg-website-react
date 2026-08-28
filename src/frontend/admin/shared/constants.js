export const ADMIN_ROUTES = {
  dashboard: '/admin/',
  all: '/admin/all/',
  sent: '/admin/sent/',
  notSent: '/admin/not-sent/',
  aiBot: '/admin/ai-bot/',
  visits: '/admin/visits/',
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
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '2m', label: 'Last 2 months' },
];

export const VISIT_CHART_LINES = [
  { dataKey: 'visits', name: 'Page views', color: '#f0060d' },
  { dataKey: 'uniqueVisitors', name: 'Visits', color: '#7904fd' },
];

export const PAGE_SIZE = 10;
export const SEARCH_DEBOUNCE_MS = 350;

export const EMPTY_TABLE_FILTERS = {
  companyName: '',
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
