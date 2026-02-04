import { Navigate } from "react-router-dom";
import { useAppSelector } from "../../app/hooks";
import type { RootState } from "../../app/store";

interface RequireStudentAuthProps {
  children: React.ReactNode;
}

export default function RequireStudentAuth({ children }: RequireStudentAuthProps) {
  const { token, role } = useAppSelector((state: RootState) => state.auth);

  // 如果没有token或者不是学生角色，则跳转到登录页
  if (!token || (role !== "student" && role !== "super_admin")) {
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
}