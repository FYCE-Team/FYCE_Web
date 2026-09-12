import Event from "../models/Event.js";
import Venue from "../models/Venue.js";
import VenueLayout from "../models/VenueLayout.js";

const createSlug = (value) => {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

const normalizeSlug = (slug) => {
  return createSlug(slug);
};

const generateUniqueSlug = async (
  title,
  excludeId = null
) => {
  const baseSlug = createSlug(title);

  if (!baseSlug) {
    throw new Error("SLUG_INVALID");
  }

  let slug = baseSlug;
  let counter = 2;

  while (true) {
    const query = {
      slug
    };

    if (excludeId) {
      query._id = {
        $ne: excludeId
      };
    }

    const existing = await Event.findOne(
      query
    ).select("_id");

    if (!existing) {
      return slug;
    }

    slug = `${baseSlug}-${counter}`;
    counter++;
  }
};

const parseDate = (
  value,
  fieldName
) => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  const date =
    value instanceof Date
      ? value
      : new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    throw new Error(
      `${fieldName}_INVALID`
    );
  }

  return date;
};

const ensureObjectId = (
  value,
  fieldName
) => {
  if (!value) {
    throw new Error(
      `${fieldName}_INVALID`
    );
  }

  return value;
};

const validateVenueSelection = async ({
  venueId,
  venueLayoutId
}) => {
  if (!venueId || !venueLayoutId) {
    throw new Error(
      "EVENT_VENUE_LAYOUT_REQUIRED"
    );
  }

  const venue =
    await Venue.findById(
      venueId
    )
      .select(
        "_id name address description isActive"
      )
      .lean();

  if (!venue) {
    throw new Error(
      "EVENT_VENUE_NOT_FOUND"
    );
  }

  if (venue.isActive === false) {
    throw new Error(
      "EVENT_VENUE_INACTIVE"
    );
  }

  const layout =
    await VenueLayout.findById(
      venueLayoutId
    )
      .select(
        "_id venueId name capacity isDefault isActive"
      )
      .lean();

  if (!layout) {
    throw new Error(
      "EVENT_VENUE_LAYOUT_NOT_FOUND"
    );
  }

  if (
    String(layout.venueId) !==
    String(venueId)
  ) {
    throw new Error(
      "EVENT_VENUE_LAYOUT_MISMATCH"
    );
  }

  if (layout.isActive === false) {
    throw new Error(
      "EVENT_VENUE_LAYOUT_INACTIVE"
    );
  }

  return {
    venue,
    layout
  };
};

/*
 * EventForm hiện tại nhập venue bằng tên hiển thị.
 * Nếu frontend chưa gửi venueId / venueLayoutId thì backend
 * tự liên kết với Venue hiện có và layout mặc định của Venue.
 *
 * Quy tắc:
 * - Có đủ 2 ID  -> validate trực tiếp.
 * - Chỉ có 1 ID -> từ chối vì trạng thái không nhất quán.
 * - Không có ID -> tìm Venue theo tên + layout default active.
 * - Nếu không có default nhưng chỉ có đúng 1 layout active
 *   thì dùng layout đó.
 */
const resolveVenueSelection = async ({
  venueId,
  venueLayoutId,
  venueName
}) => {
  if (
    venueId ||
    venueLayoutId
  ) {
    return validateVenueSelection({
      venueId,
      venueLayoutId
    });
  }

  const normalizedVenueName =
    String(
      venueName || ""
    ).trim();

  if (!normalizedVenueName) {
    throw new Error(
      "VENUE_INVALID"
    );
  }

  const venue =
    await Venue.findOne({
      name:
        normalizedVenueName,
      isActive: {
        $ne: false
      }
    })
      .select(
        "_id name address description isActive"
      )
      .lean();

  if (!venue) {
    throw new Error(
      "EVENT_VENUE_NOT_FOUND"
    );
  }

  let layout =
    await VenueLayout.findOne({
      venueId:
        venue._id,
      isDefault:
        true,
      isActive: {
        $ne: false
      }
    })
      .select(
        "_id venueId name capacity isDefault isActive"
      )
      .lean();

  if (!layout) {
    const activeLayouts =
      await VenueLayout.find({
        venueId:
          venue._id,
        isActive: {
          $ne: false
        }
      })
        .select(
          "_id venueId name capacity isDefault isActive"
        )
        .limit(2)
        .lean();

    if (
      activeLayouts.length === 0
    ) {
      throw new Error(
        "EVENT_VENUE_LAYOUT_NOT_FOUND"
      );
    }

    if (
      activeLayouts.length > 1
    ) {
      throw new Error(
        "EVENT_VENUE_LAYOUT_AMBIGUOUS"
      );
    }

    layout =
      activeLayouts[0];
  }

  return {
    venue,
    layout
  };
};

const normalizeWork = (
  work = {},
  index = 0
) => {
  return {
    order:
      Number(work.order) ||
      index + 1,

    title:
      work.title?.trim() || "",

    subtitle:
      work.subtitle?.trim() || "",

    composer:
      work.composer?.trim() || "",

    durationMinutes:
      work.durationMinutes ===
        null ||
      work.durationMinutes ===
        undefined ||
      work.durationMinutes === ""
        ? null
        : Number(
            work.durationMinutes
          ) || 0,

    description:
      work.description?.trim() || ""
  };
};

const normalizeProgramPart = (
  part = {},
  index = 0
) => {
  return {
    order:
      Number(part.order) ||
      index + 1,

    title:
      part.title?.trim() || "",

    subtitle:
      part.subtitle?.trim() || "",

    description:
      part.description?.trim() || "",

    works:
      Array.isArray(part.works)
        ? part.works.map(
            (
              work,
              workIndex
            ) =>
              normalizeWork(
                work,
                workIndex
              )
          )
        : []
  };
};

const normalizeArtist = (
  artist = {}
) => {
  return {
    name:
      artist.name?.trim() || "",

    role:
      artist.role?.trim() || "",

    bio:
      artist.bio?.trim() || "",

    image:
      artist.image?.trim() || "",

    instrument:
      artist.instrument?.trim() || ""
  };
};

const normalizePolicy = (
  policy = {},
  index = 0
) => {
  return {
    title:
      policy.title?.trim() || "",

    description:
      policy.description?.trim() || "",

    icon:
      policy.icon?.trim() || "",

    type:
      policy.type || "general",

    sortOrder:
      Number.isFinite(
        Number(policy.sortOrder)
      )
        ? Number(policy.sortOrder)
        : index
  };
};

const normalizeGalleryItem = (
  item = {},
  index = 0
) => {
  return {
    image:
      item.image?.trim() || "",

    caption:
      item.caption?.trim() || "",

    sortOrder:
      Number.isFinite(
        Number(item.sortOrder)
      )
        ? Number(item.sortOrder)
        : index
  };
};

const normalizeTicketCategory = (
  category = {},
  index = 0
) => {
  return {
    ...(category._id
      ? {
          _id:
            category._id
        }
      : {}),

    code:
      category.code
        ?.trim()
        .toUpperCase() || "",

    name:
      category.name?.trim() || "",

    price:
      Number(category.price) || 0,

    colorCode:
      category.colorCode ||
      "#2D7F73",

    description:
      category.description?.trim() ||
      "",

    benefits:
      Array.isArray(
        category.benefits
      )
        ? category.benefits
            .map(
              (benefit) =>
                String(
                  benefit || ""
                ).trim()
            )
            .filter(Boolean)
        : [],

    seatType:
      category.seatType ||
      "assigned",

    maxPerOrder:
      Math.max(
        Number(
          category.maxPerOrder
        ) || 1,
        1
      ),

    sortOrder:
      Number.isFinite(
        Number(category.sortOrder)
      )
        ? Number(category.sortOrder)
        : index,

    isActive:
      category.isActive !== false
  };
};

const normalizeArray = (
  value
) => {
  return Array.isArray(value)
    ? value
    : [];
};

const validateTicketCategories = (
  ticketCategories
) => {
  const categories =
    normalizeArray(
      ticketCategories
    );

  const codes = categories
    .map(
      (category) =>
        category.code
          ?.trim()
          .toUpperCase()
    )
    .filter(Boolean);

  const duplicateCode =
    codes.find(
      (code, index) =>
        codes.indexOf(code) !==
        index
    );

  if (duplicateCode) {
    throw new Error(
      "EVENT_TICKET_CATEGORY_DUPLICATE"
    );
  }
};

const validateProgramParts = (
  programParts
) => {
  const parts =
    normalizeArray(
      programParts
    );

  const partOrders =
    parts.map(
      (part, index) =>
        Number(part.order) ||
        index + 1
    );

  const duplicatePartOrder =
    partOrders.find(
      (order, index) =>
        partOrders.indexOf(order) !==
        index
    );

  if (
    duplicatePartOrder
  ) {
    throw new Error(
      "EVENT_PROGRAM_PART_ORDER_DUPLICATE"
    );
  }

  parts.forEach(
    (part, partIndex) => {
      const works =
        normalizeArray(
          part.works
        );

      const workOrders =
        works.map(
          (
            work,
            workIndex
          ) =>
            Number(work.order) ||
            workIndex + 1
        );

      const duplicateWorkOrder =
        workOrders.find(
          (
            order,
            index
          ) =>
            workOrders.indexOf(
              order
            ) !== index
        );

      if (
        duplicateWorkOrder
      ) {
        throw new Error(
          "EVENT_WORK_ORDER_DUPLICATE"
        );
      }
    }
  );
};

const validateGalleryOrders = (
  gallery,
  duplicateErrorCode
) => {
  const items =
    normalizeArray(
      gallery
    );

  const orders =
    items.map(
      (
        item,
        index
      ) =>
        Number.isFinite(
          Number(
            item.sortOrder
          )
        )
          ? Number(
              item.sortOrder
            )
          : index
    );

  const duplicateOrder =
    orders.find(
      (order, index) =>
        orders.indexOf(order) !==
        index
    );

  if (
    duplicateOrder !==
    undefined
  ) {
    throw new Error(
      duplicateErrorCode
    );
  }
};

const validateEventTimes = ({
  startAt,
  endAt,
  bookingOpenAt,
  bookingCloseAt,
  status = "draft",
  allowBooking = false
}) => {
  /*
   * datetime-local ở frontend chính xác đến phút.
   * Làm tròn backend về đầu phút để "mở bán ngay bây giờ"
   * không bị fail chỉ vì server có thêm giây/millisecond.
   */
  const now =
    new Date();

  now.setSeconds(
    0,
    0
  );

  const start =
    parseDate(
      startAt,
      "EVENT_START_TIME"
    );

  const end =
    parseDate(
      endAt,
      "EVENT_END_TIME"
    );

  const bookingOpen =
    parseDate(
      bookingOpenAt,
      "EVENT_BOOKING_OPEN_TIME"
    );

  const bookingClose =
    parseDate(
      bookingCloseAt,
      "EVENT_BOOKING_CLOSE_TIME"
    );

  /*
   * Coming Soon
   */
  if (!start) {
    if (
      end ||
      bookingOpen ||
      bookingClose
    ) {
      throw new Error(
        "EVENT_COMING_SOON_TIME_INVALID"
      );
    }

    if (
      allowBooking
    ) {
      throw new Error(
        "EVENT_COMING_SOON_BOOKING_INVALID"
      );
    }

    return {
      startAt: null,
      endAt: null,
      bookingOpenAt: null,
      bookingCloseAt: null
    };
  }

  /*
   * Chỉ kiểm tra quá khứ đối với
   * event đang hoạt động.
   */
  if (
    [
      "draft",
      "published",
      "sold_out"
    ].includes(status)
  ) {
    if (
      start < now
    ) {
      throw new Error(
        "EVENT_START_TIME_INVALID"
      );
    }

    if (
      bookingOpen &&
      bookingOpen < now
    ) {
      throw new Error(
        "EVENT_BOOKING_OPEN_TIME_INVALID"
      );
    }
  }

  if (!end) {
    throw new Error(
      "EVENT_END_TIME_REQUIRED"
    );
  }

  if (
    end <= start
  ) {
    throw new Error(
      "EVENT_END_TIME_INVALID"
    );
  }

  if (!bookingOpen) {
    throw new Error(
      "EVENT_BOOKING_OPEN_TIME_REQUIRED"
    );
  }

  if (!bookingClose) {
    throw new Error(
      "EVENT_BOOKING_CLOSE_TIME_REQUIRED"
    );
  }

  if (
    bookingOpen >=
    bookingClose
  ) {
    throw new Error(
      "EVENT_BOOKING_TIME_INVALID"
    );
  }

  if (
    bookingClose >
    start
  ) {
    throw new Error(
      "EVENT_BOOKING_CLOSE_AFTER_EVENT_START"
    );
  }

  if (
    bookingOpen >=
    start
  ) {
    throw new Error(
      "EVENT_BOOKING_OPEN_AFTER_EVENT_START"
    );
  }

  return {
    startAt: start,
    endAt: end,
    bookingOpenAt:
      bookingOpen,
    bookingCloseAt:
      bookingClose
  };
};

const buildEventPayload = ({
  title,
  slug,
  badge,
  shortDescription,
  description,
  subtitle,
  coverImage,
  heroVideoUrl,
  trailerVideoUrl,
  startAt,
  endAt,
  bookingOpenAt,
  bookingCloseAt,
  venue,
  venueId,
  venueLayoutId,
  address,
  city,
  venueDescription,
  seatingChartImage,
  totalTickets,
  ticketCategories,
  programParts,
  artists,
  policies,
  programGallery,
  backstageGallery,
  conductor,
  status,
  isFeatured,
  allowBooking,
  createdBy,
  updatedBy
}) => {
  const normalizedTicketCategories =
    normalizeArray(
      ticketCategories
    ).map(
      (
        category,
        index
      ) =>
        normalizeTicketCategory(
          category,
          index
        )
    );

  const normalizedProgramParts =
    normalizeArray(
      programParts
    ).map(
      (
        part,
        index
      ) =>
        normalizeProgramPart(
          part,
          index
        )
    );

  const normalizedArtists =
    normalizeArray(
      artists
    ).map(
      normalizeArtist
    );

  const normalizedPolicies =
    normalizeArray(
      policies
    ).map(
      (
        policy,
        index
      ) =>
        normalizePolicy(
          policy,
          index
        )
    );

  const normalizedProgramGallery =
    normalizeArray(
      programGallery
    ).map(
      (
        item,
        index
      ) =>
        normalizeGalleryItem(
          item,
          index
        )
    );

  const normalizedBackstageGallery =
    normalizeArray(
      backstageGallery
    ).map(
      (
        item,
        index
      ) =>
        normalizeGalleryItem(
          item,
          index
        )
    );

  validateTicketCategories(
    normalizedTicketCategories
  );

  validateProgramParts(
    normalizedProgramParts
  );

  validateGalleryOrders(
    normalizedProgramGallery,
    "EVENT_PROGRAM_GALLERY_ORDER_DUPLICATE"
  );

  validateGalleryOrders(
    normalizedBackstageGallery,
    "EVENT_BACKSTAGE_GALLERY_ORDER_DUPLICATE"
  );

  return {
    title:
      title?.trim(),

    slug:
      normalizeSlug(slug),

    badge:
      badge?.trim() || "",

    shortDescription:
      shortDescription?.trim() ||
      "",

    description:
      description?.trim() || "",

    subtitle:
      subtitle?.trim() || "",

    coverImage:
      coverImage?.trim() || "",

    heroVideoUrl:
      heroVideoUrl?.trim() || "",

    trailerVideoUrl:
      trailerVideoUrl?.trim() || "",

    startAt:
      startAt || null,

    endAt:
      endAt || null,

    bookingOpenAt:
      bookingOpenAt || null,

    bookingCloseAt:
      bookingCloseAt || null,

    venue:
      venue?.trim(),

    venueId:
      venueId || null,

    venueLayoutId:
      venueLayoutId || null,

    address:
      address?.trim() || "",

    city:
      city?.trim() || "",

    venueDescription:
      venueDescription?.trim() ||
      "",

    seatingChartImage:
      seatingChartImage?.trim() ||
      "",

    totalTickets:
      Number(totalTickets) || 0,

    ticketCategories:
      normalizedTicketCategories,

    programParts:
      normalizedProgramParts,

    artists:
      normalizedArtists,

    policies:
      normalizedPolicies,

    programGallery:
      normalizedProgramGallery,

    backstageGallery:
      normalizedBackstageGallery,

    conductor:
      conductor?.trim() || "",

    status:
      status || "draft",

    isFeatured:
      Boolean(isFeatured),

    allowBooking:
      allowBooking !== false,

    ...(createdBy
      ? {
          createdBy:
            ensureObjectId(
              createdBy,
              "CREATED_BY"
            )
        }
      : {}),

    ...(updatedBy
      ? {
          updatedBy:
            ensureObjectId(
              updatedBy,
              "UPDATED_BY"
            )
        }
      : {})
  };
};

export const createEvent =
  async ({
    title,
    badge,
    shortDescription,
    description,
    subtitle,
    coverImage,
    heroVideoUrl,
    trailerVideoUrl,
    startAt,
    endAt,
    bookingOpenAt,
    bookingCloseAt,
    venue,
    venueId,
    venueLayoutId,
    address,
    city,
    venueDescription,
    seatingChartImage,
    totalTickets,
    ticketCategories,
    programParts,
    artists,
    policies,
    programGallery,
    backstageGallery,
    conductor,
    status = "draft",
    isFeatured = false,
    allowBooking = false,
    createdBy
  }) => {
    if (
      !title ||
      !title.trim()
    ) {
      throw new Error(
        "TITLE_INVALID"
      );
    }

    if (
      !venue ||
      !venue.trim()
    ) {
      throw new Error(
        "VENUE_INVALID"
      );
    }

    const resolvedVenue =
      await resolveVenueSelection({
        venueId,
        venueLayoutId,
        venueName:
          venue
      });

    if (!createdBy) {
      throw new Error(
        "CREATED_BY_INVALID"
      );
    }

    const generatedSlug =
      await generateUniqueSlug(
        title
      );

    const parsedTimes =
      validateEventTimes({
        startAt,
        endAt,
        bookingOpenAt,
        bookingCloseAt,
        status,
        allowBooking
      });

    const normalizedProgramParts =
      normalizeArray(
        programParts
      ).map(
        (
          part,
          index
        ) =>
          normalizeProgramPart(
            part,
            index
          )
      );

    const normalizedProgramGallery =
      normalizeArray(
        programGallery
      ).map(
        (
          item,
          index
        ) =>
          normalizeGalleryItem(
            item,
            index
          )
      );

    const normalizedBackstageGallery =
      normalizeArray(
        backstageGallery
      ).map(
        (
          item,
          index
        ) =>
          normalizeGalleryItem(
            item,
            index
          )
      );

    validateProgramParts(
      normalizedProgramParts
    );

    validateGalleryOrders(
      normalizedProgramGallery,
      "EVENT_PROGRAM_GALLERY_ORDER_DUPLICATE"
    );

    validateGalleryOrders(
      normalizedBackstageGallery,
      "EVENT_BACKSTAGE_GALLERY_ORDER_DUPLICATE"
    );

    if (
      isFeatured
    ) {
      await Event.updateMany(
        {
          isFeatured:
            true
        },
        {
          $set: {
            isFeatured:
              false
          }
        }
      );
    }

    const eventPayload =
      buildEventPayload({
        title,
        slug:
          generatedSlug,
        badge,
        shortDescription,
        description,
        subtitle,
        coverImage,
        heroVideoUrl,
        trailerVideoUrl,
        startAt:
          parsedTimes.startAt,
        endAt:
          parsedTimes.endAt,
        bookingOpenAt:
          parsedTimes.bookingOpenAt,
        bookingCloseAt:
          parsedTimes.bookingCloseAt,
        venue:
          resolvedVenue.venue.name,
        venueId:
          resolvedVenue.venue._id,
        venueLayoutId:
          resolvedVenue.layout._id,
        address:
          address?.trim() ||
          resolvedVenue.venue.address ||
          "",
        city,
        venueDescription:
          venueDescription?.trim() ||
          resolvedVenue.venue.description ||
          "",
        seatingChartImage,
        totalTickets,
        ticketCategories,
        programParts:
          normalizedProgramParts,
        artists,
        policies,
        programGallery:
          normalizedProgramGallery,
        backstageGallery:
          normalizedBackstageGallery,
        conductor,
        status,
        isFeatured,
        allowBooking,
        createdBy
      });

    const event =
      await Event.create(
        eventPayload
      );

    return event;
  };

export const updateEvent =
  async (
    eventId,
    {
      title,
      badge,
      shortDescription,
      description,
      subtitle,
      coverImage,
      heroVideoUrl,
      trailerVideoUrl,
      startAt,
      endAt,
      bookingOpenAt,
      bookingCloseAt,
      venue,
      venueId,
      venueLayoutId,
      address,
      city,
      venueDescription,
      seatingChartImage,
      totalTickets,
      ticketCategories,
      programParts,
      artists,
      policies,
      programGallery,
      backstageGallery,
      conductor,
      status,
      isFeatured,
      allowBooking,
      updatedBy
    }
  ) => {
    if (!eventId) {
      throw new Error(
        "EVENT_ID_INVALID"
      );
    }

    if (!updatedBy) {
      throw new Error(
        "UPDATED_BY_INVALID"
      );
    }

    const event =
      await Event.findById(
        eventId
      );

    if (!event) {
      throw new Error(
        "EVENT_NOT_FOUND"
      );
    }

    const nextVenueId =
      venueId !== undefined
        ? venueId
        : event.venueId;

    const nextVenueLayoutId =
      venueLayoutId !== undefined
        ? venueLayoutId
        : event.venueLayoutId;

    const nextVenueName =
      venue !== undefined
        ? venue
        : event.venue;

    /*
     * Event mới: frontend có thể chưa gửi ID,
     * backend resolve từ tên Venue.
     *
     * Event cũ: nếu chưa migrate venueId/layoutId,
     * lần edit tiếp theo sẽ tự gắn Venue + layout mặc định.
     */
    const resolvedVenue =
      await resolveVenueSelection({
        venueId:
          nextVenueId,
        venueLayoutId:
          nextVenueLayoutId,
        venueName:
          nextVenueName
      });

    event.venueId =
      resolvedVenue.venue._id;

    event.venueLayoutId =
      resolvedVenue.layout._id;

    if (
      venue === undefined ||
      !String(
        venue || ""
      ).trim()
    ) {
      event.venue =
        resolvedVenue.venue.name;
    }

    if (
      title !== undefined
    ) {
      const trimmedTitle =
        title.trim();

      if (!trimmedTitle) {
        throw new Error(
          "TITLE_INVALID"
        );
      }

      event.title =
        trimmedTitle;

      event.slug =
        await generateUniqueSlug(
          trimmedTitle,
          eventId
        );
    }

    if (
      badge !== undefined
    ) {
      event.badge =
        badge.trim();
    }

    if (
      shortDescription !==
      undefined
    ) {
      event.shortDescription =
        shortDescription.trim();
    }

    if (
      description !==
      undefined
    ) {
      event.description =
        description.trim();
    }

    if (
      subtitle !==
      undefined
    ) {
      event.subtitle =
        subtitle.trim();
    }

    if (
      coverImage !==
      undefined
    ) {
      event.coverImage =
        coverImage.trim();
    }

    if (
      heroVideoUrl !==
      undefined
    ) {
      event.heroVideoUrl =
        heroVideoUrl.trim();
    }

    if (
      trailerVideoUrl !==
      undefined
    ) {
      event.trailerVideoUrl =
        trailerVideoUrl.trim();
    }

    if (
      startAt !==
      undefined
    ) {
      event.startAt =
        parseDate(
          startAt,
          "EVENT_START_TIME"
        );
    }

    if (
      endAt !==
      undefined
    ) {
      event.endAt =
        parseDate(
          endAt,
          "EVENT_END_TIME"
        );
    }

    if (
      bookingOpenAt !==
      undefined
    ) {
      event.bookingOpenAt =
        parseDate(
          bookingOpenAt,
          "EVENT_BOOKING_OPEN_TIME"
        );
    }

    if (
      bookingCloseAt !==
      undefined
    ) {
      event.bookingCloseAt =
        parseDate(
          bookingCloseAt,
          "EVENT_BOOKING_CLOSE_TIME"
        );
    }

    if (
      venue !==
      undefined
    ) {
      const trimmedVenue =
        venue.trim();

      if (!trimmedVenue) {
        throw new Error(
          "VENUE_INVALID"
        );
      }

      event.venue =
        trimmedVenue;
    }

    if (
      address !==
      undefined
    ) {
      event.address =
        address.trim();
    }

    if (
      city !==
      undefined
    ) {
      event.city =
        city.trim();
    }

    if (
      venueDescription !==
      undefined
    ) {
      event.venueDescription =
        venueDescription.trim();
    }

    if (
      seatingChartImage !==
      undefined
    ) {
      event.seatingChartImage =
        seatingChartImage.trim();
    }

    if (
      totalTickets !==
      undefined
    ) {
      event.totalTickets =
        Number(
          totalTickets
        ) || 0;
    }

    if (
      ticketCategories !==
      undefined
    ) {
      const normalized =
        normalizeArray(
          ticketCategories
        ).map(
          (
            category,
            index
          ) =>
            normalizeTicketCategory(
              category,
              index
            )
        );

      validateTicketCategories(
        normalized
      );

      event.ticketCategories =
        normalized;
    }

    if (
      programParts !==
      undefined
    ) {
      const normalized =
        normalizeArray(
          programParts
        ).map(
          (
            part,
            index
          ) =>
            normalizeProgramPart(
              part,
              index
            )
        );

      validateProgramParts(
        normalized
      );

      event.programParts =
        normalized;
    }

    if (
      artists !==
      undefined
    ) {
      event.artists =
        normalizeArray(
          artists
        ).map(
          normalizeArtist
        );
    }

    if (
      policies !==
      undefined
    ) {
      event.policies =
        normalizeArray(
          policies
        ).map(
          (
            policy,
            index
          ) =>
            normalizePolicy(
              policy,
              index
            )
        );
    }

    if (
      programGallery !==
      undefined
    ) {
      const normalized =
        normalizeArray(
          programGallery
        ).map(
          (
            item,
            index
          ) =>
            normalizeGalleryItem(
              item,
              index
            )
        );

      validateGalleryOrders(
        normalized,
        "EVENT_PROGRAM_GALLERY_ORDER_DUPLICATE"
      );

      event.programGallery =
        normalized;
    }

    if (
      backstageGallery !==
      undefined
    ) {
      const normalized =
        normalizeArray(
          backstageGallery
        ).map(
          (
            item,
            index
          ) =>
            normalizeGalleryItem(
              item,
              index
            )
        );

      validateGalleryOrders(
        normalized,
        "EVENT_BACKSTAGE_GALLERY_ORDER_DUPLICATE"
      );

      event.backstageGallery =
        normalized;
    }

    if (
      conductor !==
      undefined
    ) {
      event.conductor =
        conductor.trim();
    }

    if (
      status !==
      undefined
    ) {
      event.status =
        status;
    }

    if (
      allowBooking !==
      undefined
    ) {
      event.allowBooking =
        Boolean(
          allowBooking
        );
    }

    /*
     * Featured event exclusive.
     */
    if (
      isFeatured !==
      undefined
    ) {
      if (
        Boolean(
          isFeatured
        )
      ) {
        await Event.updateMany(
          {
            _id: {
              $ne: eventId
            },
            isFeatured:
              true
          },
          {
            $set: {
              isFeatured:
                false
            }
          }
        );

        event.isFeatured =
          true;
      } else {
        event.isFeatured =
          false;
      }
    }

    /*
     * Kiểm tra lại thời gian
     * sau khi đã update từng field.
     */
    const parsedTimes =
      validateEventTimes({
        startAt:
          event.startAt,
        endAt:
          event.endAt,
        bookingOpenAt:
          event.bookingOpenAt,
        bookingCloseAt:
          event.bookingCloseAt,
        status:
          event.status,
        allowBooking:
          event.allowBooking
      });

    event.startAt =
      parsedTimes.startAt;

    event.endAt =
      parsedTimes.endAt;

    event.bookingOpenAt =
      parsedTimes.bookingOpenAt;

    event.bookingCloseAt =
      parsedTimes.bookingCloseAt;

    event.updatedBy =
      ensureObjectId(
        updatedBy,
        "UPDATED_BY"
      );

    await event.save();

    return Event.findById(
      eventId
    )
      .populate(
        "createdBy",
        "username fullName email"
      )
      .populate(
        "updatedBy",
        "username fullName email"
      );
  };

export const getEventBySlug =
  async (
    slug
  ) => {
    const normalizedSlug =
      normalizeSlug(slug);

    if (!normalizedSlug) {
      throw new Error(
        "SLUG_INVALID"
      );
    }

    const event =
      await Event.findOne({
        slug:
          normalizedSlug,
        status:
          "published"
      })
        .populate(
          "createdBy",
          "username fullName email"
        )
        .populate(
          "updatedBy",
          "username fullName email"
        );

    if (!event) {
      throw new Error(
        "EVENT_NOT_FOUND"
      );
    }

    return event;
  };

export const getPublishedEvents =
  async ({
    limit = 20,
    skip = 0
  } = {}) => {
    return Event.find({
      status:
        "published"
    })
      .sort({
        startAt: 1
      })
      .skip(skip)
      .limit(limit);
  };

export const getFeaturedEvent =
  async () => {
    return Event.findOne({
      status:
        "published",
      isFeatured:
        true
    })
      .sort({
        updatedAt: -1,
        createdAt: -1
      })
      .populate(
        "createdBy",
        "username fullName email"
      )
      .populate(
        "updatedBy",
        "username fullName email"
      );
  };

export const getUpcomingEvents =
  async (
    limit = 3
  ) => {
    const now =
      new Date();

    return Event.find({
      status:
        "published",
      startAt: {
        $gte: now
      }
    })
      .sort({
        startAt: 1
      })
      .limit(limit);
  };

export const publishEvent =
  async (
    eventId,
    updatedBy
  ) => {
    if (!eventId) {
      throw new Error(
        "EVENT_ID_INVALID"
      );
    }

    if (!updatedBy) {
      throw new Error(
        "UPDATED_BY_INVALID"
      );
    }

    const event =
      await Event.findById(
        eventId
      );

    if (!event) {
      throw new Error(
        "EVENT_NOT_FOUND"
      );
    }

    validateEventTimes({
      startAt:
        event.startAt,
      endAt:
        event.endAt,
      bookingOpenAt:
        event.bookingOpenAt,
      bookingCloseAt:
        event.bookingCloseAt,
      status:
        "published",
      allowBooking:
        event.allowBooking
    });

    event.status =
      "published";

    event.updatedBy =
      ensureObjectId(
        updatedBy,
        "UPDATED_BY"
      );

    await event.save();

    return Event.findById(
      eventId
    )
      .populate(
        "createdBy",
        "username fullName email"
      )
      .populate(
        "updatedBy",
        "username fullName email"
      );
  };

export const cancelEvent =
  async (
    eventId,
    updatedBy
  ) => {
    if (!eventId) {
      throw new Error(
        "EVENT_ID_INVALID"
      );
    }

    if (!updatedBy) {
      throw new Error(
        "UPDATED_BY_INVALID"
      );
    }

    const event =
      await Event.findById(
        eventId
      );

    if (!event) {
      throw new Error(
        "EVENT_NOT_FOUND"
      );
    }

    event.status =
      "cancelled";

    event.allowBooking =
      false;

    event.updatedBy =
      ensureObjectId(
        updatedBy,
        "UPDATED_BY"
      );

    await event.save();

    return Event.findById(
      eventId
    )
      .populate(
        "createdBy",
        "username fullName email"
      )
      .populate(
        "updatedBy",
        "username fullName email"
      );
  };

export const getAdminEvents =
  async ({
    limit = 100,
    skip = 0
  } = {}) => {
    return Event.find({})
      .populate(
        "createdBy",
        "username fullName email"
      )
      .populate(
        "updatedBy",
        "username fullName email"
      )
      .sort({
        createdAt: -1
      })
      .skip(skip)
      .limit(limit);
  };

export const getAdminEventById =
  async (
    eventId
  ) => {
    if (!eventId) {
      throw new Error(
        "EVENT_ID_INVALID"
      );
    }

    const event =
      await Event.findById(
        eventId
      )
        .populate(
          "createdBy",
          "username fullName email"
        )
        .populate(
          "updatedBy",
          "username fullName email"
        );

    if (!event) {
      throw new Error(
        "EVENT_NOT_FOUND"
      );
    }

    return event;
  };

export const featureEvent =
  async (
    eventId,
    isFeatured
  ) => {
    if (!eventId) {
      throw new Error(
        "EVENT_ID_INVALID"
      );
    }

    const event =
      await Event.findById(
        eventId
      );

    if (!event) {
      throw new Error(
        "EVENT_NOT_FOUND"
      );
    }

    if (
      Boolean(
        isFeatured
      )
    ) {
      await Event.updateMany(
        {
          _id: {
            $ne: eventId
          },
          isFeatured:
            true
        },
        {
          $set: {
            isFeatured:
              false
          }
        }
      );

      event.isFeatured =
        true;
    } else {
      event.isFeatured =
        false;
    }

    await event.save();

    return Event.findById(
      eventId
    )
      .populate(
        "createdBy",
        "username fullName email"
      )
      .populate(
        "updatedBy",
        "username fullName email"
      );
  };