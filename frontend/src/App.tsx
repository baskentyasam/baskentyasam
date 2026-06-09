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

import AdminDashboardPage from "./pages/AdminDashboardPage";

import SubAdminPanelPage from "./pages/SubAdminPanelPage";

import AdminManagementPage from "./pages/AdminManagementPage";

import AdminUsersPage from "./pages/AdminUsersPage";

import AdminAppointmentsPage from "./pages/AdminAppointmentsPage";

import AdminCafeteriasPage from "./pages/AdminCafeteriasPage";

import AdminCafeteriaDetailPage from "./pages/AdminCafeteriaDetailPage";

import AdminParkingPage from "./pages/AdminParkingPage";

import AdminParkingDetailPage from "./pages/AdminParkingDetailPage";

import AdminLibraryPage from "./pages/AdminLibraryPage";

import AdminLibraryDetailPage from "./pages/AdminLibraryDetailPage";

import ProtectedAdminRoute from "./components/ProtectedAdminRoute";
import RequireRole from "./components/RequireRole";



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

        <Route
          path="/kasiyer/siparisler"
          element={
            <RequireRole allowedRoles={["cashier"]}>
              <CashierOrdersPage />
            </RequireRole>
          }
        />

        <Route

          path="/admin"

          element={

            <ProtectedAdminRoute requireSuperAdmin>

              <AdminDashboardPage />

            </ProtectedAdminRoute>

          }

        />

        <Route

          path="/admin/panel"

          element={

            <ProtectedAdminRoute>

              <SubAdminPanelPage />

            </ProtectedAdminRoute>

          }

        />

        <Route

          path="/admin/sub-admins"

          element={

            <ProtectedAdminRoute requireSuperAdmin>

              <AdminManagementPage />

            </ProtectedAdminRoute>

          }

        />

        <Route

          path="/admin/users"

          element={

            <ProtectedAdminRoute requireSuperAdmin>

              <AdminUsersPage />

            </ProtectedAdminRoute>

          }

        />

        <Route

          path="/admin/appointments"

          element={

            <ProtectedAdminRoute requireSuperAdmin>

              <AdminAppointmentsPage />

            </ProtectedAdminRoute>

          }

        />

        <Route

          path="/admin/cafeterias"

          element={

            <ProtectedAdminRoute requireSuperAdmin>

              <AdminCafeteriasPage />

            </ProtectedAdminRoute>

          }

        />

        <Route

          path="/admin/cafeteria/:cafeteriaId"

          element={

            <ProtectedAdminRoute scopedModule="cafeteria">

              <AdminCafeteriaDetailPage />

            </ProtectedAdminRoute>

          }

        />

        <Route

          path="/admin/parking"

          element={

            <ProtectedAdminRoute requireSuperAdmin>

              <AdminParkingPage />

            </ProtectedAdminRoute>

          }

        />

        <Route

          path="/admin/parking/:parkingLotId"

          element={

            <ProtectedAdminRoute scopedModule="parking">

              <AdminParkingDetailPage />

            </ProtectedAdminRoute>

          }

        />

        <Route
          path="/admin/library"
          element={
            <ProtectedAdminRoute scopedModule="library">
              <AdminLibraryPage />
            </ProtectedAdminRoute>
          }
        />

        <Route
          path="/admin/library/:libraryAreaId"
          element={
            <ProtectedAdminRoute requireSuperAdmin>
              <AdminLibraryDetailPage />
            </ProtectedAdminRoute>
          }
        />

        <Route path="/kutuphane" element={<LibraryOccupancyPage />} />
        <Route path="/otopark" element={<ParkingOccupancyPage />} />
        <Route path="/profil" element={<ProfilePage />} />

      </Routes>

    </Router>

  );

}



export default App;

