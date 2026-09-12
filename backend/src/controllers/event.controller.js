import {
  createEvent,
  updateEvent,
  getEventBySlug,
  getPublishedEvents,
  getFeaturedEvent,
  getUpcomingEvents,
  featureEvent,
  publishEvent,
  cancelEvent,
  getAdminEvents as getAdminEventsService
} from "../services/event.service.js";
import {
  getAdminEventById as getAdminEventByIdService
} from "../services/event.service.js";
import {
  cloneSeatSetupFromEvent
} from "../services/eventSeatConfig.service.js";
const requireAdmin = (req, res) => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: "Bạn chưa đăng nhập"
    });

    return false;
  }

  if (req.user.role !== "admin") {
    res.status(403).json({
      success: false,
      message: "Bạn không có quyền quản trị"
    });

    return false;
  }

  return true;
};

const handleServiceError = (error, res, next) => {
  switch (error.message) {
    case "EVENT_ID_INVALID":
      return res.status(400).json({
        success: false,
        message: "ID sự kiện không hợp lệ"
      });

    case "EVENT_NOT_FOUND":
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sự kiện"
      });

    case "SLUG_INVALID":
      return res.status(400).json({
        success: false,
        message: "Slug sự kiện không hợp lệ"
      });

    case "SLUG_EXISTS":
      return res.status(409).json({
        success: false,
        message: "Slug sự kiện đã tồn tại"
      });

    case "CREATED_BY_INVALID":
      return res.status(400).json({
        success: false,
        message: "Người tạo sự kiện không hợp lệ"
      });

    case "UPDATED_BY_INVALID":
      return res.status(400).json({
        success: false,
        message: "Người cập nhật không hợp lệ"
      });

    case "VENUE_INVALID":
      return res.status(400).json({
        success: false,
        code: "VENUE_INVALID",
        message:
          "Vui lòng nhập địa điểm hợp lệ"
      });

    case "EVENT_VENUE_LAYOUT_REQUIRED":
      return res.status(400).json({
        success: false,
        code:
          "EVENT_VENUE_LAYOUT_REQUIRED",
        message:
          "Sự kiện cần được gắn với địa điểm và sơ đồ ghế"
      });

    case "EVENT_VENUE_NOT_FOUND":
      return res.status(400).json({
        success: false,
        code:
          "EVENT_VENUE_NOT_FOUND",
        message:
          "Không tìm thấy địa điểm trong hệ thống. Kiểm tra lại tên địa điểm."
      });

    case "EVENT_VENUE_INACTIVE":
      return res.status(400).json({
        success: false,
        code:
          "EVENT_VENUE_INACTIVE",
        message:
          "Địa điểm này hiện không hoạt động"
      });

    case "EVENT_VENUE_LAYOUT_NOT_FOUND":
      return res.status(400).json({
        success: false,
        code:
          "EVENT_VENUE_LAYOUT_NOT_FOUND",
        message:
          "Địa điểm chưa có sơ đồ ghế đang hoạt động"
      });

    case "EVENT_VENUE_LAYOUT_AMBIGUOUS":
      return res.status(400).json({
        success: false,
        code:
          "EVENT_VENUE_LAYOUT_AMBIGUOUS",
        message:
          "Địa điểm có nhiều sơ đồ ghế nhưng chưa có sơ đồ mặc định"
      });

    case "EVENT_VENUE_LAYOUT_MISMATCH":
      return res.status(400).json({
        success: false,
        code:
          "EVENT_VENUE_LAYOUT_MISMATCH",
        message:
          "Sơ đồ ghế không thuộc địa điểm đã chọn"
      });

    case "EVENT_VENUE_LAYOUT_INACTIVE":
      return res.status(400).json({
        success: false,
        code:
          "EVENT_VENUE_LAYOUT_INACTIVE",
        message:
          "Sơ đồ ghế này hiện không hoạt động"
      });

    case "EVENT_START_TIME_INVALID":
      return res.status(400).json({
        success: false,
        code:
          "EVENT_START_TIME_INVALID",
        message:
          "Thời gian bắt đầu concert không hợp lệ"
      });

    case "EVENT_BOOKING_OPEN_TIME_INVALID":
      return res.status(400).json({
        success: false,
        code:
          "EVENT_BOOKING_OPEN_TIME_INVALID",
        message:
          "Thời gian mở bán phải bằng hoặc sau thời điểm hiện tại"
      });

    case "EVENT_BOOKING_CLOSE_AFTER_EVENT_START":
      return res.status(400).json({
        success: false,
        code:
          "EVENT_BOOKING_CLOSE_AFTER_EVENT_START",
        message:
          "Thời gian đóng bán phải trước hoặc bằng thời gian bắt đầu concert"
      });

    case "EVENT_BOOKING_OPEN_AFTER_EVENT_START":
      return res.status(400).json({
        success: false,
        code:
          "EVENT_BOOKING_OPEN_AFTER_EVENT_START",
        message:
          "Thời gian mở bán phải trước thời gian bắt đầu concert"
      });

    case "EVENT_END_TIME_INVALID":
      return res.status(400).json({
        success: false,
        message:
          "Thời gian kết thúc phải sau thời gian bắt đầu"
      });

    case "EVENT_BOOKING_TIME_INVALID":
      return res.status(400).json({
        success: false,
        message:
          "Thời gian đóng đặt vé phải sau thời gian mở đặt vé"
      });

    case "EVENT_TICKET_CATEGORY_DUPLICATE":
      return res.status(400).json({
        success: false,
        message:
          "Mã hạng vé không được trùng nhau"
      });

    case "EVENT_MOVEMENT_ORDER_DUPLICATE":
      return res.status(400).json({
        success: false,
        message:
          "Thứ tự tiết mục không được trùng nhau"
      });

    default:
      next(error);
  }
};

export const create = async (
  req,
  res,
  next
) => {
  try {
    if (!requireAdmin(req, res)) {
      return;
    }

    const event = await createEvent({
      ...req.body,
      createdBy: req.user.userId
    });

    return res.status(201).json({
      success: true,
      message: "Tạo sự kiện thành công",
      data: {
        event
      }
    });
  } catch (error) {
    return handleServiceError(
      error,
      res,
      next
    );
  }
};

export const update = async (
  req,
  res,
  next
) => {
  try {
    if (!requireAdmin(req, res)) {
      return;
    }

const event = await updateEvent(
  req.params.id,
  {
    ...req.body,
    updatedBy: req.user.userId
  }
);

    return res.status(200).json({
      success: true,
      message: "Cập nhật sự kiện thành công",
      data: {
        event
      }
    });
  } catch (error) {
    return handleServiceError(
      error,
      res,
      next
    );
  }
};

export const getBySlug = async (
  req,
  res,
  next
) => {
  try {
    const event =
      await getEventBySlug(
        req.params.slug
      );

    return res.status(200).json({
      success: true,
      message: "Lấy thông tin sự kiện thành công",
      data: {
        event
      }
    });
  } catch (error) {
    return handleServiceError(
      error,
      res,
      next
    );
  }
};

export const getPublished = async (
  req,
  res,
  next
) => {
  try {
    const limit = Math.min(
      Math.max(
        Number.parseInt(
          req.query.limit,
          10
        ) || 20,
        1
      ),
      100
    );

    const skip = Math.max(
      Number.parseInt(
        req.query.skip,
        10
      ) || 0,
      0
    );

    const events =
      await getPublishedEvents({
        limit,
        skip
      });

    return res.status(200).json({
      success: true,
      message:
        "Lấy danh sách sự kiện thành công",
      data: {
        events,
        pagination: {
          limit,
          skip,
          count: events.length
        }
      }
    });
  } catch (error) {
    return handleServiceError(
      error,
      res,
      next
    );
  }
};

export const getFeatured = async (
  req,
  res,
  next
) => {
  try {
    const event =
      await getFeaturedEvent();

    return res.status(200).json({
      success: true,
      message:
        "Lấy sự kiện nổi bật thành công",
      data: {
        event
      }
    });
  } catch (error) {
    return handleServiceError(
      error,
      res,
      next
    );
  }
};

export const getUpcoming = async (
  req,
  res,
  next
) => {
  try {
    const limit = Math.min(
      Math.max(
        Number.parseInt(
          req.query.limit,
          10
        ) || 3,
        1
      ),
      20
    );

    const events =
      await getUpcomingEvents(
        limit
      );

    return res.status(200).json({
      success: true,
      message:
        "Lấy danh sách sự kiện sắp diễn ra thành công",
      data: {
        events
      }
    });
  } catch (error) {
    return handleServiceError(
      error,
      res,
      next
    );
  }
};

export const publish = async (
  req,
  res,
  next
) => {
  try {
    if (!requireAdmin(req, res)) {
      return;
    }

    const event =
      await publishEvent(
        req.params.id,
        req.user.userId
      );

    return res.status(200).json({
      success: true,
      message:
        "Xuất bản sự kiện thành công",
      data: {
        event
      }
    });
  } catch (error) {
    return handleServiceError(
      error,
      res,
      next
    );
  }
};

export const cancel = async (
  req,
  res,
  next
) => {
  try {
    if (!requireAdmin(req, res)) {
      return;
    }

    const event =
      await cancelEvent(
        req.params.id,
        req.user.userId
      );

    return res.status(200).json({
      success: true,
      message:
        "Hủy sự kiện thành công",
      data: {
        event
      }
    });
  } catch (error) {
    return handleServiceError(
      error,
      res,
      next
    );
  }
};
export const feature = async (
    req,
    res,
    next
) => {
    try {
        if (!requireAdmin(req, res)) {
            return;
        }

        const isFeatured =
            req.body?.isFeatured === true;

        const event =
            await featureEvent(
                req.params.id,
                isFeatured
            );

        return res.status(200).json({
            success: true,
            message: isFeatured
                ? "Đã đặt sự kiện làm Featured."
                : "Đã bỏ Featured khỏi sự kiện.",
            data: {
                event
            }
        });
    } catch (error) {
        return handleServiceError(
            error,
            res,
            next
        );
    }
};
export const getAdminEvents = async (req, res, next) => {
  try {
    if (!requireAdmin(req, res)) {
      return;
    }

    const limit = Math.min(
      Math.max(
        Number.parseInt(req.query.limit, 10) || 100,
        1
      ),
      100
    );

    const skip = Math.max(
      Number.parseInt(req.query.skip, 10) || 0,
      0
    );

    const events = await getAdminEventsService({
      limit,
      skip
    });

    return res.status(200).json({
      success: true,
      message: "Lấy danh sách sự kiện cho admin thành công",
      data: {
        events,
        pagination: {
          limit,
          skip,
          count: events.length
        }
      }
    });
  } catch (error) {
    return handleServiceError(error, res, next);
  }
};
export const getAdminEventById = async (
    req,
    res,
    next
) => {
    try {
        if (!requireAdmin(req, res)) {
            return;
        }

        const event =
            await getAdminEventByIdService(
                req.params.id
            );

        return res.json({
            success: true,
            data: {
                event
            }
        });
    } catch (error) {
        return handleServiceError(
            error,
            res,
            next
        );
    }
};

export const cloneSeatSetup = async (
  req,
  res,
  next
) => {
  try {
    if (!requireAdmin(req, res)) {
      return;
    }

    const sourceEventId =
      req.body?.sourceEventId;

    const result =
      await cloneSeatSetupFromEvent({
        sourceEventId,
        targetEventId:
          req.params.id
      });

    return res.status(201).json({
      success: true,
      message:
        "Đã sao chép cấu hình ghế và tạo bộ ghế mới cho concert.",
      data: result
    });
  } catch (error) {
    const code =
      String(
        error?.message || ""
      ).split(":")[0];

    const detail =
      String(
        error?.message || ""
      ).includes(":")
        ? String(error.message)
            .split(":")
            .slice(1)
            .join(":")
        : "";

    switch (code) {
      case "SOURCE_EVENT_ID_INVALID":
        return res.status(400).json({
          success: false,
          code,
          message:
            "Concert nguồn không hợp lệ."
        });

      case "TARGET_EVENT_ID_INVALID":
        return res.status(400).json({
          success: false,
          code,
          message:
            "Concert đích không hợp lệ."
        });

      case "SEAT_SETUP_SOURCE_EQUALS_TARGET":
        return res.status(400).json({
          success: false,
          code,
          message:
            "Concert nguồn và concert đích phải khác nhau."
        });

      case "SOURCE_EVENT_NOT_FOUND":
        return res.status(404).json({
          success: false,
          code,
          message:
            "Không tìm thấy concert nguồn."
        });

      case "TARGET_EVENT_NOT_FOUND":
        return res.status(404).json({
          success: false,
          code,
          message:
            "Không tìm thấy concert đích."
        });

      case "SOURCE_EVENT_LAYOUT_REQUIRED":
        return res.status(409).json({
          success: false,
          code,
          message:
            "Concert nguồn chưa được gắn Venue/Layout."
        });

      case "TARGET_EVENT_LAYOUT_REQUIRED":
        return res.status(409).json({
          success: false,
          code,
          message:
            "Concert đích chưa được gắn Venue/Layout."
        });

      case "SEAT_SETUP_VENUE_MISMATCH":
        return res.status(409).json({
          success: false,
          code,
          message:
            "Hai concert không dùng cùng địa điểm."
        });

      case "SEAT_SETUP_LAYOUT_MISMATCH":
        return res.status(409).json({
          success: false,
          code,
          message:
            "Hai concert không dùng cùng sơ đồ ghế."
        });

      case "SOURCE_EVENT_SEAT_CONFIG_NOT_FOUND":
        return res.status(409).json({
          success: false,
          code,
          message:
            "Concert nguồn chưa có cấu hình ghế để sao chép."
        });

      case "SOURCE_EVENT_SEAT_CONFIG_MISMATCH":
        return res.status(409).json({
          success: false,
          code,
          message:
            "Cấu hình ghế của concert nguồn không khớp Venue/Layout."
        });

      case "TARGET_EVENT_ALREADY_HAS_SEATS":
        return res.status(409).json({
          success: false,
          code,
          message:
            `Concert đích đã có ${detail || "một số"} ghế. Không thể clone đè để tránh mất trạng thái đặt vé.`
        });

      case "TARGET_TICKET_CATEGORY_NOT_FOUND":
        return res.status(409).json({
          success: false,
          code,
          message:
            `Concert đích thiếu hạng vé ${detail || ""}. Hãy tạo cùng mã hạng vé với concert nguồn trước.`
        });

      case "SOURCE_ASSIGNMENT_CATEGORY_NOT_FOUND":
        return res.status(409).json({
          success: false,
          code,
          message:
            `Không xác định được hạng vé của ghế nguồn ${detail || ""}. EventSeatConfig của concert nguồn có thể đang dùng ticketCategoryId cũ.`
        });

      case "SOURCE_TICKET_CATEGORY_CODE_INVALID":
      case "TARGET_TICKET_CATEGORY_CODE_INVALID":
        return res.status(409).json({
          success: false,
          code,
          message:
            "Mã hạng vé của concert nguồn hoặc concert đích không hợp lệ."
        });

      default:
        return next(error);
    }
  }
};

