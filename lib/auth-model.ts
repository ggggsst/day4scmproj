export type UserRole = 'ADMIN' | 'USER';

export function normalizeRole(value: unknown): UserRole | null {
  return value === 'ADMIN' || value === 'USER' ? value : null;
}

export function safeNextPath(value: string | null | undefined): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/';
  return value;
}
