import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/store/auth";

export const ProtectedRoute = () => {
  const auth = useAuth();
  const location = useLocation();

  if (!auth.isReady) {
    return null;
  }

  if (!auth.token || !auth.user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
};
