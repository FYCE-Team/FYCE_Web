import { useCallback } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
const base = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";
export const mediaUrl = (value) =>
  value?.startsWith("/") ? `${base.replace(/\/api\/?$/, "")}${value}` : value;
export function useAdminApi() {
  const { accessToken, refreshSession } = useAuth();
  return useCallback(
    async (path, { method = "GET", body, signal } = {}) => {
      const send = (token) =>
        fetch(`${base}${path}`, {
          method,
          signal,
          headers: {
            Authorization: `Bearer ${token}`,
            ...(body instanceof FormData
              ? {}
              : { "Content-Type": "application/json" }),
          },
          ...(body !== undefined
            ? { body: body instanceof FormData ? body : JSON.stringify(body) }
            : {}),
        });
      let response = await send(accessToken);
      if (response.status === 401) {
        const session = await refreshSession();
        if (!session?.accessToken)
          throw new Error("Phiên đăng nhập đã hết hạn.");
        response = await send(session.accessToken);
      }
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success)
        throw new Error(result.message || "Không thể xử lý yêu cầu.");
      return result.data;
    },
    [accessToken, refreshSession],
  );
}
export const money = (value) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    value || 0,
  );
export const dateTime = (value) =>
  value ? new Date(value).toLocaleString("vi-VN") : "—";
export const labels = {
  pending_payment: "Chờ thanh toán",
  confirmed: "Đã xác nhận",
  expired: "Hết hạn",
  cancelled: "Đã hủy",
  unpaid: "Chưa thanh toán",
  processing: "Đang xử lý",
  paid: "Đã thanh toán",
  failed: "Thất bại",
  refunded: "Đã hoàn tiền",
  valid: "Chưa check-in",
  checked_in: "Đã check-in",
};
