import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import PlatformLandingPage from './pages/PlatformLandingPage';
import DoctorLogin from './pages/DoctorLogin';
import DoctorAdminDashboard from './pages/DoctorAdminDashboard';
import PlanRenewal from './pages/PlanRenewal';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import DoctorPublicSite from './pages/DoctorPublicSite';
import DoctorBlogDetail from './pages/DoctorBlogDetail';

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Main Platform Homepage */}
          <Route path="/" element={<PlatformLandingPage />} />

          {/* Doctor Admin area routes */}
          <Route path="/admin" element={<DoctorLogin />} />
          <Route path="/admin/dashboard" element={<DoctorAdminDashboard />} />
          <Route path="/admin/renew" element={<PlanRenewal />} />

          {/* Super Admin Dashboard */}
          <Route path="/superadmin" element={<SuperAdminDashboard />} />

          {/* Dynamic Slugs for Client Sites */}
          <Route path="/:slug" element={<DoctorPublicSite />} />
          <Route path="/:slug/blog/:blogSlug" element={<DoctorBlogDetail />} />

          {/* Catch-all Fallback: redirect unmatched paths to landing page */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
