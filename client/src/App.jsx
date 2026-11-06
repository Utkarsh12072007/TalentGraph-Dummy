// Route map + role guards.
//
// Three protected areas with separate layouts:
//   /dashboard, /applications, ...  -> candidate
//   /recruiter/...                  -> recruiter (company workspace)
//   /admin/...                      -> platform administration
// Guards are a UX convenience; every API call is re-authorized server-side.

import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './lib/auth';
import { PageLoader } from './components/ui/misc';

import PublicLayout from './components/layout/PublicLayout';
import CandidateLayout from './components/layout/CandidateLayout';
import RecruiterLayout from './components/layout/RecruiterLayout';
import AdminLayout from './components/layout/AdminLayout';

import Home from './pages/public/Home';
import Jobs from './pages/public/Jobs';
import JobDetail from './pages/public/JobDetail';
import SignIn from './pages/public/SignIn';
import SignUp from './pages/public/SignUp';

import CandidateDashboard from './pages/candidate/Dashboard';
import MyApplications from './pages/candidate/MyApplications';
import CandidateProfile from './pages/candidate/Profile';
import Resumes from './pages/candidate/Resumes';
import CandidateInterviews from './pages/candidate/Interviews';
import Notifications from './pages/candidate/Notifications';
import Settings from './pages/candidate/Settings';

import RecruiterOverview from './pages/recruiter/Overview';
import CompanySetup from './pages/recruiter/CompanySetup';
import RecruiterJobs from './pages/recruiter/Jobs';
import RecruiterJobDetail from './pages/recruiter/JobDetail';
import JobForm from './pages/recruiter/JobForm';
import Applications from './pages/recruiter/Applications';
import ApplicationDetail from './pages/recruiter/ApplicationDetail';
import RecruiterInterviews from './pages/recruiter/Interviews';
import Analytics from './pages/recruiter/Analytics';
import RecruiterCompany from './pages/recruiter/Company';
import RecruiterSettings from './pages/recruiter/Settings';

import AdminOverview from './pages/admin/Overview';
import AdminUsers from './pages/admin/Users';
import AdminCompanies from './pages/admin/Companies';
import AdminAuditLogs from './pages/admin/AuditLogs';

function RequireAuth({ role, children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <PageLoader label="Checking your session…" />;
  if (!user) return <Navigate to="/signin" state={{ from: location.pathname }} replace />;
  if (role && user.role !== role) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      {/* ---------------- public ---------------- */}
      <Route element={<PublicLayout />}>
        <Route index element={<Home />} />
        <Route path="jobs" element={<Jobs />} />
        <Route path="jobs/:jobId" element={<JobDetail />} />
        <Route path="signin" element={<SignIn />} />
        <Route path="signup" element={<SignUp />} />
      </Route>

      {/* ---------------- candidate ---------------- */}
      <Route element={<RequireAuth role="CANDIDATE"><CandidateLayout /></RequireAuth>}>
        <Route path="dashboard" element={<CandidateDashboard />} />
        <Route path="discover" element={<Jobs />} />
        <Route path="applications" element={<MyApplications />} />
        <Route path="profile" element={<CandidateProfile />} />
        <Route path="resumes" element={<Resumes />} />
        <Route path="interviews" element={<CandidateInterviews />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      {/* ---------------- recruiter ---------------- */}
      <Route element={<RequireAuth role="RECRUITER"><RecruiterLayout /></RequireAuth>}>
        <Route path="recruiter" element={<RecruiterOverview />} />
        <Route path="recruiter/company-setup" element={<CompanySetup />} />
        <Route path="recruiter/jobs" element={<RecruiterJobs />} />
        <Route path="recruiter/jobs/new" element={<JobForm />} />
        <Route path="recruiter/jobs/:jobId/edit" element={<JobForm edit />} />
        <Route path="recruiter/jobs/:jobId" element={<RecruiterJobDetail />} />
        <Route path="recruiter/applications" element={<Applications />} />
        <Route path="recruiter/applications/:applicationId" element={<ApplicationDetail />} />
        <Route path="recruiter/interviews" element={<RecruiterInterviews />} />
        <Route path="recruiter/analytics" element={<Analytics />} />
        <Route path="recruiter/company" element={<RecruiterCompany />} />
        <Route path="recruiter/settings" element={<RecruiterSettings />} />
      </Route>

      {/* ---------------- platform admin ---------------- */}
      <Route element={<RequireAuth role="PLATFORM_ADMIN"><AdminLayout /></RequireAuth>}>
        <Route path="admin" element={<AdminOverview />} />
        <Route path="admin/users" element={<AdminUsers />} />
        <Route path="admin/companies" element={<AdminCompanies />} />
        <Route path="admin/audit" element={<AdminAuditLogs />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
