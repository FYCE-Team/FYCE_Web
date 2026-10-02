import { useState } from "react";
import { Download } from "lucide-react";
import { useAdminApi } from "../../../services/admin.service.js";
export default function ExportRecords({ kind, filters, ids }) {
  const api = useAdminApi();
  const [format, setFormat] = useState("xlsx"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const run = async (target, selected = false) => {
    setBusy(true);
    setError("");
    try {
      const query = new URLSearchParams({
        ...filters,
        format,
        ...(selected ? { ids: ids.join(",") } : {}),
      });
      query.delete("page");
      query.delete("limit");
      const blob = await api(`/admin/export/${target}?${query}`, {
        download: true,
      });
      const url = URL.createObjectURL(blob),
        a = document.createElement("a");
      a.href = url;
      a.download = `FYCE-${target}-${new Date().toISOString().slice(0, 10)}.${format}`;
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="am-export">
      <div className="am-actions">
        <select
          aria-label="Định dạng xuất"
          value={format}
          onChange={(e) => setFormat(e.target.value)}
          disabled={busy}
        >
          <option value="xlsx">Excel (.xlsx)</option>
          <option value="csv">CSV UTF-8</option>
        </select>
        <button disabled={busy} onClick={() => run(kind)}>
          <Download size={15} />
          {busy ? "Đang xuất…" : "Xuất theo bộ lọc"}
        </button>
        <button disabled={busy || !ids.length} onClick={() => run(kind, true)}>
          Xuất đã chọn ({ids.length})
        </button>
        {kind === "bookings" && (
          <button disabled={busy} onClick={() => run("payments")}>
            <Download size={15} />
            Xuất thanh toán
          </button>
        )}
      </div>
      <small>
        Tất cả kết quả đang lọc, tối đa 10.000 dòng. File chứa thông tin khách
        mời; chỉ chia sẻ cho người được phép.
      </small>
      {error && (
        <p role="alert" className="am-error">
          {error}
        </p>
      )}
    </div>
  );
}
