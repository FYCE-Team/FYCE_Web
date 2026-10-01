import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
export default function SortableImage({ id, disabled, children }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled });
  return (
    <article
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
        zIndex: isDragging ? 2 : undefined,
      }}
      className="am-card am-content-card am-sortable-image"
    >
      <button
        type="button"
        className="am-drag-handle"
        disabled={disabled}
        {...attributes}
        {...listeners}
        aria-label="Giữ và kéo để sắp xếp ảnh"
      >
        ⠿ Kéo để sắp xếp
      </button>
      {children}
    </article>
  );
}
