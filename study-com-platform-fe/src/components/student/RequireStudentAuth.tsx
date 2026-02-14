import { Navigate } from "react-router-dom";
import { useAppSelector } from "../../app/hooks";
import type { RootState } from "../../app/store";

interface RequireStudentAuthProps {
  children: React.ReactNode;
}

export default function RequireStudentAuth({ children }: RequireStudentAuthProps) {
  console.log('=== RequireStudentAuth 组件执行 ===');
  const { token, role } = useAppSelector((state: RootState) => state.auth);
  console.log('认证状态:', { token, role });

  // 如果没有token或者不是学生角色，则跳转到登录页
  if (!token || (role !== "student" && role !== "super_admin")) {
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
}