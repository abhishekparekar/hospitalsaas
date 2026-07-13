import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import PlatformLandingPage from './pages/PlatformLandingPage';
import DoctorLogin from './pages/DoctorLogin';
import DoctorAdminDashboard from './pages/DoctorAdminDashboard';
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

          {/* Superadmin control board */}
          <Route path="/superadmin" element={<SuperAdminDashboard />} />

          {/* Dynamic Slugs for Client Sites */}
          <Route path="/:slug" element={<DoctorPublicSite />} />
          <Route path="/:slug/blog/:blogSlug" element={<DoctorBlogDetail />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
