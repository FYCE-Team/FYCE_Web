// Public discovery and seat reservations must use the same sale boundary.
// Existing orders may still be reconciled after an event is archived.
export const assertPublicEvent = (event) => {
    if (!event || event.deletedAt || event.status !== "published") {
        throw new Error("EVENT_NOT_FOUND");
    }
};

export const assertEventBookable = (event) => {
    const now = new Date();
    if (event.deletedAt) throw new Error("EVENT_NOT_FOUND");
    if (event.status === "sold_out") throw new Error("EVENT_SOLD_OUT");
    if (event.status !== "published" || event.allowBooking === false) {
        throw new Error("EVENT_BOOKING_NOT_ALLOWED");
    }
    if (event.bookingOpenAt && new Date(event.bookingOpenAt) > now) {
        throw new Error("EVENT_BOOKING_NOT_OPEN");
    }
    if ((event.bookingCloseAt && new Date(event.bookingCloseAt) <= now) ||
        (event.startAt && new Date(event.startAt) <= now)) {
        throw new Error("EVENT_BOOKING_CLOSED");
    }
};
