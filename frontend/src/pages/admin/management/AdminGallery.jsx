import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import SortableImage from "./SortableImage.jsx";
import { useRecordSelection } from "./useRecordSelection.js";
import { useEffect, useState } from "react";
import { useAdminApi, mediaUrl } from "../../../services/admin.service.js";
import ContentImage from "../../../components/media/ContentImage.jsx";
import { Notice } from "./AdminShared.jsx";
import BulkAction from "./BulkAction.jsx";
export default function AdminGallery() {
  const api = useAdminApi();
  const [items, setItems] = useState([]),
    [revision, setRevision] = useState(0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [dirty, setDirty] = useState(false);
  const selection = useRecordSelection(items, revision);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const reload = () => {
    setDirty(false);
    setRevision((v) => v + 1);
  };
  useEffect(() => {
    if (dirty) return;
    const c = new AbortController();
    (async () => {
      let all = [],
        page = 1,
        total;
      do {
        const data = await api(
          `/admin/content/gallery?limit=100&page=${page++}`,
          { signal: c.signal },
        );
        if (!data.items.length) break;
        all.push(...data.items);
        total = data.total;
      } while (all.length < total);
      if (!c.signal.aborted) setItems([...new Map(all.map(item => [item._id, item])).values()]);
    })().catch((e) => {
      if (e.name !== "AbortError") setError(e.message);
    });
    return () => c.abort();
  }, [api, revision, dirty]);
  const upload = async (files) => {
    if (!files.length) return;
    setBusy(true);
    setError("");
    let count = 0;
    try {
      for (const file of files) {
        setMessage(`Đang tải ${count + 1}/${files.length}: ${file.name}`);
        const body = new FormData();
        body.append("image", file);
        const data = await api("/images/upload", { method: "POST", body });
        if (!data.image?.url) throw new Error("Không nhận được ảnh tải lên.");
        await api("/admin/content/gallery", {
          method: "POST",
          body: { image: data.image.url, title: "", isActive: true },
        });
        count++;
      }
      setMessage(`Đã thêm ${count} ảnh. Có thể đặt tiêu đề hoặc để trống.`);
    } catch (e) {
      setError(`Đã thêm ${count}/${files.length} ảnh. ${e.message}`);
    } finally {
      setBusy(false);
      reload();
    }
  };
  const move = (index, delta) => {
    setItems((old) => {
      const next = [...old];
      [next[index], next[index + delta]] = [next[index + delta], next[index]];
      return next;
    });
    setDirty(true);
  };
  const save = async () => {
    setBusy(true);
    setError("");
    try {
      await api("/admin/content/gallery/reorder", {
        method: "POST",
        body: {
          items: items.map(({ _id, updatedAt, title }) => ({
            id: _id,
            updatedAt,
            title,
          })),
        },
      });
      setMessage("Đã lưu thư viện ảnh.");
      reload();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <section>
      <div className="am-actions">
        <label className="am-upload-button">
          Thêm nhiều ảnh
          <input
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            disabled={busy || dirty}
            onChange={(e) => {
              upload(Array.from(e.target.files || []));
              e.target.value = "";
            }}
          />
        </label>
        <button className="am-primary" disabled={busy || !dirty} onClick={save}>
          Lưu tiêu đề & thứ tự
        </button>
        <button disabled={busy} onClick={reload}>
          Tải lại
        </button>
        <BulkAction
          kind="gallery"
          filters={{ ids: selection.ids }}
          disabled={busy || dirty || !selection.ids.length}
          label={`Xóa đã chọn (${selection.ids.length})`}
          onDone={reload}
        />
        <BulkAction kind="gallery" disabled={busy || dirty} onDone={reload} />
      </div>
      <p>
        Giữ nút ⠿ và kéo để sắp xếp ảnh, sau đó bấm Lưu. Cũng có thể dùng ↑ ↓
        hoặc bàn phím. Tiêu đề không bắt buộc. Lưu thay đổi trước khi tải thêm
        hoặc xóa ảnh.
      </p>
      <Notice error={error} message={message} />
      <label className="am-select-all">
        <input
          type="checkbox"
          checked={selection.all}
          disabled={busy || selection.disabled}
          onChange={selection.toggleAll}
        />{" "}
        Chọn tất cả ảnh
      </label>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={({ active, over }) => {
          if (over && active.id !== over.id) {
            setItems((old) =>
              arrayMove(
                old,
                old.findIndex((row) => row._id === active.id),
                old.findIndex((row) => row._id === over.id),
              ),
            );
            setDirty(true);
          }
        }}
      >
        <SortableContext
          items={items.map((item) => item._id)}
          strategy={rectSortingStrategy}
        >
          <div className="am-content-grid">
            {items.map((item, i) => (
              <SortableImage id={item._id} disabled={busy} key={item._id}>
                <label className="am-select-all">
                  <input
                    type="checkbox"
                    checked={selection.ids.includes(item._id)}
                    disabled={busy}
                    onChange={() => selection.toggle(item._id)}
                  />{" "}
                  Chọn ảnh {i + 1}
                </label>
                <ContentImage
                  src={mediaUrl(item.image)}
                  alt={item.title || "Khoảnh khắc FYCE"}
                />
                <div>
                  <label>
                    Tiêu đề (không bắt buộc)
                    <input
                      maxLength={150}
                      value={item.title || ""}
                      disabled={busy}
                      onChange={(e) => {
                        setItems((old) =>
                          old.map((row) =>
                            row._id === item._id
                              ? { ...row, title: e.target.value }
                              : row,
                          ),
                        );
                        setDirty(true);
                      }}
                    />
                  </label>
                  <div className="am-actions">
                    <button
                      aria-label={`Đưa ảnh ${i + 1} lên trước`}
                      disabled={busy || i === 0}
                      onClick={() => move(i, -1)}
                    >
                      ↑
                    </button>
                    <span>Vị trí {i + 1}</span>
                    <button
                      aria-label={`Đưa ảnh ${i + 1} xuống sau`}
                      disabled={busy || i === items.length - 1}
                      onClick={() => move(i, 1)}
                    >
                      ↓
                    </button>
                    <BulkAction
                      kind="gallery"
                      filters={{ ids: [item._id] }}
                      label="Xóa"
                      disabled={busy || dirty}
                      onDone={reload}
                    />
                  </div>
                </div>
              </SortableImage>
            ))}
          </div>
        </SortableContext>
      </DndContext>
      {!items.length && (
        <p className="am-empty">Chưa có ảnh. Chọn nhiều tệp để bắt đầu.</p>
      )}
    </section>
  );
}
