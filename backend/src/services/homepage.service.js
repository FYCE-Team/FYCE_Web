import HeroSection from "../models/HeroSection.js";
import Event from "../models/Event.js";
import AboutSection from "../models/AboutSection.js";
import Gallery from "../models/Gallery.js";

const upcomingLimit = 3;
const galleryLimit = 5;

const getHomepageHero = async () => {
  return HeroSection.findOne({
    isActive: true
  })
    .sort({
      sortOrder: 1,
      createdAt: -1
    })
    .populate(
      "featuredEvent",
      "title slug badge shortDescription description subtitle coverImage heroVideoUrl trailerVideoUrl startAt endAt venue address city totalTickets ticketCategories status isFeatured allowBooking"
    )
    .lean();
};

const getHomepageFeaturedEvent = async (hero) => {
  if (
    hero?.featuredEvent &&
    hero.featuredEvent.status === "published"
  ) {
    return hero.featuredEvent;
  }

  return Event.findOne({
    status: "published",
    isFeatured: true
  })
    .sort({
      startAt: 1,
      createdAt: -1
    })
    .lean();
};

const getHomepageUpcomingEvents = async () => {
  return Event.find({
    status: "published",
    startAt: {
      $gte: new Date()
    }
  })
    .sort({
      startAt: 1
    })
    .limit(upcomingLimit)
    .select(
      "title slug badge shortDescription coverImage startAt endAt venue address city ticketCategories totalTickets status isFeatured allowBooking"
    )
    .lean();
};

const getHomepageAbout = async () => {
  return AboutSection.findOne({
    isActive: true
  })
    .sort({
      sortOrder: 1,
      createdAt: -1
    })
    .lean();
};

const getHomepageGallery = async () => {
  return Gallery.find({
    isActive: true
  })
    .sort({
      sortOrder: 1,
      createdAt: -1
    })
    .limit(galleryLimit)
    .select(
      "title image altText caption category sortOrder"
    )
    .lean();
};

export const getHomepageData = async () => {
  const [
    hero,
    about,
    upcomingEvents,
    gallery
  ] = await Promise.all([
    getHomepageHero(),
    getHomepageAbout(),
    getHomepageUpcomingEvents(),
    getHomepageGallery()
  ]);

  const featuredEvent =
    await getHomepageFeaturedEvent(hero);

  return {
    hero,
    featuredEvent,
    upcomingEvents,
    about,
    gallery
  };
};