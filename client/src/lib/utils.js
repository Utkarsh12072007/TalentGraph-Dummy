import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatDateTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export function timeAgo(value) {
  if (!value) return '';
  const seconds = Math.floor((Date.now() - new Date(value).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(value);
}

export function formatSalary(min, max, currency = 'USD') {
  const fmt = (n) =>
    new Intl.NumberFormat(undefined, { notation: n >= 100000 ? 'compact' : 'standard', maximumFractionDigits: 1 }).format(n);
  if (min && max) return `${fmt(min)} – ${fmt(max)} ${currency}`;
  if (min) return `From ${fmt(min)} ${currency}`;
  if (max) return `Up to ${fmt(max)} ${currency}`;
  return null;
}

export const EXPERIENCE_LABELS = { ENTRY: 'Entry level (0–1y)', MID: 'Mid level (2–3y)', SENIOR: 'Senior (4–6y)', LEAD: 'Lead (7y+)' };
export const WORK_MODE_LABELS = { ON_SITE: 'On-site', REMOTE: 'Remote', HYBRID: 'Hybrid' };
export const EMPLOYMENT_LABELS = { FULL_TIME: 'Full-time', PART_TIME: 'Part-time', CONTRACT: 'Contract', INTERNSHIP: 'Internship' };
export const APPLICATION_STATUS_LABELS = {
  APPLIED: 'Applied', IN_REVIEW: 'In review', SHORTLISTED: 'Shortlisted', INTERVIEW: 'Interview',
  OFFERED: 'Offered', REJECTED: 'Rejected', WITHDRAWN: 'Withdrawn',
};
export const COMPANY_ROLE_LABELS = { ADMIN: 'Admin', RECRUITER: 'Recruiter', INTERVIEWER: 'Interviewer' };

export function initialsOf(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');
}

// Profile completion used on the candidate dashboard (honest calculation
// from real fields, not a fake percentage).
export function profileCompletion(profile) {
  if (!profile) return { percent: 0, missing: [] };
  const checks = [
    ['Headline', profile.headline],
    ['Summary', profile.summary],
    ['Location', profile.location],
    ['Education', profile.educations?.length],
    ['Experience', profile.experiences?.length],
    ['Skills', profile.skills?.length],
  ];
  const done = checks.filter(([, v]) => (Array.isArray(v) ? v > 0 : Boolean(v)));
  return {
    percent: Math.round((done.length / checks.length) * 100),
    missing: checks.filter(([, v]) => (Array.isArray(v) ? !v : !v)).map(([label]) => label),
  };
}
