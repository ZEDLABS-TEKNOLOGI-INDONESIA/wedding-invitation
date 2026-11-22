const FORMULA_PREFIX = /^[=+\-@\t\r]/;

export const escapeCsvCell = (value: unknown): string => {
  if (value === null || value === undefined) return '""';
  let str = String(value).replace(/\r?\n/g, " ");
  if (FORMULA_PREFIX.test(str)) {
    str = `'${str}`;
  }
  return `"${str.replace(/"/g, '""')}"`;
};
