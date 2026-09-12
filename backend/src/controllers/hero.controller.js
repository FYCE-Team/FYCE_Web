import {
  createHero,
  updateHero,
  getActiveHero,
  getAllHeroes,
  activateHero,
  deactivateHero
} from "../services/hero.service.js";

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

const handleServiceError = (
  error,
  res,
  next
) => {
  if (
    error?.name === "ValidationError"
  ) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }

  if (
    error?.name === "CastError"
  ) {
    return res.status(400).json({
      success: false,
      message: "Dữ liệu không hợp lệ"
    });
  }

  if (
    error?.code === 11000
  ) {
    return res.status(409).json({
      success: false,
      message: "Dữ liệu đã tồn tại"
    });
  }

  switch (error.message) {
    case "HERO_ID_INVALID":
      return res.status(400).json({
        success: false,
        message: "Hero ID không hợp lệ"
      });

    case "HERO_NOT_FOUND":
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy Hero"
      });

    case "CREATED_BY_INVALID":
      return res.status(400).json({
        success: false,
        message: "createdBy không hợp lệ"
      });

    case "HERO_FEATURED_EVENT_INVALID":
      return res.status(400).json({
        success: false,
        message:
          "Featured Event không tồn tại hoặc chưa được publish"
      });

    case "HERO_BACKGROUND_SOURCE_CONFLICT":
      return res.status(400).json({
        success: false,
        message:
          "Không thể dùng đồng thời background image và background video"
      });

    default:
      console.error(
        "Hero controller error:",
        error
      );

      return next(error);
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

    const hero = await createHero({
      ...req.body,
      createdBy: req.user.userId
    });

    res.status(201).json({
      success: true,
      message: "Tạo Hero thành công",
      data: {
        hero
      }
    });
  } catch (error) {
    handleServiceError(
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

    const hero = await updateHero(
      req.params.id,
      {
        ...req.body,
        updatedBy: req.user.userId
      }
    );

    res.status(200).json({
      success: true,
      message: "Cập nhật Hero thành công",
      data: {
        hero
      }
    });
  } catch (error) {
    handleServiceError(
      error,
      res,
      next
    );
  }
};

export const getActive = async (
  req,
  res,
  next
) => {
  try {
    const hero = await getActiveHero();

    res.status(200).json({
      success: true,
      data: {
        hero
      }
    });
  } catch (error) {
    handleServiceError(
      error,
      res,
      next
    );
  }
};

export const getAll = async (
  req,
  res,
  next
) => {
  try {
    if (!requireAdmin(req, res)) {
      return;
    }

    const heroes =
      await getAllHeroes();

    res.status(200).json({
      success: true,
      data: {
        heroes
      }
    });
  } catch (error) {
    handleServiceError(
      error,
      res,
      next
    );
  }
};

export const activate = async (
  req,
  res,
  next
) => {
  try {
    if (!requireAdmin(req, res)) {
      return;
    }

    const hero = await activateHero(
      req.params.id,
      req.user.userId
    );

    res.status(200).json({
      success: true,
      message: "Kích hoạt Hero thành công",
      data: {
        hero
      }
    });
  } catch (error) {
    handleServiceError(
      error,
      res,
      next
    );
  }
};

export const deactivate = async (
  req,
  res,
  next
) => {
  try {
    if (!requireAdmin(req, res)) {
      return;
    }

    const hero =
      await deactivateHero(
        req.params.id,
        req.user.userId
      );

    res.status(200).json({
      success: true,
      message:
        "Tắt Hero thành công",
      data: {
        hero
      }
    });
  } catch (error) {
    handleServiceError(
      error,
      res,
      next
    );
  }
};