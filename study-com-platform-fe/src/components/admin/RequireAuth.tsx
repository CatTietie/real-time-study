import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAppSelector } from "../../app/hooks";
import type { RootState } from "../../app/store";

interface RequireAuthProps {
  children: ReactNode;
}

export default function RequireAuth({ children }: RequireAuthProps) {
  const { token, role } = useAppSelector((state: RootState) => state.auth);

  if (!token || (role !== "admin" && role !== "super_admin")) {
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
}
