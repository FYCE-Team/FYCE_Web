import {
  createAbout,
  updateAbout,
  getActiveAbout,
  getAllAbout,
  activateAbout,
  deactivateAbout
} from "../services/about.service.js";

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
  if (error?.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }

  if (error?.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: "Dữ liệu không hợp lệ"
    });
  }

  switch (error.message) {
    case "ABOUT_ID_INVALID":
      return res.status(400).json({
        success: false,
        message: "About ID không hợp lệ"
      });

    case "ABOUT_NOT_FOUND":
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy About Section"
      });

    case "CREATED_BY_INVALID":
      return res.status(400).json({
        success: false,
        message: "createdBy không hợp lệ"
      });

    case "ABOUT_FEATURE_ORDER_DUPLICATE":
      return res.status(400).json({
        success: false,
        message:
          "Sort order của các feature không được trùng nhau"
      });

    default:
      console.error(
        "About controller error:",
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

    const about = await createAbout({
      ...req.body,
      createdBy: req.user.userId
    });

    res.status(201).json({
      success: true,
      message: "Tạo About Section thành công",
      data: {
        about
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

    const about = await updateAbout(
      req.params.id,
      {
        ...req.body,
        updatedBy: req.user.userId
      }
    );

    res.status(200).json({
      success: true,
      message:
        "Cập nhật About Section thành công",
      data: {
        about
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
    const about =
      await getActiveAbout();

    res.status(200).json({
      success: true,
      data: {
        about
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

    const abouts =
      await getAllAbout();

    res.status(200).json({
      success: true,
      data: {
        abouts
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

    const about =
      await activateAbout(
        req.params.id,
        req.user.userId
      );

    res.status(200).json({
      success: true,
      message:
        "Kích hoạt About Section thành công",
      data: {
        about
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

    const about =
      await deactivateAbout(
        req.params.id,
        req.user.userId
      );

    res.status(200).json({
      success: true,
      message:
        "Tắt About Section thành công",
      data: {
        about
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