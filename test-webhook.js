const payload = {
    timestamp: 1789630598,
    notification_type: "PAYMENT_SUCCESS",
    order: {
        order_amount: 1000000,
        order_invoice_number: "FYCE-20260917-46DA5C77"
    },
    transaction: {
        transaction_amount: 1000000
    }
};

fetch("http://localhost:3000/api/payments/sepay-webhook", {
    method: "POST",
    headers: {
        "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
})
.then(res => res.json())
.then(data => console.log(data))
.catch(err => console.error(err));
