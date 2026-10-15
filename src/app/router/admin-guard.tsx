import { Alert } from "@mui/material";
import { Outlet } from "react-router-dom";
import { useGetSessionQuery } from "../../entities/session";

export function AdminGuard() {
  const { data, error } = useGetSessionQuery();
  if (error || data?.role !== "admin")
    return (
      <Alert severity="warning">
        Эта страница доступна только администратору.
      </Alert>
    );
  return <Outlet />;
}
