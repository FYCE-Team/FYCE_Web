const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL ||
    "http://localhost:3000/api";

const requestJson = async (
    url,
    options = {}
) => {
    const response = await fetch(
        url,
        options
    );

    let data = {};

    try {
        data = await response.json();
    } catch {
        data = {};
    }

    if (!response.ok) {
        const error = new Error(
            data?.message ||
                "Request thất bại."
        );

        error.status = response.status;
        error.data = data?.data || null;
        error.response = {
            status: response.status,
            data
        };

        throw error;
    }

    return data;
};

const authHeaders = (
    accessToken,
    json = false
) => ({
    ...(json
        ? {
              "Content-Type":
                  "application/json"
          }
        : {}),
    Authorization:
        `Bearer ${accessToken}`
});

export const getAdminEventSeats =
    async (
        eventId,
        accessToken
    ) => {
        return requestJson(
            `${API_BASE_URL}/admin/events/${eventId}/seats`,
            {
                method: "GET",
                headers: authHeaders(
                    accessToken
                )
            }
        );
    };

export const blockAdminSeat =
    async (
        seatId,
        reason,
        accessToken
    ) => {
        return requestJson(
            `${API_BASE_URL}/admin/seats/${seatId}/block`,
            {
                method: "POST",
                headers: authHeaders(
                    accessToken,
                    true
                ),
                body: JSON.stringify({
                    reason
                })
            }
        );
    };

export const unblockAdminSeat =
    async (
        seatId,
        accessToken
    ) => {
        return requestJson(
            `${API_BASE_URL}/admin/seats/${seatId}/unblock`,
            {
                method: "POST",
                headers: authHeaders(
                    accessToken
                )
            }
        );
    };

export const getAdminSeatHistory =
    async (
        seatId,
        accessToken
    ) => {
        return requestJson(
            `${API_BASE_URL}/admin/seats/${seatId}/history`,
            {
                method: "GET",
                headers: authHeaders(
                    accessToken
                )
            }
        );
    };
