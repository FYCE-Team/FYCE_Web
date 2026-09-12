import HeroSection from "../models/HeroSection.js";
import Event from "../models/Event.js";

const buildHeroPayload = (data = {}) => {
  const payload = {};

  const fields = [
    "eyebrow",
    "title",
    "subtitle",
    "description",
    "primaryButtonText",
    "primaryButtonLink",
    "secondaryButtonText",
    "secondaryButtonLink",
    "backgroundImage",
    "backgroundVideoUrl",
    "overlayOpacity",
    "featuredEvent",
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

const validateFeaturedEvent = async (featuredEvent) => {
  if (!featuredEvent) {
    return null;
  }

  const event = await Event.findOne({
    _id: featuredEvent,
    status: "published"
  });

  if (!event) {
    throw new Error(
      "HERO_FEATURED_EVENT_INVALID"
    );
  }

  return event;
};

export const createHero = async (data) => {
  if (!data.createdBy) {
    throw new Error("CREATED_BY_INVALID");
  }

  const payload = buildHeroPayload(data);

  if (
    payload.featuredEvent !== undefined &&
    payload.featuredEvent !== null
  ) {
    await validateFeaturedEvent(
      payload.featuredEvent
    );
  }

  const hero = await HeroSection.create({
    ...payload,
    createdBy: data.createdBy
  });

  return hero;
};

export const updateHero = async (
  heroId,
  data
) => {
  if (!heroId) {
    throw new Error("HERO_ID_INVALID");
  }

  const hero =
    await HeroSection.findById(heroId);

  if (!hero) {
    throw new Error("HERO_NOT_FOUND");
  }

  const payload = buildHeroPayload(data);

  if (
    payload.featuredEvent !== undefined
  ) {
    await validateFeaturedEvent(
      payload.featuredEvent
    );
  }

  Object.assign(hero, payload);

  if (data.updatedBy) {
    hero.updatedBy = data.updatedBy;
  }

  await hero.save();

  return hero;
};

export const getActiveHero = async () => {
  const hero =
    await HeroSection.findOne({
      isActive: true
    })
      .sort({
        sortOrder: 1,
        createdAt: -1
      })
      .populate(
        "featuredEvent",
        "title slug shortDescription coverImage startAt endAt venue address city status"
      );

  if (!hero) {
    throw new Error("HERO_NOT_FOUND");
  }

  return hero;
};

export const getAllHeroes = async () => {
  return HeroSection.find()
    .sort({
      sortOrder: 1,
      createdAt: -1
    })
    .populate(
      "featuredEvent",
      "title slug shortDescription coverImage startAt endAt venue address city status"
    );
};

export const activateHero = async (
  heroId,
  updatedBy
) => {
  if (!heroId) {
    throw new Error("HERO_ID_INVALID");
  }

  const hero =
    await HeroSection.findById(heroId);

  if (!hero) {
    throw new Error("HERO_NOT_FOUND");
  }

  await HeroSection.updateMany(
    {
      _id: {
        $ne: heroId
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

  hero.isActive = true;

  if (updatedBy) {
    hero.updatedBy = updatedBy;
  }

  await hero.save();

  return hero;
};

export const deactivateHero = async (
  heroId,
  updatedBy
) => {
  if (!heroId) {
    throw new Error("HERO_ID_INVALID");
  }

  const hero =
    await HeroSection.findById(heroId);

  if (!hero) {
    throw new Error("HERO_NOT_FOUND");
  }

  hero.isActive = false;

  if (updatedBy) {
    hero.updatedBy = updatedBy;
  }

  await hero.save();

  return hero;
};