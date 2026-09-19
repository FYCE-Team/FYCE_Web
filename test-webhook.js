const bookingCode =
    process.env.BOOKING_CODE ||
    "FYCE-20260917-46DA5C77";
const amount = Number(
    process.env.PAYMENT_AMOUNT ||
        1000000
);
const secret =
    process.env.SEPAY_SECRET_KEY;

if (!secret) {
    console.error(
        "Missing SEPAY_SECRET_KEY. Run this test with the same SePay secret configured in backend/.env."
    );
    process.exit(1);
}

const payload = {
    timestamp: Math.floor(
        Date.now() / 1000
    ),
    notification_type:
        "ORDER_PAID",
    order: {
        order_status: "CAPTURED",
        order_currency: "VND",
        order_amount: String(amount),
        order_invoice_number:
            bookingCode
    },
    transaction: {
        transaction_status:
            "APPROVED",
        transaction_type: "PAYMENT",
        transaction_currency: "VND",
        transaction_amount:
            String(amount)
    }
};

fetch(
    "http://localhost:3000/api/payments/sepay-webhook",
    {
        method: "POST",
        headers: {
            "Content-Type":
                "application/json",
            "X-Secret-Key": secret
        },
        body: JSON.stringify(
            payload
        )
    }
)
    .then((res) => res.json())
    .then((data) =>
        console.log(data)
    )
    .catch((err) =>
        console.error(err)
    );
