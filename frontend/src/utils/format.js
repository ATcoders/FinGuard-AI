const inrFull = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

export const inr = (n) => inrFull.format(Number(n || 0));

// ₹12.5 L / ₹3.2 Cr, the way Indian finance teams read large figures.
export function inrCompact(n) {
  const v = Number(n || 0);
  const abs = Math.abs(v);
  if (abs >= 1e7) return `₹${(v / 1e7).toFixed(2).replace(/\.?0+$/, '')} Cr`;
  if (abs >= 1e5) return `₹${(v / 1e5).toFixed(2).replace(/\.?0+$/, '')} L`;
  return inr(v);
}

export function monthLabel(ym) {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleString('en-IN', { month: 'short' }) + ` ’${String(y).slice(2)}`;
}

export function dateTime(iso) {
  if (!iso) return 'Never';
  return new Date(iso.endsWith('Z') ? iso : `${iso}Z`).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export const ROLE_LABEL = {
  employee: 'Employee', manager: 'Manager', finance: 'Finance',
  director: 'Director', cfo: 'CFO', admin: 'Administrator',
};
export const ROLE_TONE = {
  employee: 'neutral', manager: 'info', finance: 'ok', director: 'warn', cfo: 'warn', admin: 'risk',
};
export const ROLE_OPTIONS = Object.entries(ROLE_LABEL).map(([value, label]) => ({ value, label }));

export const STATUS_LABEL = {
  draft: 'Draft', submitted: 'Submitted', under_validation: 'Under validation',
  pending_approval: 'Pending approval', under_investigation: 'Under investigation',
  approved: 'Approved', rejected: 'Rejected', payment_ready: 'Payment ready',
  processing: 'Processing', paid: 'Paid', failed: 'Failed',
};

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const passwordProblem = (p) => {
  if (!p || p.length < 8) return 'Use at least 8 characters';
  if (/^[A-Za-z]+$/.test(p) || /^\d+$/.test(p)) return 'Mix letters with numbers or symbols';
  return null;
};
