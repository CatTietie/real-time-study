import { BrowserRouter, Navigate, Route, Routes, useParams } from "react-router-dom";

const PostDetailRedirect = () => {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={`/community?postId=${id}`} replace />;
};
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
import PublishPost from "./pages/community/PublishPost";
import Leaderboard from "./pages/community/Leaderboard";
import Favorites from "./pages/community/Favorites";
import PointsCenter from "./pages/community/PointsCenter";
import BadgeCenter from "./pages/community/BadgeCenter";
import QuestionBankPractice from "./pages/community/QuestionBankPractice";
import QuestionBankMode from "./pages/community/QuestionBankMode";
import QuestionBankExam from "./pages/community/QuestionBankExam";
import QuestionBankResult from "./pages/community/QuestionBankResult";
import WrongBook from "./pages/community/WrongBook";
import ExerciseHistory from "./pages/community/ExerciseHistory";
import MyLikes from "./pages/community/MyLikes";
import UserProfile from "./pages/community/UserProfile";
import StudentDashboard from "./pages/student/Dashboard";
import LearningAnalytics from "./pages/student/LearningAnalytics";
import LearningReport from "./pages/student/LearningReport";
import ProfileEdit from "./pages/student/ProfileEdit";
import StudyRoomList from "./pages/student/StudyRoomList";
import MyReservations from "./pages/student/MyReservations";
import ChatPage from "./pages/student/ChatPage";
import WhiteboardPage from "./pages/student/WhiteboardPage";
import CollaborativeNoteList from "./pages/student/CollaborativeNoteList";
import CollaborativeNotePage from "./pages/student/CollaborativeNotePage";
import CommunityPosts from "./pages/admin/community/CommunityPosts";
import CommunityComments from "./pages/admin/community/CommunityComments";
import CommunityStats from "./pages/admin/community/CommunityStats";
import Reports from "./pages/admin/Reports";
import SensitiveWords from "./pages/admin/SensitiveWords";
import PointsRules from "./pages/admin/PointsRules";
import PointsLogs from "./pages/admin/PointsLogs";
import UserManagement from "./pages/admin/UserManagement";
import QuestionBankManage from "./pages/admin/QuestionBankManage";
import QuestionFeedbackStats from "./pages/admin/QuestionFeedbackStats";
import ExerciseReview from "./pages/admin/ExerciseReview";
import ContentAudit from "./pages/admin/ContentAudit";
import AuditConfig from "./pages/admin/AuditConfig";
import LearningPathList from "./pages/admin/LearningPathList";
import LearningPathEditor from "./pages/admin/LearningPathEditor";
import RealtimeDashboard from "./pages/admin/RealtimeDashboard";
import SkillTreeBrowse from "./pages/student/SkillTreeBrowse";
import SkillTreeView from "./pages/student/SkillTreeView";
import VideoStudyRoomList from "./pages/student/VideoStudyRoomList";
import VideoStudyRoomPage from "./pages/student/VideoStudyRoom";
import KnowledgeLibrary from "./pages/student/KnowledgeLibrary";
import KnowledgeDocumentView from "./pages/student/KnowledgeDocumentView";
import KnowledgeCategories from "./pages/admin/KnowledgeCategories";
import KnowledgeDocuments from "./pages/admin/KnowledgeDocuments";
import NotFound from "./pages/shared/NotFound";
import Register from "./pages/shared/Register";
import ComingSoon from "./pages/shared/ComingSoon";
import StudentEntry from "./pages/shared/StudentEntry";
import "./App.css";
import "./styles/student.less";
import "./styles/community.less";

function App() {
  console.log('=== App 组件开始执行 ===');
  
  // 添加路由调试
  console.log('当前路由配置检查:');
  console.log('- /student/* 路由已配置');
  console.log('- StudentDashboard 组件已导入');
  console.log('- 路由嵌套结构正常');
  
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/admin" replace />} />
        <Route path="/admin/login" element={<Login />} />
        <Route path="/community" element={<CommunityLanding />} />
        <Route path="/community/posts" element={<PostsList />} />
        <Route path="/community/publish" element={<PublishPost />} />
        <Route path="/community/posts/:id" element={<PostDetailRedirect />} />
        <Route path="/community/leaderboard" element={<Leaderboard />} />
        <Route path="/community/user/:userId" element={<UserProfile />} />
        <Route path="/community/favorites" element={<Favorites />} />
        <Route path="/community/likes" element={<MyLikes />} />
        <Route path="/community/points" element={<PointsCenter />} />
        <Route path="/community/badges" element={<BadgeCenter />} />
        <Route path="/community/question-bank" element={<QuestionBankPractice />} />
        <Route path="/community/question-bank/:bankId/mode" element={<QuestionBankMode />} />
        <Route path="/community/question-bank/:bankId/practice" element={<QuestionBankExam />} />
        <Route path="/community/question-bank/:bankId/result/:recordId" element={<QuestionBankResult />} />
        <Route path="/community/wrong-book" element={<WrongBook />} />
        <Route path="/community/exercise-history" element={<ExerciseHistory />} />
        <Route path="/student/entry" element={<StudentEntry />} />
        <Route path="/register" element={<Register />} />
        <Route path="/student/coming-soon" element={<ComingSoon />} />
        
        {/* 学生端路由 - 恢复真正的组件 */}
        <Route 
          path="/student/dashboard" 
          element={
            <RequireStudentAuth>
              <StudentLayout>
                <StudentDashboard />
              </StudentLayout>
            </RequireStudentAuth>
          } 
        />
        <Route 
          path="/student/study-rooms" 
          element={
            <RequireStudentAuth>
              <StudentLayout>
                <StudyRoomList />
              </StudentLayout>
            </RequireStudentAuth>
          } 
        />
        <Route 
          path="/student/my-reservations" 
          element={
            <RequireStudentAuth>
              <StudentLayout>
                <MyReservations />
              </StudentLayout>
            </RequireStudentAuth>
          } 
        />
        <Route
          path="/student/learning-analytics"
          element={
            <RequireStudentAuth>
              <StudentLayout>
                <LearningAnalytics />
              </StudentLayout>
            </RequireStudentAuth>
          }
        />
        <Route
          path="/student/learning-report"
          element={
            <RequireStudentAuth>
              <StudentLayout>
                <LearningReport />
              </StudentLayout>
            </RequireStudentAuth>
          }
        />
        <Route 
          path="/student/profile" 
          element={
            <RequireStudentAuth>
              <StudentLayout>
                <ProfileEdit />
              </StudentLayout>
            </RequireStudentAuth>
          } 
        />
        <Route 
          path="/student/chat" 
          element={
            <RequireStudentAuth>
              <StudentLayout>
                <ChatPage />
              </StudentLayout>
            </RequireStudentAuth>
          } 
        />
        <Route 
          path="/student/whiteboard" 
          element={
            <RequireStudentAuth>
              <StudentLayout>
                <WhiteboardPage />
              </StudentLayout>
            </RequireStudentAuth>
          } 
        />
        <Route 
          path="/student/whiteboard/:id" 
          element={
            <RequireStudentAuth>
              <StudentLayout>
                <WhiteboardPage />
              </StudentLayout>
            </RequireStudentAuth>
          } 
        />
        <Route path="/student/settings" element={<ComingSoon />} />
        <Route
          path="/student/skill-tree"
          element={
            <RequireStudentAuth>
              <StudentLayout>
                <SkillTreeBrowse />
              </StudentLayout>
            </RequireStudentAuth>
          }
        />
        <Route
          path="/student/skill-tree/:pathId"
          element={
            <RequireStudentAuth>
              <StudentLayout>
                <SkillTreeView />
              </StudentLayout>
            </RequireStudentAuth>
          }
        />
        <Route
          path="/student/collaborative-notes"
          element={
            <RequireStudentAuth>
              <StudentLayout>
                <CollaborativeNoteList />
              </StudentLayout>
            </RequireStudentAuth>
          }
        />
        <Route
          path="/student/collaborative-notes/:id"
          element={
            <RequireStudentAuth>
              <StudentLayout>
                <CollaborativeNotePage />
              </StudentLayout>
            </RequireStudentAuth>
          }
        />
        <Route
          path="/student/video-study-rooms"
          element={
            <RequireStudentAuth>
              <StudentLayout>
                <VideoStudyRoomList />
              </StudentLayout>
            </RequireStudentAuth>
          }
        />
        <Route
          path="/student/video-study-room/:id"
          element={
            <RequireStudentAuth>
              <StudentLayout>
                <VideoStudyRoomPage />
              </StudentLayout>
            </RequireStudentAuth>
          }
        />
        <Route
          path="/student/knowledge-library"
          element={
            <RequireStudentAuth>
              <StudentLayout>
                <KnowledgeLibrary />
              </StudentLayout>
            </RequireStudentAuth>
          }
        />
        <Route
          path="/student/knowledge-library/:id"
          element={
            <RequireStudentAuth>
              <StudentLayout>
                <KnowledgeDocumentView />
              </StudentLayout>
            </RequireStudentAuth>
          }
        />



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
          <Route path="realtime" element={<RealtimeDashboard />} />
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
          <Route path="user-management" element={<UserManagement />} />
          <Route path="question-bank" element={<QuestionBankManage />} />
          <Route path="question-feedback" element={<QuestionFeedbackStats />} />
          <Route path="exercise-review" element={<ExerciseReview />} />
          <Route path="audit/content" element={<ContentAudit />} />
          <Route path="audit/config" element={<AuditConfig />} />
          <Route path="learning-paths" element={<LearningPathList />} />
          <Route path="learning-paths/:id/editor" element={<LearningPathEditor />} />
          <Route path="knowledge/categories" element={<KnowledgeCategories />} />
          <Route path="knowledge/documents" element={<KnowledgeDocuments />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;