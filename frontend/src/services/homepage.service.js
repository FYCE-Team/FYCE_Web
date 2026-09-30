import { API_BASE_URL } from "../config/api.js";

export const getHomepage = async () => {
    const response = await fetch(
        `${API_BASE_URL}/homepage`
    );

    const result = await response.json();

    if (!response.ok || !result.success) {
        throw new Error(
            result.message ||
            "Không thể tải dữ liệu Homepage"
        );
    }

    return result.data;
};