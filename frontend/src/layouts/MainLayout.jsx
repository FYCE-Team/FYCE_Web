import {
    useEffect
} from "react";

import {
    Outlet,
    useLocation
} from "react-router-dom";

import Header from "../components/common/Header";
import Footer from "../components/common/Footer";
import "./MainLayout.css";

const ScrollToTop = () => {
    const { pathname } = useLocation();

    useEffect(() => {
        window.scrollTo({
            top: 0,
            left: 0,
            behavior: "instant"
        });
    }, [pathname]);

    return null;
};

const MainLayout = () => {
    return (
        <div className="main-layout">
            <ScrollToTop />

            <Header />

            <main className="main-layout-content">
                <Outlet />
            </main>

            <Footer />
        </div>
    );
};

export default MainLayout;