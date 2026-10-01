import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
export default function AdminModal({ title, children, onClose, busy = false }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.showModal();
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
    };
  }, []);
  return createPortal(
    <dialog
      ref={ref}
      className="am-modal am-page"
      aria-label={title}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      <header className="am-modal-header">
        <div>
          <small>FYCE / CHI TIẾT</small>
          <h2>{title}</h2>
        </div>
        <button
          type="button"
          aria-label="Đóng chi tiết"
          disabled={busy}
          onClick={onClose}
        >
          ✕
        </button>
      </header>
      <div className="am-modal-body">{children}</div>
    </dialog>,
    document.body,
  );
}
