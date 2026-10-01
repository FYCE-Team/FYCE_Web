import { useRecordSelection } from "./useRecordSelection.js";
import { useEffect, useState } from "react";
import { useAdminApi, dateTime } from "../../../services/admin.service.js";
import { Notice, PageTitle, Pagination } from "./AdminShared.jsx";
import BulkAction from "./BulkAction.jsx";
export default function AdminTrash() {
  const api = useAdminApi();
  const [kind, setKind] = useState("events"),
    [page, setPage] = useState(1),
    [q, setQ] = useState(""),
    [revision, setRevision] = useState(0),
    [data, setData] = useState({ items: [], total: 0 }),
    [error, setError] = useState("");
  const selection = useRecordSelection(
    data.items,
    `${kind}:${q}:${page}:${revision}`,
  );
  const reload = () => setRevision((v) => v + 1);
  useEffect(() => {
    const c = new AbortController();
    api(`/admin/trash/${kind}?page=${page}&q=${encodeURIComponent(q)}`, {
      signal: c.signal,
    })
      .then((value) => {
        setData(value);
        setError("");
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      });
    return () => c.abort();
  }, [api, kind, page, q, revision]);
  return (
    <div className="am-page">
      <PageTitle
        title="Thùng rác"
        description="Khôi phục dữ liệu quản trị. Vé đã thanh toán và lịch sử mua hàng vẫn được giữ nguyên."
      >
        <BulkAction
          kind={kind}
          action="restore"
          filters={{ ids: selection.ids }}
          disabled={!selection.ids.length}
          label={`Khôi phục đã chọn (${selection.ids.length})`}
          onDone={reload}
        />
        <BulkAction
          key={`${kind}:${q}`}
          kind={kind}
          action="restore"
          filters={{ q }}
          onDone={reload}
        />
        <BulkAction
          kind={kind}
          action="purge"
          filters={{ ids: selection.ids }}
          disabled={!selection.ids.length}
          label={`Xóa vĩnh viễn đã chọn (${selection.ids.length})`}
          onDone={reload}
        />
        <BulkAction
          key={`purge:${kind}:${q}`}
          kind={kind}
          action="purge"
          filters={{ q }}
          onDone={reload}
        />
      </PageTitle>
      <p className="am-notice">
        Xóa vĩnh viễn không thể khôi phục. Đơn/vé đã ghi nhận tiền và dữ liệu
        còn liên quan được bảo vệ để giữ lịch sử đối soát. Đơn chưa thanh toán
        chỉ có thể xóa khi đã hủy/hết hạn, được tạo ít nhất 48 giờ trước và
        không có dấu vết xử lý thanh toán.
      </p>
      <div className="am-filters">
        <label>
          Loại dữ liệu
          <select
            value={kind}
            onChange={(e) => {
              setKind(e.target.value);
              setPage(1);
            }}
          >
            {Object.entries({
              events: "Sự kiện",
              users: "Người dùng",
              bookings: "Đơn vé",
              tickets: "Vé",
              hero: "Banner",
              about: "Giới thiệu",
              gallery: "Thư viện ảnh",
            }).map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Tìm kiếm
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
          />
        </label>
      </div>
      <Notice error={error} />
      <div className="am-card">
        <div className="am-table-wrap">
          <table className="am-table">
            <thead>
              <tr>
                <th className="am-select-cell">
                  <input
                    type="checkbox"
                    aria-label="Chọn tất cả trong trang thùng rác"
                    checked={selection.all}
                    onChange={selection.toggleAll}
                    disabled={selection.disabled}
                  />
                </th>
                <th>Nội dung</th>
                <th>Đã xóa lúc</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((row) => (
                <tr key={row._id}>
                  <td className="am-select-cell">
                    <input
                      type="checkbox"
                      aria-label={`Chọn ${row.title || row.fullName || row.ticketCode || row.bookingCode || "ảnh"}`}
                      checked={selection.ids.includes(row._id)}
                      onChange={() => selection.toggle(row._id)}
                    />
                  </td>
                  <td>
                    {row.title ||
                      row.fullName ||
                      row.ticketCode ||
                      row.bookingCode ||
                      "Hình ảnh"}
                    <small>{row.email}</small>
                  </td>
                  <td>{dateTime(row.deletedAt)}</td>
                  <td className="am-trash-actions">
                    <BulkAction
                      kind={kind}
                      action="restore"
                      filters={{ ids: [row._id] }}
                      label="Khôi phục"
                      onDone={reload}
                    />
                    <BulkAction
                      kind={kind}
                      action="purge"
                      filters={{ ids: [row._id] }}
                      label="Xóa vĩnh viễn"
                      onDone={reload}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!data.items.length && <p className="am-empty">Thùng rác trống.</p>}
      </div>
      <Pagination page={page} total={data.total} onChange={setPage} />
    </div>
  );
}
