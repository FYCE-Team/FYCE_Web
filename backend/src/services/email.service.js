import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 30000,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === "true",

    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
    }
});

export const sendVerificationEmail = async ({
    email,
    fullName,
    otp
}) => {
    try {
        const info = await sendMail({
            from: `"FYCE Ensemble" <${process.env.SMTP_USER}>`,
            to: email,

            subject:
                "Mã kích hoạt tài khoản FYCE",

            html: `
                <div
                    style="
                        font-family:
                        Arial,
                        sans-serif;
                        max-width: 600px;
                        margin: auto;
                    "
                >
                    <h2>
                        Chào ${escapeHtml(fullName)}
                    </h2>

                    <p>
                        Cảm ơn bạn đã đăng ký tài khoản
                        tại Fantasy Youth Chamber Ensemble.
                    </p>

                    <p>
                        Mã kích hoạt của bạn là:
                    </p>

                    <h1
                        style="
                            letter-spacing: 8px;
                            color: #0870ad;
                        "
                    >
                        ${otp}
                    </h1>

                    <p>
                        Mã có hiệu lực trong
                        <strong>5 phút</strong>.
                    </p>

                    <p>
                        Không chia sẻ mã này
                        với bất kỳ ai.
                    </p>
                </div>
            `
        });

        console.log(
            "Verification email sent:",
            info.messageId
        );

        return info;
    } catch (error) {
        console.error(
            "SMTP email error:",
            error
        );

        throw error;
    }
};


export const sendPasswordResetOtpEmail = async ({
  to,
  otp,
  expiresMinutes = 5,
  fullName = "Bạn"
}) => {
  if (!to) {
    throw new Error("EMAIL_RECIPIENT_MISSING");
  }

  if (!otp) {
    throw new Error("OTP_MISSING");
  }

  const mailOptions = {
    from: `"Fantasy Youth Chamber Ensemble" <${process.env.SMTP_USER}>`,
    to,
    subject: "Mã OTP khôi phục mật khẩu - FYCE",
    text: [
      `Xin chào ${fullName},`,
      "",
      "Bạn vừa yêu cầu khôi phục mật khẩu tài khoản FYCE.",
      "",
      `Mã OTP của bạn là: ${otp}`,
      "",
      `Mã OTP có hiệu lực trong ${expiresMinutes} phút.`,
      "Vui lòng không cung cấp mã này cho bất kỳ ai.",
      "",
      "Nếu bạn không thực hiện yêu cầu này, hãy bỏ qua email này.",
      "",
      "Fantasy Youth Chamber Ensemble"
    ].join("\n"),
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #243447;">
        <h2 style="color: #0b6ea8;">
          Khôi phục mật khẩu FYCE
        </h2>

        <p>
          Xin chào <strong>${escapeHtml(fullName)}</strong>,
        </p>

        <p>
          Bạn vừa yêu cầu khôi phục mật khẩu cho tài khoản
          Fantasy Youth Chamber Ensemble.
        </p>

        <p>
          Mã OTP của bạn là:
        </p>

        <div style="
          display: inline-block;
          padding: 14px 24px;
          margin: 10px 0;
          background: #eef6ff;
          border-radius: 10px;
          font-size: 28px;
          font-weight: bold;
          letter-spacing: 6px;
          color: #0b6ea8;
        ">
          ${otp}
        </div>

        <p>
          Mã OTP có hiệu lực trong
          <strong>${expiresMinutes} phút</strong>.
        </p>

        <p>
          Vui lòng không cung cấp mã này cho bất kỳ ai.
        </p>

        <p style="color: #777;">
          Nếu bạn không thực hiện yêu cầu này, hãy bỏ qua email này.
        </p>

        <hr />

        <p style="font-size: 13px; color: #888;">
          Fantasy Youth Chamber Ensemble
        </p>
      </div>
    `
  };

  await sendMail(mailOptions);
};
const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const isEmailConfigured = () => process.env.EMAIL_PROVIDER === "resend"
  ? Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM)
  : Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD);

export const sendMail = async (options, fetcher = fetch) => {
  const from = process.env.EMAIL_FROM || `"FYCE Ensemble" <${process.env.SMTP_USER}>`;
  if (process.env.EMAIL_PROVIDER !== "resend") return transporter.sendMail({ ...options, from });
  if (!isEmailConfigured()) throw new Error("EMAIL_NOT_CONFIGURED");
  const response = await fetcher("https://api.resend.com/emails", {
    method: "POST", signal: AbortSignal.timeout(30000),
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json",
      ...(options.messageId ? { "Idempotency-Key": options.messageId } : {}) },
    body: JSON.stringify({ from, to: options.to, subject: options.subject, text: options.text, html: options.html,
      attachments: options.attachments?.map(a => ({ filename: a.filename, content: a.content.toString("base64"), content_id: a.cid, content_type: a.contentType })) })
  });
  if (!response.ok) throw Object.assign(new Error("EMAIL_DELIVERY_FAILED"), { status: response.status });
  const result = await response.json();
  if (!result.id) throw new Error("EMAIL_DELIVERY_NOT_CONFIRMED");
  return { messageId: result.id };
};
