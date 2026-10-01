import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext.jsx";
import { useAdminApi, mediaUrl } from "../../services/admin.service.js";
import "./ProfilePage.css";
export default function ProfilePage() {
  const { user, updateProfile, refreshSession, logout } = useAuth();
  const api = useAdminApi(),
    navigate = useNavigate();
  const [fullName, setFullName] = useState(user?.fullName || ""),
    [phone, setPhone] = useState(user?.phone || ""),
    [avatar, setAvatar] = useState(user?.avatarUrl || ""),
    [password, setPassword] = useState(""),
    [repeat, setRepeat] = useState(""),
    [otp, setOtp] = useState(""),
    [sent, setSent] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  const run = async (action) => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await action();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const upload = (file) => {
    if (!file) return;
    run(async () => {
      const body = new FormData();
      body.append("image", file);
      const data = await api("/auth/me/avatar", { method: "POST", body });
      setAvatar(data.avatarUrl);
      await refreshSession();
      setMessage("Đã cập nhật ảnh đại diện.");
    });
  };
  return (
    <div className="profile-page">
      <aside className="profile-summary">
        <span className="profile-eyebrow">TÀI KHOẢN FYCE</span>
        <div className="profile-avatar">
          {avatar ? (
            <img src={mediaUrl(avatar)} alt="Ảnh đại diện" />
          ) : (
            <span>{(user?.fullName || "F").slice(0, 1).toUpperCase()}</span>
          )}
        </div>
        <h1>{user?.fullName}</h1>
        <p>{user?.email}</p>
        <label className="profile-upload">
          Thay ảnh đại diện
          <input
            aria-label="Chọn ảnh đại diện"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={busy}
            onChange={(e) => {
              upload(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </label>
        <small>JPG, PNG hoặc WebP · tối đa 5MB</small>
      </aside>
      <div className="profile-panels">
        {error && (
          <p className="profile-feedback profile-error" role="alert">
            {error}
          </p>
        )}
        {message && (
          <p className="profile-feedback" role="status">
            {message}
          </p>
        )}
        <section className="profile-panel">
          <h2>Thông tin cá nhân</h2>
          <p>Cập nhật thông tin để FYCE có thể liên hệ với bạn.</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              run(async () => {
                await updateProfile({ fullName, phone });
                setMessage("Đã lưu thông tin cá nhân.");
              });
            }}
          >
            <fieldset disabled={busy}>
              <label>
                Họ và tên
                <input
                  required
                  maxLength={150}
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </label>
              <label>
                Số điện thoại
                <input
                  type="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  maxLength={30}
                />
              </label>
              <label>
                Email
                <input type="email" value={user?.email || ""} readOnly />
              </label>
              <button type="submit">Lưu thông tin</button>
            </fieldset>
          </form>
        </section>
        <section className="profile-panel">
          <h2>Mật khẩu & bảo mật</h2>
          <p>
            Mã xác minh được gửi đến email tài khoản. Sau khi đổi mật khẩu, bạn
            cần đăng nhập lại trên các thiết bị.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (password !== repeat) {
                setError("Hai mật khẩu chưa khớp.");
                return;
              }
              run(async () => {
                await api("/auth/me/password", {
                  method: "POST",
                  body: { otp, password },
                });
                await logout();
                navigate("/login", { replace: true });
              });
            }}
          >
            <fieldset disabled={busy}>
              <button
                type="button"
                className="profile-secondary"
                onClick={() =>
                  run(async () => {
                    const data = await api("/auth/me/password-otp", {
                      method: "POST",
                    });
                    setSent(true);
                    setMessage(data.message);
                  })
                }
              >
                {sent ? "Gửi lại mã xác minh" : "Gửi mã xác minh qua email"}
              </button>
              <label>
                Mã xác minh
                <input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                />
              </label>
              <label>
                Mật khẩu mới
                <input
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
              <small>
                Ít nhất 8 ký tự, gồm chữ hoa, chữ thường và số; tối đa 72 byte.
              </small>
              <label>
                Nhập lại mật khẩu
                <input
                  type="password"
                  autoComplete="new-password"
                  required
                  value={repeat}
                  onChange={(e) => setRepeat(e.target.value)}
                />
              </label>
              <button type="submit" disabled={!sent}>
                Đổi mật khẩu
              </button>
            </fieldset>
          </form>
        </section>
      </div>
    </div>
  );
}
