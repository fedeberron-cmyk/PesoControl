import { format, isToday, isYesterday, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  if (isToday(d)) return 'Hoy';
  if (isYesterday(d)) return 'Ayer';
  return format(d, "d 'de' MMM", { locale: es });
}

export function formatDateFull(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, "EEEE d 'de' MMMM, yyyy", { locale: es });
}

export function formatNumber(n: number): string {
  return n.toLocaleString('es-MX');
}

export function formatWeight(kg: number): string {
  return `${kg.toFixed(1)} kg`;
}

export function toDateString(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}
