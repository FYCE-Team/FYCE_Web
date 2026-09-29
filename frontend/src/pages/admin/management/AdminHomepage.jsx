import { useEffect, useRef, useState } from "react";
import { useAdminApi, mediaUrl } from "../../../services/admin.service.js";
import { Notice, PageTitle, Pagination } from "./AdminShared.jsx";
const names = {
  hero: "Banner chính",
  about: "Giới thiệu",
  gallery: "Thư viện ảnh",
};
const fields = {
  hero: [
    ["eyebrow", "Dòng mở đầu", 100],
    ["title", "Tiêu đề", 200],
    ["subtitle", "Tiêu đề phụ", 300],
    ["description", "Mô tả", 1000],
    ["primaryButtonText", "Nút chính", 100],
    ["primaryButtonLink", "Liên kết nút chính"],
    ["secondaryButtonText", "Nút phụ", 100],
    ["secondaryButtonLink", "Liên kết nút phụ"],
    ["backgroundImage", "Ảnh nền"],
    ["backgroundVideoUrl", "Video nền"],
  ],
  about: [
    ["eyebrow", "Dòng mở đầu", 100],
    ["title", "Tiêu đề", 200],
    ["subtitle", "Tiêu đề phụ", 300],
    ["description", "Nội dung giới thiệu", 1500],
    ["image", "Ảnh giới thiệu"],
    ["imageAlt", "Mô tả ảnh", 200],
    ["buttonText", "Nhãn nút", 100],
    ["buttonLink", "Liên kết nút"],
  ],
  gallery: [
    ["title", "Tiêu đề", 150],
    ["image", "Hình ảnh"],
    ["altText", "Mô tả ảnh", 200],
    ["caption", "Chú thích", 300],
  ],
};
export default function AdminHomepage() {
  const api = useAdminApi();
  const [kind, setKind] = useState("hero"),
    [page, setPage] = useState(1),
    [data, setData] = useState({ items: [], total: 0 });
  const [editor, setEditor] = useState(null),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [loadedKey, setLoadedKey] = useState(null),
    [revision, setRevision] = useState(0),
    [events, setEvents] = useState([]),
    [pendingDelete, setPendingDelete] = useState(null);
  const panelRef = useRef(null);
  const panelKey = pendingDelete ? `delete:${pendingDelete._id}` : editor ? `edit:${editor._id || "new"}` : "";
  useEffect(() => {
    if (panelKey) {
      panelRef.current?.focus({ preventScroll: true });
      panelRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
    }
  }, [panelKey]);
  const requestKey = `${kind}:${page}:${revision}`;
  const loading = loadedKey !== requestKey;
  useEffect(() => {
    const c = new AbortController();
    api(`/admin/content/${kind}?page=${page}`, { signal: c.signal })
      .then((data) => {
        setData(data);
        setError("");
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      })
      .finally(() => {
        if (!c.signal.aborted) setLoadedKey(requestKey);
      });
    return () => c.abort();
  }, [api, kind, page, revision, requestKey]);
  useEffect(() => {
    const c = new AbortController();
    api("/events/admin/all", { signal: c.signal })
      .then((result) =>
        setEvents(
          (result.events || []).filter((event) => event.status === "published"),
        ),
      )
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      });
    return () => c.abort();
  }, [api]);
  const change = (key, value) =>
    setEditor((current) => ({ ...current, [key]: value }));
  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await api(`/admin/content/${kind}${editor._id ? `/${editor._id}` : ""}`, {
        method: editor._id ? "PUT" : "POST",
        body: editor,
      });
      setEditor(null);
      setRevision((x) => x + 1);
      setMessage("Đã lưu nội dung trang chủ.");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    setBusy(true);
    setError("");
    try {
      await api(`/admin/content/${kind}/${pendingDelete._id}`, {
        method: "DELETE",
        body: { updatedAt: pendingDelete.updatedAt },
      });
      setPendingDelete(null);
      setPage(1);
      setRevision((x) => x + 1);
      setMessage("Đã xóa nội dung khỏi trang chủ.");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const upload = async (file, key) => {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const video = key === "backgroundVideoUrl";
      const body = new FormData();
      body.append(video ? "video" : "image", file);
      const result = await api(video ? "/videos/upload" : "/images/upload", {
        method: "POST",
        body,
      });
      const url = result[video ? "video" : "image"]?.url;
      if (!url) throw new Error("Không nhận được URL tệp tải lên.");
      setEditor((current) => ({
        ...current,
        [key]: url,
        ...(kind === "hero"
          ? { [video ? "backgroundImage" : "backgroundVideoUrl"]: "" }
          : {}),
      }));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="am-page">
      <PageTitle
        title="Nội dung trang chủ"
        description="Biên tập banner, câu chuyện FYCE và những khoảnh khắc trên sân khấu."
      >
        <a href="/" target="_blank" rel="noreferrer">
          Xem trang chủ ↗
        </a>
        <button
          disabled={busy}
          className="am-primary"
          onClick={() => {
            setEditor({
              title: "",
              description: "",
              sortOrder: 0,
              isActive: false,
              features: [],
              category: "general",
              overlayOpacity: 0.35,
              featuredEvent: null,
            });
            setPendingDelete(null);
          }}
        >
          Thêm nội dung
        </button>
      </PageTitle>
      <div className="am-tabs" role="tablist" aria-label="Loại nội dung">
        {Object.entries(names).map(([key, name]) => (
          <button
            role="tab"
            aria-selected={kind === key}
            disabled={busy}
            key={key}
            className={kind === key ? "am-selected" : ""}
            onClick={() => {
              setKind(key);
              setPage(1);
              setEditor(null);
              setPendingDelete(null);
              setMessage("");
            }}
          >
            {name}
          </button>
        ))}
      </div>
      <Notice error={error} message={message} />
      {pendingDelete && (
        <section className="am-card am-detail" role="alert" ref={panelRef} tabIndex={-1}>
          <h2>Xóa “{pendingDelete.title || "Hình ảnh"}”?</h2>
          <p>
            Nội dung sẽ bị gỡ khỏi trang chủ. Tệp ảnh dùng chung được giữ lại để
            không làm hỏng những trang khác.
          </p>
          <div className="am-actions">
            <button className="am-danger" disabled={busy} onClick={remove}>
              Xác nhận xóa
            </button>
            <button disabled={busy} onClick={() => setPendingDelete(null)}>
              Giữ lại
            </button>
          </div>
        </section>
      )}
      {editor && (
        <section className="am-card am-detail" ref={panelRef} tabIndex={-1} aria-label="Biên tập nội dung">
          <h2>
            {editor._id ? "Chỉnh sửa" : "Tạo mới"} · {names[kind]}
          </h2>
          <form className="am-form" onSubmit={save}>
            <fieldset disabled={busy}>
              <div className="am-form-grid">
                {fields[kind].map(([key, label, max]) => (
                  <div key={key} className="am-field">
                    <label htmlFor={`content-${key}`}>{label}</label>
                    {["description", "caption"].includes(key) ? (
                      <textarea
                        id={`content-${key}`}
                        rows={4}
                        required={kind === "about" && key === "description"}
                        maxLength={max}
                        value={editor[key] || ""}
                        onChange={(e) => change(key, e.target.value)}
                      />
                    ) : (
                      <input
                        id={`content-${key}`}
                        required={
                          (key === "title" && kind !== "gallery") ||
                          (key === "image" && kind === "gallery")
                        }
                        maxLength={max || 2000}
                        value={editor[key] || ""}
                        onChange={(e) => change(key, e.target.value)}
                      />
                    )}{" "}
                    {[
                      "image",
                      "backgroundImage",
                      "backgroundVideoUrl",
                    ].includes(key) && (
                      <>
                        <input
                          aria-label={`Tải lên ${label}`}
                          type="file"
                          accept={
                            key === "backgroundVideoUrl"
                              ? "video/mp4,video/webm"
                              : "image/jpeg,image/png,image/webp"
                          }
                          onChange={(e) => upload(e.target.files?.[0], key)}
                        />
                        {editor[key] && key !== "backgroundVideoUrl" && (
                          <img
                            className="am-preview"
                            src={mediaUrl(editor[key])}
                            alt="Xem trước ảnh"
                          />
                        )}
                        <button type="button" onClick={() => change(key, "")}>
                          Gỡ {label.toLowerCase()}
                        </button>
                      </>
                    )}
                  </div>
                ))}
                <label>
                  Thứ tự ưu tiên
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={editor.sortOrder}
                    onChange={(e) =>
                      change("sortOrder", Number(e.target.value))
                    }
                  />
                </label>
                <label className="am-checkbox">
                  <input
                    type="checkbox"
                    checked={editor.isActive}
                    onChange={(e) => change("isActive", e.target.checked)}
                  />{" "}
                  Hiển thị trên trang chủ
                </label>
                {kind === "hero" && (
                  <>
                    <label>
                      Độ tối lớp phủ (0–1)
                      <input
                        type="number"
                        min="0"
                        max="1"
                        step="0.05"
                        value={editor.overlayOpacity}
                        onChange={(e) =>
                          change("overlayOpacity", Number(e.target.value))
                        }
                      />
                    </label>
                    <label>
                      Sự kiện nổi bật
                      <select
                        value={editor.featuredEvent || ""}
                        onChange={(e) =>
                          change("featuredEvent", e.target.value || null)
                        }
                      >
                        <option value="">Không chọn</option>
                        {events.map((event) => (
                          <option
                            key={event._id || event.id}
                            value={event._id || event.id}
                          >
                            {event.title}
                          </option>
                        ))}
                      </select>
                    </label>
                  </>
                )}
                {kind === "gallery" && (
                  <label>
                    Chủ đề
                    <select
                      value={editor.category}
                      onChange={(e) => change("category", e.target.value)}
                    >
                      {Object.entries({
                        general: "Chung",
                        concert: "Biểu diễn",
                        rehearsal: "Tập luyện",
                        backstage: "Hậu trường",
                        workshop: "Workshop",
                        community: "Cộng đồng",
                      }).map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
              {kind === "about" && (
                <div>
                  <h3>Điểm nổi bật</h3>
                  {(editor.features || []).map((feature, i) => (
                    <div className="am-feature" key={feature._id || i}>
                      <label>
                        Tiêu đề
                        <input
                          required
                          maxLength={150}
                          value={feature.title}
                          onChange={(e) =>
                            change(
                              "features",
                              editor.features.map((f, index) =>
                                index === i
                                  ? { ...f, title: e.target.value }
                                  : f,
                              ),
                            )
                          }
                        />
                      </label>
                      <label>
                        Mô tả
                        <input
                          maxLength={500}
                          value={feature.description}
                          onChange={(e) =>
                            change(
                              "features",
                              editor.features.map((f, index) =>
                                index === i
                                  ? { ...f, description: e.target.value }
                                  : f,
                              ),
                            )
                          }
                        />
                      </label>
                      <label>
                        Biểu tượng
                        <input
                          value={feature.icon || ""}
                          onChange={(e) =>
                            change(
                              "features",
                              editor.features.map((f, index) =>
                                index === i
                                  ? { ...f, icon: e.target.value }
                                  : f,
                              ),
                            )
                          }
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          change(
                            "features",
                            editor.features
                              .filter((_, index) => index !== i)
                              .map((f, index) => ({ ...f, sortOrder: index })),
                          )
                        }
                      >
                        Xóa mục
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      change("features", [
                        ...(editor.features || []),
                        {
                          title: "",
                          description: "",
                          icon: "",
                          sortOrder: editor.features?.length || 0,
                        },
                      ])
                    }
                  >
                    Thêm điểm nổi bật
                  </button>
                </div>
              )}
              <p>
                Banner và giới thiệu dùng mục đang hiển thị có thứ tự nhỏ nhất;
                nếu trùng thứ tự, mục tạo mới hơn được ưu tiên. Banner chỉ dùng
                một nguồn nền: ảnh hoặc video.
              </p>
              <div className="am-actions">
                <button className="am-primary" type="submit">
                  {busy ? "Đang xử lý…" : "Lưu nội dung"}
                </button>
                <button type="button" onClick={() => setEditor(null)}>
                  Đóng
                </button>
              </div>
            </fieldset>
          </form>
        </section>
      )}
      {loading ? (
        <p role="status">Đang tải nội dung…</p>
      ) : (
        <div className="am-content-grid">
          {data.items.map((item) => (
            <article className="am-card am-content-card" key={item._id}>
              {item.image || item.backgroundImage ? (
                <img
                  src={mediaUrl(item.image || item.backgroundImage)}
                  alt={item.altText || item.imageAlt || item.title}
                />
              ) : (
                <div className="am-content-placeholder">
                  {item.backgroundVideoUrl ? "VIDEO" : "FYCE"}
                </div>
              )}
              <div>
                <span
                  className={`am-badge ${item.isActive ? "am-paid" : "am-expired"}`}
                >
                  {item.isActive ? "Hiển thị" : "Bản nháp"}
                </span>
                <h2>{item.title || "Chưa đặt tiêu đề"}</h2>
                <p>
                  {item.caption ||
                    item.subtitle ||
                    item.description ||
                    "Chưa có mô tả"}
                </p>
                <small>Thứ tự: {item.sortOrder}</small>
                <div className="am-actions">
                  <button
                    disabled={busy}
                    onClick={() => {
                      setMessage(""); setError("");
                      setEditor(item);
                      setPendingDelete(null);
                    }}
                  >
                    Chỉnh sửa
                  </button>
                  <button
                    className="am-danger"
                    disabled={busy}
                    onClick={() => {
                      setMessage(""); setError("");
                      setPendingDelete(item);
                      setEditor(null);
                    }}
                  >
                    Xóa
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      {!loading && !data.items.length && (
        <p className="am-empty">
          Chưa có nội dung. Thêm mục đầu tiên để bắt đầu.
        </p>
      )}
      <Pagination
        page={page}
        total={data.total}
        busy={busy || loading}
        onChange={setPage}
      />
    </div>
  );
}
