import {
  getHomepageData
} from "../services/homepage.service.js";

export const getHomepage = async (
  req,
  res,
  next
) => {
  try {
    const homepage =
      await getHomepageData();

    res.status(200).json({
      success: true,
      data: homepage
    });
  } catch (error) {
    console.error(
      "Homepage controller error:",
      error
    );

    next(error);
  }
};