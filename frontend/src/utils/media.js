const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL ||
    "http://localhost:3000/api";

const API_ORIGIN = API_BASE_URL.replace(
    /\/api\/?$/,
    ""
);

export const getMediaUrl = (url) => {
    if (!url) {
        return "";
    }

    const value = String(url).trim();

    if (!value) {
        return "";
    }

    if (
        value.startsWith("http://") ||
        value.startsWith("https://") ||
        value.startsWith("data:") ||
        value.startsWith("blob:")
    ) {
        return value;
    }

    if (value.startsWith("/")) {
        return `${API_ORIGIN}${value}`;
    }

    return `${API_ORIGIN}/${value}`;
};