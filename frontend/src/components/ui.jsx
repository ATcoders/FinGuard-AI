import { useEffect, useState } from 'react';

export function Stamp({ tone = 'neutral', children }) {
  return <span className={`stamp stamp-${tone}`}>{children}</span>;
}

export function Field({ label, error, hint, children, className = '' }) {
  return (
    <div className={`field${error ? ' has-error' : ''} ${className}`}>
      <label>{label}</label>
      {children}
      {error ? <span className="field-error">{error}</span> : hint ? <span className="field-hint">{hint}</span> : null}
    </div>
  );
}

export function EmptyState({ title, text, action }) {
  return (
    <div className="empty">
      <div className="empty-rules"><i /><i /><i /></div>
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="empty">
      <h3>Something went wrong</h3>
      <p>{message}</p>
      {onRetry && <button className="btn" onClick={onRetry}>Try again</button>}
    </div>
  );
}

export function SkeletonRows({ rows = 5, cols = 5 }) {
  return (
    <div className="table-wrap">
      <table className="ledger" aria-busy="true">
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r}>
              {Array.from({ length: cols }).map((__, c) => (
                <td key={c}><span className="skeleton" style={{ width: `${55 + ((r * 7 + c * 13) % 40)}%` }} /></td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Eases a figure up from zero so the dashboard feels alive without being noisy.
export function useCountUp(target, duration = 700) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const end = Number(target || 0);
    if (!end) { setValue(0); return undefined; }
    let raf;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration);
      setValue(end * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}
