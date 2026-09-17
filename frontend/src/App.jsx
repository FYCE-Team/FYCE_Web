import {
    BrowserRouter,
    Routes,
    Route
} from "react-router-dom";

import {
    GoogleOAuthProvider
} from "@react-oauth/google";

import {
    AuthProvider
} from "../context/AuthContext.jsx";

import Register from "./pages/auth/Register.jsx";
import VerifyOtp from "./pages/auth/VerifyOtp.jsx";
import Login from "./pages/auth/Login.jsx";
import ForgotPassword from "./pages/auth/ForgotPassword.jsx";
import VerifyResetOtp from "./pages/auth/VerifyResetOtp.jsx";
import ResetPassword from "./pages/auth/ResetPassword.jsx";

import MainLayout from "./layouts/MainLayout.jsx";
import AdminLayout from "./layouts/AdminLayout.jsx";

import AdminRoute from "./components/auth/AdminRoute.jsx";
import ProtectedRoute from "./components/auth/ProtectedRoute.jsx";

import Home from "./pages/Home.jsx";
import EventDetail from "./pages/events/EventDetail.jsx";
import EventSeatBookingPage from "./pages/events/EventSeatBookingPage.jsx";
import CheckoutPage from "./pages/booking/CheckoutPage.jsx";
import BookingDetailsPage from "./pages/booking/BookingDetailsPage.jsx";
import AdminEventCreate from "./pages/admin/events/AdminEventCreate.jsx";
import AdminEventEdit from "./pages/admin/events/AdminEventEdit.jsx";
import AdminEvents from "./pages/admin/events/AdminEvents.jsx";

const GOOGLE_CLIENT_ID =
    import.meta.env.VITE_GOOGLE_CLIENT_ID;

function App() {
    return (
        <GoogleOAuthProvider
            clientId={GOOGLE_CLIENT_ID}
        >
            <AuthProvider>
                <BrowserRouter>
                    <Routes>

                        {/* =================================================
                            AUTH
                        ================================================== */}

                        <Route
                            path="/login"
                            element={<Login />}
                        />

                        <Route
                            path="/register"
                            element={<Register />}
                        />

                        <Route
                            path="/verify-otp"
                            element={<VerifyOtp />}
                        />

                        <Route
                            path="/forgot-password"
                            element={<ForgotPassword />}
                        />

                        <Route
                            path="/verify-reset-otp"
                            element={<VerifyResetOtp />}
                        />

                        <Route
                            path="/reset-password"
                            element={<ResetPassword />}
                        />

                        {/* =================================================
                            ADMIN
                        ================================================== */}

                        <Route
                            element={<AdminRoute />}
                        >
                            <Route
                                element={<AdminLayout />}
                            >

                                <Route
                                    path="/admin/events"
                                    element={
                                        <AdminEvents />
                                    }
                                />

                                <Route
                                    path="/admin/events/create"
                                    element={
                                        <AdminEventCreate />
                                    }
                                />

                                <Route
                                    path="/admin/events/:id/edit"
                                    element={
                                        <AdminEventEdit />
                                    }
                                />

                            </Route>
                        </Route>

                        {/* =================================================
                            PUBLIC WEBSITE
                        ================================================== */}

                        <Route
                            element={
                                <MainLayout />
                            }
                        >
                            <Route
                                path="/"
                                element={
                                    <Home />
                                }
                            />

                            <Route
                                path="/events/:slug"
                                element={
                                    <EventDetail />
                                }
                            />

                            <Route
                                element={
                                    <ProtectedRoute />
                                }
                            >
                                <Route
                                    path="/events/:slug/seats"
                                    element={
                                        <EventSeatBookingPage />
                                    }
                                />

                                <Route
                                    path="/checkout/:bookingCode"
                                    element={
                                        <CheckoutPage />
                                    }
                                />

                                <Route
                                    path="/bookings/:bookingCode"
                                    element={
                                        <BookingDetailsPage />
                                    }
                                />
                            </Route>
                        </Route>

                        {/* =================================================
                            404
                        ================================================== */}

                        <Route
                            path="*"
                            element={
                                <div>
                                    Page not found
                                </div>
                            }
                        />

                    </Routes>
                </BrowserRouter>
            </AuthProvider>
        </GoogleOAuthProvider>
    );
}

export default App;