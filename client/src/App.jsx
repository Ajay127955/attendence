import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';
import { useAuth } from './context/AuthContext';
import { Spinner } from './components/ui';

/**
 * Route-level code splitting keeps the initial bundle small. Every page is
 * loaded on demand and rendered behind a lightweight Suspense fallback.
 */
const Login = lazy(() => import('./pages/Login'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const NotFound = lazy(() => import('./pages/NotFound'));

const Dashboard = lazy(() => import('./pages/Dashboard'));
const MarkAttendance = lazy(() => import('./pages/MarkAttendance'));
const AttendanceList = lazy(() => import('./pages/AttendanceList'));
const Students = lazy(() => import('./pages/Students'));
const Teachers = lazy(() => import('./pages/Teachers'));
const Classes = lazy(() => import('./pages/Classes'));
const Subjects = lazy(() => import('./pages/Subjects'));
const Reports = lazy(() => import('./pages/Reports'));
const Settings = lazy(() => import('./pages/Settings'));
const AuditLogs = lazy(() => import('./pages/AuditLogs'));
const Profile = lazy(() => import('./pages/Profile'));
const MyAttendance = lazy(() => import('./pages/MyAttendance'));
const History = lazy(() => import('./pages/History'));

/** Full-viewport fallback shown while a route chunk loads. */
function RouteFallback() {
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <Spinner className="h-7 w-7" />
    </div>
  );
}

/**
 * Role-aware home page. Students land on their personal attendance portal,
 * while admins and teachers see the analytics dashboard.
 */
function Home() {
  const { role } = useAuth();
  return role === 'student' ? <MyAttendance /> : <Dashboard />;
}

export default function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        {/* Public / unauthenticated routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Authenticated application shell */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            {/* Shared by every authenticated role */}
            <Route index element={<Home />} />
            <Route path="profile" element={<Profile />} />

            {/* Admin + teacher */}
            <Route element={<ProtectedRoute roles={['admin', 'teacher']} />}>
              <Route path="attendance/mark" element={<MarkAttendance />} />
              <Route path="attendance" element={<AttendanceList />} />
              <Route path="students" element={<Students />} />
              <Route path="classes" element={<Classes />} />
              <Route path="subjects" element={<Subjects />} />
              <Route path="reports" element={<Reports />} />
            </Route>

            {/* Admin only */}
            <Route element={<ProtectedRoute roles={['admin']} />}>
              <Route path="teachers" element={<Teachers />} />
              <Route path="audit-logs" element={<AuditLogs />} />
              <Route path="settings" element={<Settings />} />
            </Route>

            {/* Student only */}
            <Route element={<ProtectedRoute roles={['student']} />}>
              <Route path="my-attendance" element={<MyAttendance />} />
              <Route path="history" element={<History />} />
            </Route>

            {/* Legacy / convenience redirects */}
            <Route path="dashboard" element={<Navigate to="/" replace />} />

            {/* Unknown paths inside the shell render the styled 404 */}
            <Route path="*" element={<NotFound />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}
