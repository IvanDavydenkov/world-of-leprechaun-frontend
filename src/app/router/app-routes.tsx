import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { HomePage } from "../../pages/home";
import { SiteHeader } from "../../widgets/site-header";
import { CabinetLayout } from "../../widgets/cabinet-layout";
import { LoginPage } from "../../pages/login";
import { SessionGuard } from "./session-guard";
import { AdminGuard } from "./admin-guard";
import { AdminUsersPage } from "../../pages/admin-users";

function RootLayout() {
  return (
    <>
      <SiteHeader />
      <CabinetLayout>
        <Outlet />
      </CabinetLayout>
    </>
  );
}

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<RootLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<SessionGuard />}>
          <Route path="/" element={<HomePage />} />
          <Route element={<AdminGuard />}>
            <Route path="/admin/users-list" element={<AdminUsersPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
