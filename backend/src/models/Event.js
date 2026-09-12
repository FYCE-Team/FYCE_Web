import mongoose from "mongoose";

/*
 * ============================================================
 * PROGRAM
 * ============================================================
 */

const workSchema = new mongoose.Schema(
  {
    order: {
      type: Number,
      required: true,
      min: 1
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300
    },

    subtitle: {
      type: String,
      trim: true,
      default: "",
      maxlength: 300
    },

    composer: {
      type: String,
      trim: true,
      default: "",
      maxlength: 200
    },

    durationMinutes: {
      type: Number,
      min: 0,
      default: null
    },

    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: 2000
    }
  },
  {
    _id: true
  }
);

const programPartSchema = new mongoose.Schema(
  {
    order: {
      type: Number,
      required: true,
      min: 1
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200
    },

    subtitle: {
      type: String,
      trim: true,
      default: "",
      maxlength: 300
    },

    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: 2000
    },

    works: {
      type: [workSchema],
      default: []
    }
  },
  {
    _id: true
  }
);


/*
 * ============================================================
 * ARTISTS
 * ============================================================
 */

const artistSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150
    },

    role: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },

    bio: {
      type: String,
      trim: true,
      default: "",
      maxlength: 2000
    },

    image: {
      type: String,
      trim: true,
      default: ""
    },

    instrument: {
      type: String,
      trim: true,
      default: "",
      maxlength: 100
    }
  },
  {
    _id: true
  }
);


/*
 * ============================================================
 * TICKET CATEGORY
 * ============================================================
 */

const ticketCategorySchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: 30
    },

    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },

    price: {
      type: Number,
      required: true,
      min: 0
    },

    colorCode: {
      type: String,
      trim: true,
      default: "#2D7F73"
    },

    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: 300
    },

    benefits: {
      type: [String],
      default: []
    },

    seatType: {
      type: String,
      enum: [
        "assigned",
        "general_admission"
      ],
      default: "assigned"
    },

    maxPerOrder: {
      type: Number,
      min: 1,
      default: 6
    },

    sortOrder: {
      type: Number,
      min: 0,
      default: 0
    },

    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    _id: true
  }
);


/*
 * ============================================================
 * POLICY
 * ============================================================
 */

const policySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150
    },

    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500
    },

    icon: {
      type: String,
      trim: true,
      default: ""
    },

    type: {
      type: String,
      enum: [
        "dress_code",
        "arrival",
        "age",
        "mobile",
        "ticket",
        "information",
        "venue",
        "general"
      ],
      default: "general"
    },

    sortOrder: {
      type: Number,
      min: 0,
      default: 0
    }
  },
  {
    _id: true
  }
);


/*
 * ============================================================
 * GALLERY
 * ============================================================
 *
 * Dùng chung cho:
 * - programGallery
 * - backstageGallery
 */

const galleryItemSchema = new mongoose.Schema(
  {
    image: {
      type: String,
      required: true,
      trim: true
    },

    caption: {
      type: String,
      trim: true,
      default: "",
      maxlength: 500
    },

    sortOrder: {
      type: Number,
      min: 0,
      default: 0
    }
  },
  {
    _id: true
  }
);


/*
 * ============================================================
 * EVENT
 * ============================================================
 */

const eventSchema = new mongoose.Schema(
  {
    /*
     * --------------------------------------------------------
     * BASIC INFORMATION
     * --------------------------------------------------------
     */

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: 220
    },

    badge: {
      type: String,
      trim: true,
      default: "",
      maxlength: 100
    },

    shortDescription: {
      type: String,
      trim: true,
      default: "",
      maxlength: 500
    },

    description: {
      type: String,
      trim: true,
      default: ""
    },

    subtitle: {
      type: String,
      trim: true,
      default: "",
      maxlength: 300
    },


    /*
     * --------------------------------------------------------
     * HERO MEDIA
     * --------------------------------------------------------
     */

    coverImage: {
      type: String,
      trim: true,
      default: ""
    },

    heroVideoUrl: {
      type: String,
      trim: true,
      default: ""
    },

    trailerVideoUrl: {
      type: String,
      trim: true,
      default: ""
    },


    /*
     * --------------------------------------------------------
     * SCHEDULE
     * --------------------------------------------------------
     */

    startAt: {
      type: Date,
      default: null,
      index: true
    },

    endAt: {
      type: Date,
      default: null
    },

    bookingOpenAt: {
      type: Date,
      default: null
    },

    bookingCloseAt: {
      type: Date,
      default: null
    },


    /*
     * --------------------------------------------------------
     * VENUE
     * --------------------------------------------------------
     */

    /*
     * Legacy / display field.
     * Giữ lại để không phá dữ liệu và frontend hiện tại.
     */
    venue: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200
    },

    /*
     * Venue architecture:
     * Event -> Venue -> VenueLayout
     *
     * Tạm thời optional trong giai đoạn migrate event cũ.
     * Sau khi migrate xong có thể đổi required: true.
     */
    venueId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Venue",
      default: null,
      index: true
    },

    venueLayoutId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "VenueLayout",
      default: null,
      index: true
    },

    address: {
      type: String,
      trim: true,
      default: "",
      maxlength: 300
    },

    city: {
      type: String,
      trim: true,
      default: "",
      maxlength: 100
    },

    venueDescription: {
      type: String,
      trim: true,
      default: "",
      maxlength: 500
    },


    /*
     * --------------------------------------------------------
     * SEATING
     * --------------------------------------------------------
     *
     * Hiện tại vẫn dùng image.
     * Sau này có thể thêm seatingPlanId.
     */

    seatingChartImage: {
      type: String,
      trim: true,
      default: ""
    },

    totalTickets: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },


    /*
     * --------------------------------------------------------
     * TICKETING
     * --------------------------------------------------------
     */

    ticketCategories: {
      type: [ticketCategorySchema],
      default: []
    },


    /*
     * --------------------------------------------------------
     * CONCERT PROGRAM
     * --------------------------------------------------------
     *
     * Cấu trúc:
     *
     * programParts[]
     *   └── works[]
     *
     * Ví dụ:
     *
     * Part I
     *   ├── Work 1
     *   ├── Work 2
     *   └── Work 3
     *
     * Part II
     *   ├── Work 1
     *   └── Work 2
     */

    programParts: {
      type: [programPartSchema],
      default: []
    },


    /*
     * --------------------------------------------------------
     * ARTISTS
     * --------------------------------------------------------
     */

    artists: {
      type: [artistSchema],
      default: []
    },


    /*
     * --------------------------------------------------------
     * POLICIES
     * --------------------------------------------------------
     */

    policies: {
      type: [policySchema],
      default: []
    },


    /*
     * --------------------------------------------------------
     * PROGRAM GALLERY
     * --------------------------------------------------------
     *
     * Ảnh liên quan trực tiếp tới concert:
     * - sân khấu
     * - biểu diễn
     * - nghệ sĩ trên sân khấu
     * - khán phòng
     * - hình ảnh chương trình
     */

    programGallery: {
      type: [galleryItemSchema],
      default: []
    },


    /*
     * --------------------------------------------------------
     * BACKSTAGE GALLERY
     * --------------------------------------------------------
     *
     * Ảnh hậu trường:
     * - tập luyện
     * - rehearsal
     * - chuẩn bị sân khấu
     * - backstage
     * - hoạt động thành viên
     */

    backstageGallery: {
      type: [galleryItemSchema],
      default: []
    },


    /*
     * --------------------------------------------------------
     * CONDUCTOR
     * --------------------------------------------------------
     */

    conductor: {
      type: String,
      trim: true,
      default: "",
      maxlength: 150
    },


    /*
     * --------------------------------------------------------
     * LEGACY FIELDS
     * --------------------------------------------------------
     *
     * Giữ tạm để không làm mất dữ liệu cũ trong MongoDB.
     *
     * movements:
     *   cấu trúc cũ của chương trình
     *
     * gallery:
     *   gallery cũ chưa phân loại
     *
     * Sau khi migrate dữ liệu xong có thể xoá.
     */

    movements: {
      type: [
        new mongoose.Schema(
          {
            order: {
              type: Number,
              required: true,
              min: 1
            },

            title: {
              type: String,
              required: true,
              trim: true,
              maxlength: 200
            },

            subtitle: {
              type: String,
              trim: true,
              default: "",
              maxlength: 300
            },

            composer: {
              type: String,
              trim: true,
              default: "",
              maxlength: 150
            },

            durationMinutes: {
              type: Number,
              min: 1,
              default: null
            },

            description: {
              type: String,
              trim: true,
              default: ""
            }
          },
          {
            _id: true
          }
        )
      ],
      default: []
    },

    gallery: {
      type: [galleryItemSchema],
      default: []
    },


    /*
     * --------------------------------------------------------
     * EVENT STATUS
     * --------------------------------------------------------
     */

    status: {
      type: String,
      enum: [
        "draft",
        "published",
        "sold_out",
        "cancelled",
        "completed"
      ],
      default: "draft",
      index: true
    },

    isFeatured: {
      type: Boolean,
      default: false,
      index: true
    },

    allowBooking: {
      type: Boolean,
      default: true
    },


    /*
     * --------------------------------------------------------
     * AUDIT
     * --------------------------------------------------------
     */

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    }
  },
  {
    timestamps: true
  }
);


/*
 * ============================================================
 * INDEXES
 * ============================================================
 */

eventSchema.index({
  status: 1,
  startAt: 1
});

eventSchema.index({
  isFeatured: 1,
  status: 1,
  startAt: 1
});

eventSchema.index({
  city: 1,
  status: 1,
  startAt: 1
});

eventSchema.index({
  venueId: 1,
  status: 1,
  startAt: 1
});


/*
 * ============================================================
 * VALIDATION
 * ============================================================
 */

eventSchema.pre("validate", async function () {
  const now = new Date();

  // datetime-local chỉ chính xác đến phút.
  // Cho phép chọn đúng phút hiện tại.
  now.setSeconds(
    0,
    0
  );


  /*
   * ----------------------------------------------------------
   * VENUE / VENUE LAYOUT VALIDATION
   * ----------------------------------------------------------
   */

  if (this.venueId || this.venueLayoutId) {
    if (!this.venueId || !this.venueLayoutId) {
      throw new Error(
        "EVENT_VENUE_LAYOUT_REQUIRED"
      );
    }

    const VenueLayout =
      mongoose.model("VenueLayout");

    const layout =
      await VenueLayout.findById(
        this.venueLayoutId
      )
        .select("venueId isActive")
        .lean();

    if (!layout) {
      throw new Error(
        "EVENT_VENUE_LAYOUT_NOT_FOUND"
      );
    }

    if (
      String(layout.venueId) !==
      String(this.venueId)
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

    const Venue =
      mongoose.model("Venue");

    const venue =
      await Venue.findById(
        this.venueId
      )
        .select("isActive")
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
  }


  /*
   * ----------------------------------------------------------
   * COMING SOON
   * ----------------------------------------------------------
   *
   * startAt = null
   *
   * => endAt = null
   * => bookingOpenAt = null
   * => bookingCloseAt = null
   * => allowBooking = false
   */

  if (!this.startAt) {
    if (
      this.endAt ||
      this.bookingOpenAt ||
      this.bookingCloseAt
    ) {
      throw new Error(
        "EVENT_COMING_SOON_TIME_INVALID"
      );
    }

    if (this.allowBooking) {
      throw new Error(
        "EVENT_COMING_SOON_BOOKING_INVALID"
      );
    }
  }


  /*
   * ----------------------------------------------------------
   * ACTIVE EVENT TIME VALIDATION
   * ----------------------------------------------------------
   */

  if (
    this.startAt &&
    [
      "draft",
      "published",
      "sold_out"
    ].includes(this.status)
  ) {
    if (this.startAt < now) {
      throw new Error(
        "EVENT_START_TIME_INVALID"
      );
    }

    if (!this.endAt) {
      throw new Error(
        "EVENT_END_TIME_REQUIRED"
      );
    }

    if (this.endAt <= this.startAt) {
      throw new Error(
        "EVENT_END_TIME_INVALID"
      );
    }

    if (!this.bookingOpenAt) {
      throw new Error(
        "EVENT_BOOKING_OPEN_TIME_REQUIRED"
      );
    }

    if (!this.bookingCloseAt) {
      throw new Error(
        "EVENT_BOOKING_CLOSE_TIME_REQUIRED"
      );
    }

    /*
     * CREATE và EDIT đều áp dụng cùng một quy tắc:
     * bookingOpenAt phải bằng hoặc sau thời điểm hiện tại.
     */
    if (
      this.bookingOpenAt < now
    ) {
      throw new Error(
        "EVENT_BOOKING_OPEN_TIME_INVALID"
      );
    }

    if (
      this.bookingOpenAt >=
      this.bookingCloseAt
    ) {
      throw new Error(
        "EVENT_BOOKING_TIME_INVALID"
      );
    }

    if (
      this.bookingCloseAt >
      this.startAt
    ) {
      throw new Error(
        "EVENT_BOOKING_CLOSE_AFTER_EVENT_START"
      );
    }

    if (
      this.bookingOpenAt >=
      this.startAt
    ) {
      throw new Error(
        "EVENT_BOOKING_OPEN_AFTER_EVENT_START"
      );
    }
  }


  /*
   * ----------------------------------------------------------
   * GENERAL TIME RELATIONSHIPS
   * ----------------------------------------------------------
   */

  if (
    this.startAt &&
    this.endAt &&
    this.endAt <= this.startAt
  ) {
    throw new Error(
      "EVENT_END_TIME_INVALID"
    );
  }

  if (
    this.bookingOpenAt &&
    this.bookingCloseAt &&
    this.bookingCloseAt <=
      this.bookingOpenAt
  ) {
    throw new Error(
      "EVENT_BOOKING_TIME_INVALID"
    );
  }

  if (
    this.bookingCloseAt &&
    this.startAt &&
    this.bookingCloseAt >
      this.startAt
  ) {
    throw new Error(
      "EVENT_BOOKING_CLOSE_AFTER_EVENT_START"
    );
  }


  /*
   * ----------------------------------------------------------
   * TICKET CATEGORY CODE
   * ----------------------------------------------------------
   */

  const categoryCodes =
    this.ticketCategories.map(
      category => category.code
    );

  const uniqueCategoryCodes =
    new Set(categoryCodes);

  if (
    uniqueCategoryCodes.size !==
    categoryCodes.length
  ) {
    throw new Error(
      "EVENT_TICKET_CATEGORY_DUPLICATE"
    );
  }


  /*
   * ----------------------------------------------------------
   * PROGRAM PART ORDER
   * ----------------------------------------------------------
   */

  const programPartOrders =
    this.programParts.map(
      part => part.order
    );

  const uniqueProgramPartOrders =
    new Set(programPartOrders);

  if (
    uniqueProgramPartOrders.size !==
    programPartOrders.length
  ) {
    throw new Error(
      "EVENT_PROGRAM_PART_ORDER_DUPLICATE"
    );
  }


  /*
   * ----------------------------------------------------------
   * WORK ORDER INSIDE EACH PART
   * ----------------------------------------------------------
   */

  for (
    const part of this.programParts
  ) {
    const workOrders =
      part.works.map(
        work => work.order
      );

    const uniqueWorkOrders =
      new Set(workOrders);

    if (
      uniqueWorkOrders.size !==
      workOrders.length
    ) {
      throw new Error(
        "EVENT_WORK_ORDER_DUPLICATE"
      );
    }
  }


  /*
   * ----------------------------------------------------------
   * LEGACY MOVEMENT ORDER
   * ----------------------------------------------------------
   *
   * Chỉ kiểm tra dữ liệu cũ.
   */

  const movementOrders =
    this.movements.map(
      movement => movement.order
    );

  const uniqueMovementOrders =
    new Set(movementOrders);

  if (
    uniqueMovementOrders.size !==
    movementOrders.length
  ) {
    throw new Error(
      "EVENT_MOVEMENT_ORDER_DUPLICATE"
    );
  }


  /*
   * ----------------------------------------------------------
   * GALLERY SORT ORDER
   * ----------------------------------------------------------
   */

  const validateGalleryOrders = (
    gallery
  ) => {
    const orders =
      gallery.map(
        item => item.sortOrder
      );

    const uniqueOrders =
      new Set(orders);

    if (
      uniqueOrders.size !==
      orders.length
    ) {
      throw new Error(
        "EVENT_GALLERY_ORDER_DUPLICATE"
      );
    }
  };

  validateGalleryOrders(
    this.programGallery
  );

  validateGalleryOrders(
    this.backstageGallery
  );
});


export default mongoose.model(
  "Event",
  eventSchema
);