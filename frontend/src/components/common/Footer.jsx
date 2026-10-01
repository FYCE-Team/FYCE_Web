import Logo from "./Logo";
import "./Footer.css";
import { FaFacebookF, FaInstagram } from "react-icons/fa";
import { SiZalo } from "react-icons/si";
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
  {/* Facebook */}
  <a
    href="https://www.facebook.com/fyce.official"
    target="_blank"
    rel="noopener noreferrer"
    aria-label="Facebook"
    title="Facebook"
  >
    <FaFacebookF />
  </a>

  {/* Instagram */}
  <a
    href="https://www.instagram.com/fyce.official/"
    target="_blank"
    rel="noopener noreferrer"
    aria-label="Instagram"
    title="Instagram"
  >
    <FaInstagram />
  </a>

  {/* Zalo */}
  <a
    href="https://zalo.me/0325289840"
    target="_blank"
    rel="noopener noreferrer"
    aria-label="Zalo"
    title="Zalo"
  >
    <SiZalo />
  </a>
</div>
          </section>

          <section className="site-footer-column">
            <h3>Khám phá</h3>

            <a href="/#top">
              Trang chủ
            </a>

            <a href="/#concerts">
              Hòa nhạc & Sự kiện
            </a>

            <a href="/#about">
              Về chúng tôi
            </a>

            <a href="/#gallery">
              Hoạt động & Hậu trường
            </a>


          </section>

          <section className="site-footer-column site-footer-contact">
            <h3>Liên hệ</h3>

            <a href="mailto:fyce.official@gmail.com">
              <span className="footer-contact-icon">
                @
              </span>
              <span>
                fyce.official@gmail.com
              </span>
            </a>

            <a href="tel:0325289840">
              <span className="footer-contact-icon">
                ☎
              </span>
              <span>
                0325 289 840
              </span>
            </a>

            <div className="site-footer-contact-item">
              <span className="footer-contact-icon">
                ●
              </span>

              <span>
                Đà Nẵng, Việt Nam
              </span>
            </div>

            <div className="site-footer-hours">
              <strong>
                Giờ hỗ trợ
              </strong>

              <span>
                Thứ Hai – Chúa Nhật
              </span>

              <span>
                08:30 – 22:00
              </span>
            </div>
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