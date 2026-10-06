import {
    Outlet
} from "react-router-dom";

import Header from "../components/common/Header";
import Footer from "../components/common/Footer";
import "./MainLayout.css";
import ConcertAtmosphere from "../components/common/ConcertAtmosphere.jsx";

const MainLayout = () => {
    return (
        <div className="main-layout">
            <ConcertAtmosphere ambient />

            <Header />

            <main className="main-layout-content">
                <Outlet />
            </main>

            <Footer />
        </div>
    );
};

export default MainLayout;
