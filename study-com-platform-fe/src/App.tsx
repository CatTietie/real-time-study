import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import AdminLayout from "./components/admin/AdminLayout";
import RequireAuth from "./components/admin/RequireAuth";
import StudentLayout from "./components/student/StudentLayout";
import RequireStudentAuth from "./components/student/RequireStudentAuth";
import Login from "./pages/admin/Login";
import Dashboard from "./pages/admin/Dashboard";
import Users from "./pages/admin/Users";
import AuditPosts from "./pages/admin/AuditPosts";
import AuditComments from "./pages/admin/AuditComments";
import AdminLogs from "./pages/admin/AdminLogs";
import RBACRoles from "./pages/admin/RBACRoles";
import RBACPermissions from "./pages/admin/RBACPermissions";
import Admins from "./pages/admin/Admins";
import CommunityLanding from "./pages/community/CommunityLanding";
import PostsList from "./pages/community/PostsList";
import PostDetail from "./pages/community/PostDetail";
import PublishPost from "./pages/community/PublishPost";
import Leaderboard from "./pages/community/Leaderboard";
import Favorites from "./pages/community/Favorites";
import PointsCenter from "./pages/community/PointsCenter";
import MyLikes from "./pages/community/MyLikes";
import StudentDashboard from "./pages/student/Dashboard";
import CommunityPosts from "./pages/admin/community/CommunityPosts";
import CommunityComments from "./pages/admin/community/CommunityComments";
import CommunityStats from "./pages/admin/community/CommunityStats";
import Reports from "./pages/admin/Reports";
import SensitiveWords from "./pages/admin/SensitiveWords";
import PointsRules from "./pages/admin/PointsRules";
import PointsLogs from "./pages/admin/PointsLogs";
import NotFound from "./pages/shared/NotFound";
import Register from "./pages/shared/Register";
import ComingSoon from "./pages/shared/ComingSoon";
import StudentEntry from "./pages/shared/StudentEntry";
import "./App.css";
import "./styles/student.less";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/admin" replace />} />
        <Route path="/admin/login" element={<Login />} />
        <Route path="/community" element={<CommunityLanding />} />
        <Route path="/community/posts" element={<PostsList />} />
        <Route path="/community/publish" element={<PublishPost />} />
        <Route path="/community/posts/:id" element={<PostDetail />} />
        <Route path="/community/leaderboard" element={<Leaderboard />} />
        <Route path="/community/favorites" element={<Favorites />} />
        <Route path="/community/likes" element={<MyLikes />} />
        <Route path="/community/points" element={<PointsCenter />} />
        <Route path="/student/entry" element={<StudentEntry />} />
        <Route path="/register" element={<Register />} />
        <Route path="/student/coming-soon" element={<ComingSoon />} />
        
        {/* 学生端路由 */}
        <Route
          path="/student"
          element={
            <RequireStudentAuth>
              <StudentLayout />
            </RequireStudentAuth>
          }
        >
          <Route index element={<Navigate to="/student/dashboard" replace />} />
          <Route path="dashboard" element={<StudentDashboard />} />
          <Route path="study-room" element={<ComingSoon />} />
          <Route path="analytics" element={<ComingSoon />} />
          <Route path="settings" element={<ComingSoon />} />
          <Route path="profile" element={<ComingSoon />} />
        </Route>
        
        {/* 管理端路由 */}
        <Route
          path="/admin"
          element={
            <RequireAuth>
              <AdminLayout />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="users" element={<Users />} />
          <Route path="audit/posts" element={<AuditPosts />} />
          <Route path="audit/comments" element={<AuditComments />} />
          <Route path="audit/reports" element={<Reports />} />
          <Route path="reports" element={<Reports />} />
          <Route path="sensitive-words" element={<SensitiveWords />} />
          <Route path="points/rules" element={<PointsRules />} />
          <Route path="points/logs" element={<PointsLogs />} />
          <Route path="logs" element={<AdminLogs />} />
          <Route path="admins" element={<Admins />} />
          <Route path="community/posts" element={<CommunityPosts />} />
          <Route path="community/comments" element={<CommunityComments />} />
          <Route path="community/reports" element={<Reports />} />
          <Route
            path="community/sensitive-words"
            element={<SensitiveWords />}
          />
          <Route path="community/points-rules" element={<PointsRules />} />
          <Route path="community/points-logs" element={<PointsLogs />} />
          <Route path="community/stats" element={<CommunityStats />} />
          <Route path="rbac/roles" element={<RBACRoles />} />
          <Route path="rbac/permissions" element={<RBACPermissions />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;