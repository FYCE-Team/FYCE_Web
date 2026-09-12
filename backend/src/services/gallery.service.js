import Gallery from "../models/Gallery.js";

const buildGalleryPayload = (data = {}) => {
  const payload = {};

  const fields = [
    "title",
    "image",
    "altText",
    "caption",
    "category",
    "sortOrder",
    "isActive"
  ];

  for (const field of fields) {
    if (data[field] !== undefined) {
      payload[field] = data[field];
    }
  }

  return payload;
};

export const createGallery = async (data) => {
  if (!data.createdBy) {
    throw new Error("CREATED_BY_INVALID");
  }

  const payload = buildGalleryPayload(data);

  const gallery = await Gallery.create({
    ...payload,
    createdBy: data.createdBy
  });

  return gallery;
};

export const updateGallery = async (
  galleryId,
  data
) => {
  if (!galleryId) {
    throw new Error("GALLERY_ID_INVALID");
  }

  const gallery =
    await Gallery.findById(galleryId);

  if (!gallery) {
    throw new Error("GALLERY_NOT_FOUND");
  }

  const payload = buildGalleryPayload(data);

  Object.assign(gallery, payload);

  if (data.updatedBy) {
    gallery.updatedBy = data.updatedBy;
  }

  await gallery.save();

  return gallery;
};

export const getActiveGallery = async ({
  limit = 20,
  skip = 0,
  category = null
} = {}) => {
  const filter = {
    isActive: true
  };

  if (category) {
    filter.category = category;
  }

  return Gallery.find(filter)
    .sort({
      sortOrder: 1,
      createdAt: -1
    })
    .skip(skip)
    .limit(limit);
};

export const getAllGallery = async ({
  limit = 100,
  skip = 0,
  category = null
} = {}) => {
  const filter = {};

  if (category) {
    filter.category = category;
  }

  return Gallery.find(filter)
    .sort({
      sortOrder: 1,
      createdAt: -1
    })
    .skip(skip)
    .limit(limit);
};

export const activateGallery = async (
  galleryId,
  updatedBy
) => {
  if (!galleryId) {
    throw new Error("GALLERY_ID_INVALID");
  }

  const gallery =
    await Gallery.findById(galleryId);

  if (!gallery) {
    throw new Error("GALLERY_NOT_FOUND");
  }

  gallery.isActive = true;

  if (updatedBy) {
    gallery.updatedBy = updatedBy;
  }

  await gallery.save();

  return gallery;
};

export const deactivateGallery = async (
  galleryId,
  updatedBy
) => {
  if (!galleryId) {
    throw new Error("GALLERY_ID_INVALID");
  }

  const gallery =
    await Gallery.findById(galleryId);

  if (!gallery) {
    throw new Error("GALLERY_NOT_FOUND");
  }

  gallery.isActive = false;

  if (updatedBy) {
    gallery.updatedBy = updatedBy;
  }

  await gallery.save();

  return gallery;
};