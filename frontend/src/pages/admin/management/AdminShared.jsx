import { labels } from "../../../services/admin.service.js";
export function Badge({ value }) {
  return (
    <span className={`am-badge am-${value}`}>{labels[value] || value}</span>
  );
}
export function PageTitle({
  eyebrow = "FYCE / QUẢN TRỊ",
  title,
  description,
  children,
}) {
  return (
    <header className="am-title">
      <div>
        <small>{eyebrow}</small>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="am-actions">{children}</div>
    </header>
  );
}
export function Pagination({ page, total, limit = 20, onChange, busy }) {
  return (
    <div className="am-pagination">
      <span>
        {total} bản ghi · Trang {page} / {Math.max(1, Math.ceil(total / limit))}
      </span>
      <button disabled={busy || page <= 1} onClick={() => onChange(page - 1)}>
        Trước
      </button>
      <button
        disabled={busy || page * limit >= total}
        onClick={() => onChange(page + 1)}
      >
        Sau
      </button>
    </div>
  );
}
export function Notice({ error, message }) {
  return error ? (
    <p className="am-notice am-error" role="alert">
      {error}
    </p>
  ) : message ? (
    <p className="am-notice" role="status">
      {message}
    </p>
  ) : null;
}
