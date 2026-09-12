import Logo from "./Logo";
import "./Footer.css";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="site-footer-main">
        <div className="site-footer-grid">

          <section className="site-footer-brand">
            <Logo variant="footer" />

            <p className="site-footer-description">
              Fantasy Youth Chamber Ensemble là
              không gian kết nối những người trẻ
              yêu âm nhạc, nơi niềm đam mê được
              nuôi dưỡng và những giai điệu được
              cất lên bằng tất cả nhiệt huyết.
            </p>

            <div className="site-footer-socials">
              <a
                href="#"
                aria-label="Facebook"
              >
                f
              </a>

              <a
                href="#"
                aria-label="Instagram"
              >
                ◎
              </a>

              <a
                href="#"
                aria-label="YouTube"
              >
                ▶
              </a>
            </div>
          </section>

          <section className="site-footer-column">
            <h3>Khám phá</h3>

            <a href="/">
              Trang chủ
            </a>

            <a href="/events">
              Hòa nhạc & Sự kiện
            </a>

            <a href="/about">
              Về chúng tôi
            </a>

            <a href="/gallery">
              Hoạt động & Hậu trường
            </a>

            <a href="/booking">
              Đặt vé
            </a>
          </section>

          <section className="site-footer-column">
            <h3>Thông tin</h3>

            <a href="/events">
              Lịch biểu diễn
            </a>

            <a href="/about">
              Nghệ sĩ
            </a>

            <a href="/seating">
              Sơ đồ khán phòng
            </a>

            <a href="/policies">
              Chính sách
            </a>

            <a href="/faq">
              Câu hỏi thường gặp
            </a>
          </section>

          <section className="site-footer-column site-footer-contact">
            <h3>Liên hệ</h3>

            <a href="mailto:boxoffice@fyce.art">
              <span className="footer-contact-icon">
                @
              </span>
              <span>
                boxoffice@fyce.art
              </span>
            </a>

            <a href="tel:1900888868">
              <span className="footer-contact-icon">
                ☎
              </span>
              <span>
                1900 8888 68
              </span>
            </a>

            <div className="site-footer-contact-item">
              <span className="footer-contact-icon">
                ●
              </span>

              <span>
                Hà Nội, Việt Nam
              </span>
            </div>

            <div className="site-footer-hours">
              <strong>
                Giờ hỗ trợ
              </strong>

              <span>
                Thứ Hai – Thứ Bảy
              </span>

              <span>
                08:30 – 20:00
              </span>
            </div>
          </section>

          <section className="site-footer-newsletter">
            <h3>
              Bản tin Hòa nhạc
            </h3>

            <p>
              Nhận thông tin mới nhất về các
              buổi biểu diễn, nghệ sĩ và hoạt
              động của FYCE.
            </p>

            <form
              className="site-footer-newsletter-form"
              onSubmit={(event) => {
                event.preventDefault();
              }}
            >
              <input
                type="email"
                placeholder="Email của bạn"
                aria-label="Địa chỉ email"
              />

              <button type="submit">
                Đăng ký
              </button>
            </form>
          </section>

        </div>
      </div>

      <div className="site-footer-bottom">
        <div className="site-footer-bottom-inner">

          <p>
            © {currentYear} Fantasy Youth
            Chamber Ensemble (FYCE).
            All rights reserved.
          </p>

          <div className="site-footer-legal">
            <a href="/privacy">
              Chính sách bảo mật
            </a>

            <a href="/terms">
              Điều khoản sử dụng
            </a>
          </div>

        </div>
      </div>
    </footer>
  );
};

export default Footer;