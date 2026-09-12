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
  const [mobileMenuOpen, setMobileMenuOpen] =
    useState(false);

  const [accountMenuOpen, setAccountMenuOpen] =
    useState(false);

  const navigate = useNavigate();

  const {
    user,
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
          >
            Trang chủ
          </NavLink>

          <a
              href="/#concerts"
              className="site-navigation-link"
              onClick={closeMobileMenu}
          >
              Hòa nhạc & Sự kiện
          </a>

                  <a
            href="/#about"
            className="site-navigation-link"
            onClick={closeMobileMenu}
        >
            Về chúng tôi
        </a>

          {!user && (
            <div className="site-navigation-mobile-auth">
              <button
                type="button"
                className="site-navigation-mobile-login"
                onClick={() => {
                  closeMobileMenu();
                  navigate("/login");
                }}
              >
                Đăng nhập
              </button>

              <button
                type="button"
                className="site-navigation-mobile-register"
                onClick={() => {
                  closeMobileMenu();
                  navigate("/register");
                }}
              >
                Đăng ký
              </button>
            </div>
          )}

          {user?.role === "admin" && (
            <button
              type="button"
              className="site-navigation-mobile-admin"
              onClick={() => {
                closeMobileMenu();
                navigate("/admin/events");
              }}
            >
              <LayoutDashboard size={17} />
              <span>Trang quản trị</span>
            </button>
          )}

        </nav>

        <div className="site-header-actions">

          <div
            className="site-language-switcher"
            aria-label="Ngôn ngữ"
          >
            <button
              type="button"
              className="site-language-option active"
            >
              VN
            </button>

            <button
              type="button"
              className="site-language-option"
            >
              EN
            </button>
          </div>

          {user?.role === "admin" && (
            <button
              type="button"
              className="site-admin-button"
              onClick={() => {
                setAccountMenuOpen(false);
                closeMobileMenu();
                navigate("/admin/events");
              }}
              aria-label="Về trang quản trị"
            >
              <LayoutDashboard size={16} />
              <span>Quản trị</span>
            </button>
          )}

          {!user ? (
            <div className="site-auth-actions">
              <button
                type="button"
                className="site-login-button"
                onClick={() => {
                  closeMobileMenu();
                  navigate("/login");
                }}
              >
                Đăng nhập
              </button>

              <button
                type="button"
                className="site-register-button"
                onClick={() => {
                  closeMobileMenu();
                  navigate("/register");
                }}
              >
                Đăng ký
              </button>
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
                aria-label="Tài khoản"
                aria-expanded={
                  accountMenuOpen
                }
              >
                <span className="site-account-avatar">
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={
                        user.fullName ||
                        user.username ||
                        "Tài khoản"
                      }
                    />
                  ) : (
                    <span>
                      {getUserInitial()}
                    </span>
                  )}
                </span>

                <span className="site-account-name">
                  {user.fullName ||
                    user.username ||
                    "Tài khoản"}
                </span>

                <ChevronDown
                  size={14}
                  className="site-account-chevron"
                />
              </button>

              {accountMenuOpen && (
                <div className="site-account-dropdown">
                  {user?.role === "admin" && (
                    <>
                      <button
                        type="button"
                        className="site-account-admin"
                        onClick={() => {
                          setAccountMenuOpen(false);
                          closeMobileMenu();
                          navigate("/admin/events");
                        }}
                      >
                        <LayoutDashboard size={16} />
                        <span>Trang quản trị</span>
                      </button>

                      <div className="site-account-divider" />
                    </>
                  )}
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
                    <span>
                      Hồ sơ của tôi
                    </span>
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
                    <span>
                      Vé của tôi
                    </span>
                  </button>

                  <div className="site-account-divider" />

                  <button
                    type="button"
                    className="site-account-logout"
                    onClick={handleLogout}
                  >
                    <LogOut size={16} />
                    <span>
                      Đăng xuất
                    </span>
                  </button>
                </div>
              )}
            </div>
          )}

          <button
            type="button"
            className="site-mobile-menu-button"
            onClick={() =>
              setMobileMenuOpen(
                (value) => !value
              )
            }
            aria-label={
              mobileMenuOpen
                ? "Đóng menu"
                : "Mở menu"
            }
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? (
              <X size={22} />
            ) : (
              <Menu size={22} />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;