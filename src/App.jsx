// src/App.jsx
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import "./App.css";

import Lants from "./components/Lants";
import Navbar from "./components/Navbar";
import Header from "./components/Header";
import Section from "./components/Section";
import Bitimg from "./components/Bitimg";
import Bitimg1 from "./components/Bitimg1";
import Plans from "./components/Plans";
import Box1 from "./components/Box1";
import Contact from "./components/Contact";
import Static from "./components/Static";
import Chat from "./components/Chat";
import Form from "./components/Form";
import Footer from "./components/Footer";
import Fqw from "./components/Fqw";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminProtectedRoute from "./components/AdminProtectedRoute";

import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import AdminDashboard from "./pages/AdminDashboard";
import DashboardLayout from "./layouts/DashboardLayout";
import DashboardHome from "./pages/dashboard/DashboardHome";
import Profile from "./pages/dashboard/Profile";
import InvestNow from "./pages/dashboard/InvestNow";
import MyPlans from "./pages/dashboard/MyPlans";
import VerifiedInvoice from "./pages/dashboard/VerifiedInvoice";
import UnpaidInvoice from "./pages/dashboard/UnpaidInvoice";
import Earnings from "./pages/dashboard/Earnings";
import Commission from "./pages/dashboard/Commission";
import Withdrawal from "./pages/dashboard/Withdrawal";
import Payment from "./pages/dashboard/Payment";

function AppRoutes() {
  const location = useLocation();
  const pathname = location.pathname;

  const minimalRoutes =
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password" ||
    pathname.startsWith("/dashboard") ||
    pathname === "/admin";

  return (
    <>
      <Lants />
      {!minimalRoutes ? <Navbar /> : null}

      <Routes>
        <Route
          path="/"
          element={
            <>
              <Header />
              <Bitimg />
              <Box1 />
              <Section />
              <Bitimg1 />
              <Plans />
              <Contact />
              <Fqw />
              <Static />
              <Chat />
              <Form />
            </>
          }
        />

        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        <Route
          path="/admin"
          element={
            <AdminProtectedRoute>
              <AdminDashboard />
            </AdminProtectedRoute>
          }
        />
        <Route
          path="/dashboard/admin"
          element={
            <AdminProtectedRoute>
              <AdminDashboard />
            </AdminProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardHome />} />
          <Route path="profile" element={<Profile />} />
          <Route path="invest-now" element={<InvestNow />} />
          <Route path="payment/:invoiceId" element={<Payment />} />
          <Route path="my-plans" element={<MyPlans />} />
          <Route path="verified-invoice" element={<VerifiedInvoice />} />
          <Route path="unpaid-invoice" element={<UnpaidInvoice />} />
          <Route path="earnings" element={<Earnings />} />
          <Route path="commission" element={<Commission />} />
          <Route path="withdrawal" element={<Withdrawal />} />
        </Route>
      </Routes>

      {!minimalRoutes ? <Footer /> : null}
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
