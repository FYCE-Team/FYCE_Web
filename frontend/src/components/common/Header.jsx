import { useLanguage } from "../../i18n/useLanguage.js";
import LanguageSwitcher from "../../i18n/LanguageSwitcher.jsx";
import { mediaUrl } from "../../services/admin.service.js";
import { useState } from "react";
import {
  Menu,
  X,
  User,
  ChevronDown,
  LogOut,
  UserRound,
  LayoutDashboard
} from "lucide-react";
import {
  NavLink,
  useNavigate
} from "react-router-dom";

import Logo from "./Logo";
import { useAuth } from "../../../context/AuthContext";
import "./Header.css";

const Header = () => {
    const { t } = useLanguage();

  const [mobileMenuOpen, setMobileMenuOpen] =
    useState(false);

  const [accountMenuOpen, setAccountMenuOpen] =
    useState(false);

  const navigate = useNavigate();

  const {
    user,
    loading,
    logout
  } = useAuth();

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      setAccountMenuOpen(false);
      closeMobileMenu();
      navigate("/");
    }
  };

  const getUserInitial = () => {
    const name =
      user?.fullName ||
      user?.username ||
      user?.email ||
      "U";

    return name
      .trim()
      .charAt(0)
      .toUpperCase();
  };

  return (
    <header className="site-header">
      <div className="site-header-inner">

        <Logo />

        <nav
          className={`site-navigation ${
            mobileMenuOpen
              ? "site-navigation-open"
              : ""
          }`}
          aria-label="Main navigation"
        >
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `site-navigation-link ${
                isActive ? "active" : ""
              }`
            }
            onClick={closeMobileMenu}
          > {t("Trang chủ")} </NavLink>

          <a
              href="/#concerts"
              className="site-navigation-link"
              onClick={closeMobileMenu}
          > {t("Hòa nhạc & Sự kiện")} </a>

                  <a
            href="/#about"
            className="site-navigation-link"
            onClick={closeMobileMenu}
        > {t("Về chúng tôi")} </a>

          {t(!user && !loading && (
            <div className="site-navigation-mobile-auth">
              <button
                type="button"
                className="site-navigation-mobile-login"
                onClick={() => {
                  closeMobileMenu();
                  navigate("/login");
                }}
              > {t("Đăng nhập")} </button>

              <button
                type="button"
                className="site-navigation-mobile-register"
                onClick={() => {
                  closeMobileMenu();
                  navigate("/register");
                }}
              > {t("Đăng ký")} </button>
            </div>
          ))}

          {t(user?.role === "admin" && (
            <button
              type="button"
              className="site-navigation-mobile-admin"
              onClick={() => {
                closeMobileMenu();
                navigate("/admin");
              }}
            >
              <LayoutDashboard size={17} />
              <span>{t("Trang quản trị")}</span>
            </button>
          ))}

        </nav>

        <div className="site-header-actions">

          <LanguageSwitcher />

          {t(user?.role === "admin" && (
            <button
              type="button"
              className="site-admin-button"
              onClick={() => {
                setAccountMenuOpen(false);
                closeMobileMenu();
                navigate("/admin");
              }}
              aria-label={t("Về trang quản trị")}
            >
              <LayoutDashboard size={16} />
              <span>{t("Quản trị")}</span>
            </button>
          ))}

          {t(loading ? <span role="status">{t("Đang khôi phục phiên…")}</span> : !user ? (
            <div className="site-auth-actions">
              <button
                type="button"
                className="site-login-button"
                onClick={() => {
                  closeMobileMenu();
                  navigate("/login");
                }}
              > {t("Đăng nhập")} </button>

              <button
                type="button"
                className="site-register-button"
                onClick={() => {
                  closeMobileMenu();
                  navigate("/register");
                }}
              > {t("Đăng ký")} </button>
            </div>
          ) : (
            <div className="site-account-wrapper">
              <button
                type="button"
                className={`site-account-button ${
                  accountMenuOpen
                    ? "is-open"
                    : ""
                }`}
                onClick={() =>
                  setAccountMenuOpen(
                    (value) => !value
                  )
                }
                aria-label={t("Tài khoản")}
                aria-expanded={
                  accountMenuOpen
                }
              >
                <span className="site-account-avatar">
                  {t(user.avatarUrl ? (
                    <img
                      src={mediaUrl(user.avatarUrl)}
                      alt={
                        t(user.fullName ||
                        user.username ||
                        "Tài khoản")
                      }
                    />
                  ) : (
                    <span>
                      {t(getUserInitial())}
                    </span>
                  ))}
                </span>

                <span className="site-account-name">
                  {t(user.fullName ||
                    user.username ||
                    "Tài khoản")}
                </span>

                <ChevronDown
                  size={14}
                  className="site-account-chevron"
                />
              </button>

              {t(accountMenuOpen && (
                <div className="site-account-dropdown">
                  {t(user?.role === "admin" && (
                    <>
                      <button
                        type="button"
                        className="site-account-admin"
                        onClick={() => {
                          setAccountMenuOpen(false);
                          closeMobileMenu();
                          navigate("/admin");
                        }}
                      >
                        <LayoutDashboard size={16} />
                        <span>{t("Trang quản trị")}</span>
                      </button>

                      <div className="site-account-divider" />
                    </>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setAccountMenuOpen(
                        false
                      );
                      navigate(
                        "/profile"
                      );
                    }}
                  >
                    <UserRound size={16} />
                    <span> {t("Hồ sơ của tôi")} </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAccountMenuOpen(
                        false
                      );
                      navigate(
                        "/my-tickets"
                      );
                    }}
                  >
                    <User size={16} />
                    <span> {t("Vé của tôi")} </span>
                  </button>

                  <div className="site-account-divider" />

                  <button
                    type="button"
                    className="site-account-logout"
                    onClick={handleLogout}
                  >
                    <LogOut size={16} />
                    <span> {t("Đăng xuất")} </span>
                  </button>
                </div>
              ))}
            </div>
          ))}

          <button
            type="button"
            className="site-mobile-menu-button"
            onClick={() =>
              setMobileMenuOpen(
                (value) => !value
              )
            }
            aria-label={
              t(mobileMenuOpen
                ? "Đóng menu"
                : "Mở menu")
            }
            aria-expanded={mobileMenuOpen}
          >
            {t(mobileMenuOpen ? (
              <X size={22} />
            ) : (
              <Menu size={22} />
            ))}
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
