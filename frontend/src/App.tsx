import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import LoginPage from "./pages/LoginPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import StudentDashboard from "./pages/StudentDashboard";
import InstructorDashboard from "./pages/InstructorDashboard";
import TeacherAppointmentPage from "./pages/TeacherAppointmentPage";
import InstructorAppointmentManagementPage from "./pages/InstructorAppointmentManagementPage";
import CafeteriaOrderPage from "./pages/CafeteriaOrderPage";
import MyOrdersPage from "./pages/MyOrdersPage";
import CashierOrdersPage from "./pages/CashierOrdersPage";
import LibraryOccupancyPage from "./pages/LibraryOccupancyPage";
import ParkingOccupancyPage from "./pages/ParkingOccupancyPage";
import ProfilePage from "./pages/ProfilePage";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/sifremi-unuttum" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        <Route path="/ogrenci" element={<StudentDashboard />} />
        <Route path="/randevu" element={<TeacherAppointmentPage />} />
        <Route path="/ogretim-elemani" element={<InstructorDashboard />} />
        <Route
          path="/randevu-yonetimi"
          element={<InstructorAppointmentManagementPage />}
        />
        <Route path="/kafeterya" element={<CafeteriaOrderPage />} />
        <Route path="/siparislerim" element={<MyOrdersPage />} />
        <Route path="/kasiyer/siparisler" element={<CashierOrdersPage />} />
        <Route path="/kutuphane" element={<LibraryOccupancyPage />} />
        <Route path="/otopark" element={<ParkingOccupancyPage />} />
        <Route path="/profil" element={<ProfilePage />} />
      </Routes>
    </Router>
  );
}

export default App;
