import { Outlet, Route, Routes } from "react-router-dom";
import { HomePage } from "../../pages/home";
import { SiteHeader } from "../../widgets/site-header";
import { CabinetLayout } from "../../widgets/cabinet-layout";

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
        <Route path="/" element={<HomePage />} />
      </Route>
    </Routes>
  );
}
