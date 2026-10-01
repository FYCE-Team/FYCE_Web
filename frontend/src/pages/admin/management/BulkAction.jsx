import { createPortal } from "react-dom";
import { useState, useEffect, useRef } from "react";
import { useAdminApi } from "../../../services/admin.service.js";
function Confirmation({ children, onClose, busy }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  return createPortal(
    <dialog
      ref={ref}
      className="am-card am-confirm-dialog"
      aria-label="Xác nhận thao tác hàng loạt"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      {children}
    </dialog>,
    document.body,
  );
}
export default function BulkAction({
  kind,
  filters = {},
  action = "trash",
  onDone,
  label,
  disabled = false,
}) {
  const api = useAdminApi();
  const [confirmation, setConfirmation] = useState("");
  const destructive = action === "trash" || action === "purge";
  const [preview, setPreview] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const run = async (confirm) => {
    setBusy(true);
    setError("");
    try {
      if (!confirm) {
        setConfirmation("");
        setPreview(
          await api("/admin/bulk/preview", {
            method: "POST",
            body: { kind, action, filters },
          }),
        );
      } else {
        await api("/admin/bulk/execute", {
          method: "POST",
          body: {
            token: preview.token,
            ...(action === "purge" ? { confirmation } : {}),
          },
        });
        setPreview(null);
        onDone?.();
      }
    } catch (e) {
      setError(e.message);
      if (confirm) setPreview(null);
    } finally {
      setBusy(false);
    }
  };
  return (
    <span className="am-bulk-action">
      <button
        type="button"
        className={destructive ? "am-danger" : ""}
        disabled={busy || disabled}
        onClick={() => run(false)}
      >
        {label ||
          (action === "purge"
            ? "Xóa vĩnh viễn tất cả"
            : action === "trash"
              ? "Xóa tất cả"
              : "Khôi phục tất cả")}
      </button>
      {error && (
        <span role="alert" className="am-notice am-error">
          {error}
        </span>
      )}
      {preview && (
        <Confirmation onClose={() => setPreview(null)} busy={busy}>
          <h2>
            {action === "purge"
              ? "Xóa vĩnh viễn"
              : action === "trash"
                ? "Chuyển vào thùng rác"
                : "Khôi phục"}{" "}
            {preview.count} bản ghi?
          </h2>
          <p>
            {preview.names.join(" · ")}
            {preview.count > 5 ? "…" : ""}
          </p>
          <p>
            {action === "purge"
              ? "Không thể khôi phục sau thao tác này. Hệ thống đã kiểm tra ràng buộc và bảo vệ dữ liệu thanh toán. Chỉ các bản ghi đã chốt ở trên được xóa."
              : action === "restore-seats"
                ? "Chỉ mở bán lại ghế bị khóa. Ghế đang giữ và đã bán được giữ nguyên."
                : "Áp dụng cho danh sách đã chốt theo bộ lọc. Có thể khôi phục từ Thùng rác. Đơn/vé đã thanh toán vẫn có hiệu lực; muốn hủy vé cần dùng chức năng xác nhận hoàn tiền."}
          </p>
          {action === "purge" && (
            <label className="am-purge-confirm">
              Nhập XOA VINH VIEN để xác nhận
              <input
                autoComplete="off"
                value={confirmation}
                disabled={busy}
                onChange={(e) => setConfirmation(e.target.value)}
              />
            </label>
          )}
          <div className="am-actions">
            <button
              autoFocus
              type="button"
              disabled={busy}
              onClick={() => setPreview(null)}
            >
              Quay lại
            </button>
            <button
              type="button"
              className="am-primary"
              disabled={
                busy ||
                !preview.count ||
                (action === "purge" && confirmation !== "XOA VINH VIEN")
              }
              onClick={() => run(true)}
            >
              {busy ? "Đang xử lý…" : "Xác nhận"}
            </button>
          </div>
        </Confirmation>
      )}
    </span>
  );
}
