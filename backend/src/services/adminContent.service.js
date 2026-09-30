import Hero from "../models/HeroSection.js";
import About from "../models/AboutSection.js";
import Gallery from "../models/Gallery.js";
import Event from "../models/Event.js";
import { fail, objectId, listOptions } from "./admin.service.js";
const types = {
  hero: {
    Model: Hero,
    fields:
      "eyebrow title subtitle description primaryButtonText primaryButtonLink secondaryButtonText secondaryButtonLink backgroundImage backgroundVideoUrl overlayOpacity featuredEvent isActive sortOrder",
  },
  about: {
    Model: About,
    fields:
      "eyebrow title subtitle description image imageAlt features buttonText buttonLink isActive sortOrder",
  },
  gallery: {
    Model: Gallery,
    fields: "title image altText caption category isActive sortOrder",
  },
};
const config = (kind) =>
  Object.hasOwn(types, kind)
    ? types[kind]
    : fail(404, "Loại nội dung không hợp lệ.");
export const safeContentUrl = (value) =>
  typeof value === "string" &&
  !/[\\\x00-\x1f]/.test(value) &&
  (!value ||
    /^\/(?!\/)/.test(value) ||
    /^https?:\/\//i.test(value) ||
    /^#[\w-]+$/.test(value));
export const contentList = async (kind, query) => {
  const { Model } = config(kind);
  const { page, limit } = listOptions(query);
  const [items, total] = await Promise.all([
    Model.find()
      .sort({ sortOrder: 1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Model.countDocuments(),
  ]);
  return { items, total, page, limit };
};
export const contentSave = async (kind, id, body, actor) => {
  const { Model, fields } = config(kind);
  if (!body || typeof body !== "object" || Array.isArray(body))
    fail(400, "Nội dung không hợp lệ.");
  const payload = {};
  for (const key of fields.split(" "))
    if (body[key] !== undefined) payload[key] = body[key];
  for (const key of [
    "image",
    "backgroundImage",
    "backgroundVideoUrl",
    "buttonLink",
    "primaryButtonLink",
    "secondaryButtonLink",
  ]) {
    if (payload[key] !== undefined && !safeContentUrl(payload[key]))
      fail(400, "Liên kết phải là HTTP(S), đường dẫn nội bộ hoặc neo trang.");
  }
  if (payload.featuredEvent) {
    if (
      !(await Event.exists({
        _id: objectId(payload.featuredEvent),
        status: "published",
      }))
    )
      fail(400, "Sự kiện nổi bật phải được xuất bản.");
  }
  if (payload.isActive !== undefined && typeof payload.isActive !== "boolean")
    fail(400, "Trạng thái không hợp lệ.");
  if (Array.isArray(payload.features)) payload.features = payload.features.map((feature, index) => ({ ...feature, sortOrder: index }));
  if (!id) {
    if (payload.sortOrder === undefined) {
      const last = await Model.findOne().sort({ sortOrder: -1 }).select("sortOrder").lean();
      payload.sortOrder = (last?.sortOrder ?? -1) + 1;
    }
    if (kind === "about" && !payload.imageAlt) payload.imageAlt = payload.title || "FYCE";
    if (kind === "gallery" && !payload.altText) payload.altText = payload.title || payload.caption || "Hoạt động FYCE";
    return Model.create({ ...payload, createdBy: actor });
  }
  const record = await Model.findById(objectId(id));
  if (!record) fail(404, "Không tìm thấy nội dung.");
  if (
    !body.updatedAt ||
    new Date(body.updatedAt).getTime() !== record.updatedAt.getTime()
  )
    fail(409, "Nội dung đã thay đổi. Hãy tải lại trước khi sửa.");
  Object.assign(record, payload, { updatedBy: actor });
  // Legacy imported content may have no author. Preserve unknown provenance;
  // validate all editable content, without inventing a historical creator.
  await record.validate({ pathsToSkip: record.createdBy ? [] : ["createdBy"] });
  // Compare-and-swap also protects writers that use older API routes without __v increments.
  const saved = await Model.findOneAndUpdate(
    { _id: record._id, updatedAt: new Date(body.updatedAt) },
    {
      $set: {
        ...payload,
        updatedBy: actor,
        updatedAt: new Date(
          Math.max(Date.now(), record.updatedAt.getTime() + 1),
        ),
      },
    },
    { returnDocument: "after", runValidators: true, timestamps: false },
  );
  if (!saved) fail(409, "Nội dung đã thay đổi. Hãy tải lại.");
  return saved;
};
export const contentDelete = async (kind, id, body) => {
  const { Model } = config(kind);
  if (!body?.updatedAt || !Number.isFinite(Date.parse(body.updatedAt)))
    fail(400, "Thiếu phiên bản nội dung.");
  const deleted = await Model.findOneAndDelete({
    _id: objectId(id),
    updatedAt: new Date(body.updatedAt),
  });
  if (!deleted)
    fail(409, "Nội dung đã thay đổi hoặc đã được xóa. Hãy tải lại.");
  return { deleted: true };
};
