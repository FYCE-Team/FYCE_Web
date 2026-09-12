import {
  createGallery,
  updateGallery,
  getActiveGallery,
  getAllGallery,
  activateGallery,
  deactivateGallery
} from "../services/gallery.service.js";

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
    case "GALLERY_ID_INVALID":
      return res.status(400).json({
        success: false,
        message: "Gallery ID không hợp lệ"
      });

    case "GALLERY_NOT_FOUND":
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy Gallery"
      });

    case "CREATED_BY_INVALID":
      return res.status(400).json({
        success: false,
        message: "createdBy không hợp lệ"
      });

    default:
      console.error(
        "Gallery controller error:",
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

    const gallery = await createGallery({
      ...req.body,
      createdBy: req.user.userId
    });

    res.status(201).json({
      success: true,
      message: "Tạo Gallery thành công",
      data: {
        gallery
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

    const gallery =
      await updateGallery(
        req.params.id,
        {
          ...req.body,
          updatedBy: req.user.userId
        }
      );

    res.status(200).json({
      success: true,
      message: "Cập nhật Gallery thành công",
      data: {
        gallery
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
    const rawLimit =
      Number.parseInt(
        req.query.limit,
        10
      );

    const rawSkip =
      Number.parseInt(
        req.query.skip,
        10
      );

    const limit = Math.min(
      Math.max(
        Number.isNaN(rawLimit)
          ? 20
          : rawLimit,
        1
      ),
      100
    );

    const skip = Math.max(
      Number.isNaN(rawSkip)
        ? 0
        : rawSkip,
      0
    );

    const category =
      req.query.category?.trim() || null;

    const galleries =
      await getActiveGallery({
        limit,
        skip,
        category
      });

    res.status(200).json({
      success: true,
      data: {
        galleries,
        pagination: {
          limit,
          skip,
          count: galleries.length
        }
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

    const rawLimit =
      Number.parseInt(
        req.query.limit,
        10
      );

    const rawSkip =
      Number.parseInt(
        req.query.skip,
        10
      );

    const limit = Math.min(
      Math.max(
        Number.isNaN(rawLimit)
          ? 100
          : rawLimit,
        1
      ),
      100
    );

    const skip = Math.max(
      Number.isNaN(rawSkip)
        ? 0
        : rawSkip,
      0
    );

    const category =
      req.query.category?.trim() || null;

    const galleries =
      await getAllGallery({
        limit,
        skip,
        category
      });

    res.status(200).json({
      success: true,
      data: {
        galleries,
        pagination: {
          limit,
          skip,
          count: galleries.length
        }
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

    const gallery =
      await activateGallery(
        req.params.id,
        req.user.userId
      );

    res.status(200).json({
      success: true,
      message:
        "Kích hoạt Gallery thành công",
      data: {
        gallery
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

    const gallery =
      await deactivateGallery(
        req.params.id,
        req.user.userId
      );

    res.status(200).json({
      success: true,
      message:
        "Tắt Gallery thành công",
      data: {
        gallery
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