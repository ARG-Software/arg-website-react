const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;
const DEFAULT_MAX_PAGE_SIZE = 50;

export function getPagination(
  input: { page?: string | number; pageSize?: string | number } = {},
  options: { maxPageSize?: number } = {}
) {
  return {
    page: clampNumber(input.page, DEFAULT_PAGE, Number.MAX_SAFE_INTEGER, DEFAULT_PAGE),
    pageSize: clampNumber(
      input.pageSize,
      1,
      options.maxPageSize || DEFAULT_MAX_PAGE_SIZE,
      DEFAULT_PAGE_SIZE
    ),
  };
}

export function createPagination(page: number, pageSize: number, totalRecords: number) {
  return {
    page,
    pageSize,
    totalRecords,
    totalPages: Math.max(1, Math.ceil(totalRecords / pageSize)),
  };
}

function clampNumber(
  value: string | number | undefined,
  min: number,
  max: number,
  fallback: number
): number {
  const number = Number.parseInt(String(value || ''), 10);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(Math.max(number, min), max);
}
