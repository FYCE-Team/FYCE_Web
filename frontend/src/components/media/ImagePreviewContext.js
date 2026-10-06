import { createContext, useContext } from "react";

export const ImagePreviewContext = createContext(null);
export const useImagePreview = () => useContext(ImagePreviewContext);
