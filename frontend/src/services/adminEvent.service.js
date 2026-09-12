const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL ||
    "http://localhost:3000/api";

const requestJson = async (
    url,
    options = {}
) => {
    const response =
        await fetch(
            url,
            options
        );

    let data = {};

    try {
        data =
            await response.json();
    } catch {
        data = {};
    }

    if (!response.ok) {
        const error =
            new Error(
                data?.message ||
                "Request thất bại."
            );

        error.response = {
            status:
                response.status,
            data
        };

        throw error;
    }

    return data;
};

export const getAdminEvents =
    async (
        accessToken
    ) => {
        return requestJson(
            `${API_BASE_URL}/events/admin/all`,
            {
                method: "GET",

                headers: {
                    Authorization:
                        `Bearer ${accessToken}`
                }
            }
        );
    };

export const getAdminEventById =
    async (
        eventId,
        accessToken
    ) => {
        return requestJson(
            `${API_BASE_URL}/events/admin/${eventId}`,
            {
                method: "GET",

                headers: {
                    Authorization:
                        `Bearer ${accessToken}`
                }
            }
        );
    };

export const createEvent =
    async (
        payload,
        accessToken
    ) => {
        return requestJson(
            `${API_BASE_URL}/events`,
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json",

                    Authorization:
                        `Bearer ${accessToken}`
                },

                body:
                    JSON.stringify(
                        payload
                    )
            }
        );
    };

export const updateEvent =
    async (
        eventId,
        payload,
        accessToken
    ) => {
        return requestJson(
            `${API_BASE_URL}/events/${eventId}`,
            {
                method: "PUT",

                headers: {
                    "Content-Type":
                        "application/json",

                    Authorization:
                        `Bearer ${accessToken}`
                },

                body:
                    JSON.stringify(
                        payload
                    )
            }
        );
    };

export const publishEvent =
    async (
        eventId,
        accessToken
    ) => {
        return requestJson(
            `${API_BASE_URL}/events/${eventId}/publish`,
            {
                method: "PATCH",

                headers: {
                    Authorization:
                        `Bearer ${accessToken}`
                }
            }
        );
    };

export const cancelEvent =
    async (
        eventId,
        accessToken
    ) => {
        return requestJson(
            `${API_BASE_URL}/events/${eventId}/cancel`,
            {
                method: "PATCH",

                headers: {
                    Authorization:
                        `Bearer ${accessToken}`
                }
            }
        );
    };

export const featureEvent =
    async (
        eventId,
        isFeatured,
        accessToken
    ) => {
        return requestJson(
            `${API_BASE_URL}/events/${eventId}/feature`,
            {
                method: "PATCH",

                headers: {
                    "Content-Type":
                        "application/json",

                    Authorization:
                        `Bearer ${accessToken}`
                },

                body:
                    JSON.stringify({
                        isFeatured:
                            Boolean(
                                isFeatured
                            )
                    })
            }
        );
    };

export const uploadImage =
    async (
        file,
        accessToken
    ) => {
        const formData =
            new FormData();

        formData.append(
            "image",
            file
        );

        return requestJson(
            `${API_BASE_URL}/images/upload`,
            {
                method: "POST",

                headers: {
                    Authorization:
                        `Bearer ${accessToken}`
                },

                body:
                    formData
            }
        );
    };

export const uploadVideo =
    async (
        file,
        accessToken
    ) => {
        const formData =
            new FormData();

        formData.append(
            "video",
            file
        );

        return requestJson(
            `${API_BASE_URL}/videos/upload`,
            {
                method: "POST",

                headers: {
                    Authorization:
                        `Bearer ${accessToken}`
                },

                body:
                    formData
            }
        );
    };

export const cloneEventSeatSetup =
    async (
        targetEventId,
        sourceEventId,
        accessToken
    ) => {
        return requestJson(
            `${API_BASE_URL}/events/${targetEventId}/clone-seat-setup`,
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json",

                    Authorization:
                        `Bearer ${accessToken}`
                },

                body:
                    JSON.stringify({
                        sourceEventId
                    })
            }
        );
    };

