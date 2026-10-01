import AboutSection from "../models/AboutSection.js";

const buildAboutPayload = (data = {}) => {
  const payload = {};

  const fields = [
    "eyebrow",
    "title",
    "subtitle",
    "description",
    "image",
    "imageAlt",
    "features",
    "buttonText",
    "buttonLink",
    "isActive",
    "sortOrder"
  ];

  for (const field of fields) {
    if (data[field] !== undefined) {
      payload[field] = data[field];
    }
  }

  return payload;
};

export const createAbout = async (data) => {
  if (!data.createdBy) {
    throw new Error("CREATED_BY_INVALID");
  }

  const payload = buildAboutPayload(data);

  const about = await AboutSection.create({
    ...payload,
    createdBy: data.createdBy
  });

  return about;
};

export const updateAbout = async (
  aboutId,
  data
) => {
  if (!aboutId) {
    throw new Error("ABOUT_ID_INVALID");
  }

  const about =
    await AboutSection.findById(aboutId);

  if (!about || about.deletedAt) {
    throw new Error("ABOUT_NOT_FOUND");
  }

  const payload = buildAboutPayload(data);

  Object.assign(about, payload);

  if (data.updatedBy) {
    about.updatedBy = data.updatedBy;
  }

  await about.save();

  return about;
};

export const getActiveAbout = async () => {
  const about =
    await AboutSection.findOne({ deletedAt: null,
      isActive: true
    }).sort({
      sortOrder: 1,
      createdAt: -1
    });

  if (!about || about.deletedAt) {
    throw new Error("ABOUT_NOT_FOUND");
  }

  return about;
};

export const getAllAbout = async () => {
  return AboutSection.find({ deletedAt: null }).sort({
    sortOrder: 1,
    createdAt: -1
  });
};

export const activateAbout = async (
  aboutId,
  updatedBy
) => {
  if (!aboutId) {
    throw new Error("ABOUT_ID_INVALID");
  }

  const about =
    await AboutSection.findById(aboutId);

  if (!about || about.deletedAt) {
    throw new Error("ABOUT_NOT_FOUND");
  }

  await AboutSection.updateMany(
    {
      _id: {
        $ne: aboutId
      },
      isActive: true
    },
    {
      $set: {
        isActive: false,
        updatedBy: updatedBy || null
      }
    }
  );

  about.isActive = true;

  if (updatedBy) {
    about.updatedBy = updatedBy;
  }

  await about.save();

  return about;
};

export const deactivateAbout = async (
  aboutId,
  updatedBy
) => {
  if (!aboutId) {
    throw new Error("ABOUT_ID_INVALID");
  }

  const about =
    await AboutSection.findById(aboutId);

  if (!about || about.deletedAt) {
    throw new Error("ABOUT_NOT_FOUND");
  }

  about.isActive = false;

  if (updatedBy) {
    about.updatedBy = updatedBy;
  }

  await about.save();

  return about;
};