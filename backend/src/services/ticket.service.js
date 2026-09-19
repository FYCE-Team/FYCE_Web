import mongoose from "mongoose";
import { randomBytes } from "node:crypto";

import Booking from "../models/Booking.js";
import Ticket from "../models/Ticket.js";
import User from "../models/User.js";
import {
    createTicketQrPayload,
    verifyTicketQrPayload
} from "../utils/ticketQr.js";

const ensureObjectId = (
    value,
    fieldName
) => {
    if (
        !value ||
        !mongoose.Types.ObjectId.isValid(
            value
        )
    ) {
        throw new Error(
            `${fieldName}_INVALID`
        );
    }

    return new mongoose.Types.ObjectId(
        value
    );
};

const normalizeBookingCode = (
    value
) => {
    const normalized = String(
        value || ""
    )
        .trim()
        .toUpperCase();

    if (!normalized) {
        throw new Error(
            "BOOKING_CODE_REQUIRED"
        );
    }

    return normalized;
};

const toUserTicketDto = (
    ticket
) => ({
    id: String(ticket._id),
    ticketCode: ticket.ticketCode,
    bookingCode: ticket.bookingCode,
    status: ticket.status,
    seat: {
        id: String(ticket.seatId),
        label: ticket.seatLabel,
        section: ticket.section,
        row: ticket.row,
        number: ticket.number
    },
    category: {
        code:
            ticket.ticketCategoryCode,
        name:
            ticket.ticketCategoryName
    },
    unitPrice: ticket.unitPrice,
    event: ticket.eventSnapshot,
    issuedAt: ticket.issuedAt,
    checkedInAt:
        ticket.checkedInAt || null,
    qrPayload:
        ticket.status === "valid"
            ? createTicketQrPayload(
                  ticket
              )
            : null
});

const toAdminTicketDto = (
    ticket,
    holder
) => ({
    id: String(ticket._id),
    ticketCode: ticket.ticketCode,
    bookingCode: ticket.bookingCode,
    status: ticket.status,
    holderName:
        holder?.fullName ||
        holder?.username ||
        "Khách hàng FYCE",
    seat: {
        label: ticket.seatLabel,
        section: ticket.section,
        row: ticket.row,
        number: ticket.number
    },
    category: {
        code:
            ticket.ticketCategoryCode,
        name:
            ticket.ticketCategoryName
    },
    event: ticket.eventSnapshot,
    issuedAt: ticket.issuedAt,
    checkedInAt:
        ticket.checkedInAt || null
});

export const ensureTicketsForBooking =
    async (bookingOrId) => {
        const booking =
            typeof bookingOrId ===
            "object"
                ? bookingOrId
                : await Booking.findById(
                      ensureObjectId(
                          bookingOrId,
                          "BOOKING_ID"
                      )
                  );

        if (!booking) {
            throw new Error(
                "BOOKING_NOT_FOUND"
            );
        }

        if (
            booking.status !==
                "confirmed" ||
            booking.paymentStatus !==
                "paid"
        ) {
            return [];
        }

        const operations =
            booking.items.map(
                (item) => ({
                    updateOne: {
                        filter: {
                            bookingId:
                                booking._id,
                            seatId:
                                item.seatId
                        },
                        update: {
                            $setOnInsert: {
                                ticketCode:
                                    item.ticketCode,
                                bookingId:
                                    booking._id,
                                bookingCode:
                                    booking.bookingCode,
                                userId:
                                    booking.userId,
                                eventId:
                                    booking.eventId,
                                seatId:
                                    item.seatId,
                                seatLabel:
                                    item.seatLabel,
                                section:
                                    item.section,
                                row:
                                    item.row,
                                number:
                                    item.number,
                                ticketCategoryCode:
                                    item.ticketCategoryCode,
                                ticketCategoryName:
                                    item.ticketCategoryName,
                                unitPrice:
                                    item.unitPrice,
                                eventSnapshot:
                                    booking.eventSnapshot,
                                status: "valid",
                                qrVersion:
                                    randomBytes(16).toString(
                                        "hex"
                                    ),
                                issuedAt:
                                    booking.confirmedAt ||
                                    new Date()
                            }
                        },
                        upsert: true
                    }
                })
            );

        if (operations.length > 0) {
            await Ticket.bulkWrite(
                operations,
                {
                    ordered: false
                }
            );
        }

        return Ticket.find({
            bookingId: booking._id
        }).sort({
            seatLabel: 1
        });
    };

export const getTicketsForBooking =
    async (
        bookingCode,
        userId
    ) => {
        const normalizedCode =
            normalizeBookingCode(
                bookingCode
            );
        const normalizedUserId =
            ensureObjectId(
                userId,
                "USER_ID"
            );

        const booking =
            await Booking.findOne({
                bookingCode:
                    normalizedCode,
                userId:
                    normalizedUserId
            });

        if (!booking) {
            throw new Error(
                "BOOKING_NOT_FOUND"
            );
        }

        if (
            booking.status !==
                "confirmed" ||
            booking.paymentStatus !==
                "paid"
        ) {
            return [];
        }

        const tickets =
            await ensureTicketsForBooking(
                booking
            );

        return tickets.map(
            toUserTicketDto
        );
    };

const loadTicketFromQr = async (
    qrPayload
) => {
    const {
        ticketId,
        qrVersion
    } = verifyTicketQrPayload(
        qrPayload
    );

    const ticket =
        await Ticket.findOne({
            _id: ensureObjectId(
                ticketId,
                "TICKET_ID"
            ),
            qrVersion
        });

    if (!ticket) {
        throw new Error(
            "TICKET_NOT_FOUND"
        );
    }

    return ticket;
};

export const verifyTicketForAdmin =
    async (qrPayload) => {
        const ticket =
            await loadTicketFromQr(
                qrPayload
            );

        const holder =
            await User.findById(
                ticket.userId
            )
                .select(
                    "fullName username"
                )
                .lean();

        const canCheckIn =
            ticket.status === "valid";

        let verification = "valid";

        if (
            ticket.status ===
            "checked_in"
        ) {
            verification =
                "already_checked_in";
        } else if (
            ticket.status ===
                "cancelled" ||
            ticket.status ===
                "refunded"
        ) {
            verification =
                "invalidated";
        }

        return {
            verification,
            canCheckIn,
            ticket:
                toAdminTicketDto(
                    ticket,
                    holder
                )
        };
    };

export const checkInTicketForAdmin =
    async (
        qrPayload,
        adminUserId
    ) => {
        const {
            ticketId,
            qrVersion
        } = verifyTicketQrPayload(
            qrPayload
        );

        const normalizedAdminId =
            ensureObjectId(
                adminUserId,
                "USER_ID"
            );
        const normalizedTicketId =
            ensureObjectId(
                ticketId,
                "TICKET_ID"
            );
        const now = new Date();

        const ticket =
            await Ticket.findOneAndUpdate(
                {
                    _id:
                        normalizedTicketId,
                    qrVersion,
                    status: "valid"
                },
                {
                    $set: {
                        status:
                            "checked_in",
                        checkedInAt: now,
                        checkedInBy:
                            normalizedAdminId
                    }
                },
                {
                    new: true
                }
            );

        if (!ticket) {
            const existing =
                await Ticket.findOne({
                    _id:
                        normalizedTicketId,
                    qrVersion
                });

            if (!existing) {
                throw new Error(
                    "TICKET_NOT_FOUND"
                );
            }

            if (
                existing.status ===
                "checked_in"
            ) {
                const error =
                    new Error(
                        "TICKET_ALREADY_CHECKED_IN"
                    );
                error.details = {
                    checkedInAt:
                        existing.checkedInAt
                };
                throw error;
            }

            throw new Error(
                "TICKET_NOT_VALID"
            );
        }

        const holder =
            await User.findById(
                ticket.userId
            )
                .select(
                    "fullName username"
                )
                .lean();

        return {
            verification:
                "checked_in",
            canCheckIn: false,
            ticket:
                toAdminTicketDto(
                    ticket,
                    holder
                )
        };
    };
