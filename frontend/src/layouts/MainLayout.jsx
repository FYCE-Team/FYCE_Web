import {
    Outlet
} from "react-router-dom";

import ImagePreview from "../components/media/ImagePreview.jsx";
import Header from "../components/common/Header";
import Footer from "../components/common/Footer";
import "./MainLayout.css";

const MainLayout = () => {
    return (
        <ImagePreview><div className="main-layout">
            <Header />

            <main className="main-layout-content">
                <Outlet />
            </main>

            <Footer />
        </div></ImagePreview>
    );
};

export default MainLayout;
