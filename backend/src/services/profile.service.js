import mongoose from "mongoose";
import { randomInt, createHmac, timingSafeEqual } from "node:crypto";
import bcrypt from "bcrypt";
import User from "../models/User.js";
import ProfileOtp from "../models/ProfileOtp.js";
import RefreshToken from "../models/RefreshToken.js";
import PasswordReset from "../models/PasswordReset.js";
import { sendPasswordResetOtpEmail } from "./email.service.js";
import { uploadImageBuffer } from "./image.service.js";
const AVATAR_STORAGE_BYTES = 25 * 1024 * 1024;
const AVATAR_STORAGE_COUNT = 20;

const reserveAvatarStorage = async (userId, bytes) => {
  const user = await User.findById(userId).select("+avatarStorageBytes +avatarStorageCount").lean();
  if (!user?.isActive || user.isBlocked || user.deletedAt) fail(403, "Tài khoản không còn hoạt động.");
  if (user.avatarStorageBytes === undefined && user.avatarStorageCount === undefined) {
    // Legacy avatars use the fixed server filename/originalName "avatar". CMS images are excluded.
    const [usage] = await mongoose.connection.db.collection("images.files").aggregate([
      { $match: {
        "metadata.uploadedBy": { $in: [String(userId), new mongoose.Types.ObjectId(String(userId))] },
        $or: [{ "metadata.purpose": "avatar" }, { filename: "avatar", "metadata.originalName": "avatar" }]
      } },
      { $group: { _id: null, bytes: { $sum: "$length" }, count: { $sum: 1 } } }
    ]).toArray();
    // Initialize once; concurrent requests cannot overwrite another reservation.
    await User.updateOne({ _id: userId, avatarStorageBytes: { $exists: false }, avatarStorageCount: { $exists: false } }, {
      $set: { avatarStorageBytes: usage?.bytes || 0, avatarStorageCount: usage?.count || 0 }
    });
  }
  const reserved = await User.updateOne({
    _id: userId, isActive: true, isBlocked: { $ne: true }, deletedAt: null,
    avatarStorageBytes: { $gte: 0, $lte: AVATAR_STORAGE_BYTES - bytes },
    avatarStorageCount: { $gte: 0, $lt: AVATAR_STORAGE_COUNT }
  }, { $inc: { avatarStorageBytes: bytes, avatarStorageCount: 1 } });
  if (!reserved.matchedCount) fail(409, "Dung lượng ảnh đại diện đã đạt giới hạn. Vui lòng liên hệ FYCE để được hỗ trợ dọn ảnh cũ.");
};
const fail = (status, message) => {
  throw Object.assign(new Error(message), { status });
};
const digest = (value) =>
  createHmac("sha256", process.env.JWT_REFRESH_SECRET)
    .update(value)
    .digest("hex");
export const requestProfileOtp = async (
  userId,
  send = sendPasswordResetOtpEmail,
) => {
  const user = await User.findById(userId);
  if (!user?.isActive || user.isBlocked)
    fail(403, "Tài khoản không còn hoạt động.");
  const recent = await ProfileOtp.exists({
    userId,
    createdAt: { $gt: new Date(Date.now() - 60000) },
  });
  if (recent) fail(429, "Vui lòng chờ 60 giây trước khi gửi lại mã.");
  const otp = String(randomInt(100000, 1000000));
  const hash = digest(`${userId}:${otp}`);
  try {
    await ProfileOtp.findOneAndUpdate(
      { userId, createdAt: { $lte: new Date(Date.now() - 60000) } },
      {
        hash,
        attempts: 0,
        expiresAt: new Date(Date.now() + 300000),
        createdAt: new Date(),
      },
      { upsert: true, timestamps: false },
    );
  } catch (error) {
    if (error.code === 11000)
      fail(429, "Vui lòng chờ 60 giây trước khi gửi lại mã.");
    throw error;
  }
  try {
    await send({ to: user.email, fullName: user.fullName, otp });
  } catch {
    await ProfileOtp.deleteOne({ userId, hash });
    fail(503, "Chưa gửi được email. Vui lòng thử lại sau.");
  }
  return {
    message: "Mã xác minh đã gửi đến email tài khoản, có hiệu lực 5 phút.",
  };
};
export const changeProfilePassword = async (userId, { otp, password } = {}) => {
  if (typeof otp !== "string" || !/^\d{6}$/.test(otp))
    fail(400, "Mã xác minh gồm 6 chữ số.");
  if (
    typeof password !== "string" ||
    password.length < 8 ||
    Buffer.byteLength(password) > 72 ||
    !/[A-Z]/.test(password) ||
    !/[a-z]/.test(password) ||
    !/\d/.test(password)
  )
    fail(
      400,
      "Mật khẩu cần ít nhất 8 ký tự và tối đa 72 byte, gồm chữ hoa, chữ thường và số.",
    );
  const record = await ProfileOtp.findOne({
    userId,
    expiresAt: { $gt: new Date() },
    attempts: { $lt: 5 },
  });
  if (!record)
    fail(400, "Mã đã hết hạn hoặc quá số lần thử. Hãy yêu cầu mã mới.");
  const hash = digest(`${userId}:${otp}`);
  if (!timingSafeEqual(Buffer.from(hash), Buffer.from(record.hash))) {
    await ProfileOtp.updateOne(
      { _id: record._id, hash: record.hash, attempts: { $lt: 5 } },
      { $inc: { attempts: 1 } },
    );
    fail(400, "Mã xác minh không đúng.");
  }
  const passwordHash = await bcrypt.hash(password, 12);
  await mongoose.connection.transaction(async (session) => {
    const consumed = await ProfileOtp.findOneAndDelete(
      {
        _id: record._id,
        userId,
        hash,
        expiresAt: { $gt: new Date() },
        attempts: { $lt: 5 },
      },
      { session },
    );
    if (!consumed)
      fail(409, "Mã đã được sử dụng hoặc thay đổi. Hãy yêu cầu mã mới.");
    const user = await User.findOneAndUpdate(
      { _id: userId, isActive: true, isBlocked: { $ne: true } },
      { $set: { password: passwordHash }, $inc: { authVersion: 1 } },
      { session },
    );
    if (!user) fail(403, "Tài khoản không còn hoạt động.");
    await RefreshToken.deleteMany({ userId }, { session });
    await PasswordReset.deleteMany({ userId }, { session });
  });
  return {
    message: "Đã đổi mật khẩu. Vui lòng đăng nhập lại trên các thiết bị.",
  };
};
export const updateAvatar = async (userId, file) => {
  if (!file || file.size > 5 * 1024 * 1024)
    fail(400, "Chọn ảnh JPG, PNG hoặc WebP, tối đa 5MB.");
  const b = file.buffer;
  if (!Buffer.isBuffer(b) || b.length < 12 || b.length > 5 * 1024 * 1024) fail(400, "Tệp ảnh không hợp lệ.");
  const type =
    b[0] === 255 && b[1] === 216 && b[2] === 255
      ? "image/jpeg"
      : b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
        ? "image/png"
        : b.toString("ascii", 0, 4) === "RIFF" &&
            b.toString("ascii", 8, 12) === "WEBP"
          ? "image/webp"
          : null;
  if (!type || type !== file.mimetype) fail(400, "Tệp ảnh không hợp lệ.");
  await reserveAvatarStorage(userId, b.length);
  let stored;
  try {
    stored = await uploadImageBuffer({
      buffer: b,
      originalName: "avatar",
      mimeType: type,
      uploadedBy: userId,
      extraMetadata: { purpose: "avatar" },
    });
    const avatarUrl = `/api/images/${stored.id}`;
    const updated = await User.updateOne({ _id: userId, isActive: true, isBlocked: { $ne: true }, deletedAt: null }, { avatarUrl });
    if (!updated.matchedCount) fail(403, "Tài khoản không còn hoạt động.");
    return { avatarUrl };
  } catch (error) {
    // A completed or ambiguously committed upload stays charged. Never delete an image
    // that may already be referenced by the account or CMS; reconciliation is explicit.
    if (!stored && error.imageCleanupComplete === true) {
      try {
        await User.updateOne({ _id: userId, avatarStorageBytes: { $gte: b.length }, avatarStorageCount: { $gte: 1 } }, {
          $inc: { avatarStorageBytes: -b.length, avatarStorageCount: -1 }
        });
      } catch { /* retain the conservative reservation when database cleanup is uncertain */ }
    }
    throw error;
  }
};
