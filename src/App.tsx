import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LKPDProvider } from './contexts/LKPDContext';

// Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import StudentDashboard from './pages/StudentDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import LKPDPage from './pages/LKPDPage';

const ProtectedRoute: React.FC<{ children: React.ReactNode, role?: 'student' | 'teacher' }> = ({ children, role }) => {
  const { user, profile, loading } = useAuth();

  if (loading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  if (!user) return <Navigate to="/login" />;

  if (role && profile?.role !== role) {
    return <Navigate to={profile?.role === 'teacher' ? '/teacher' : '/student'} />;
  }

  return <>{children}</>;
};

function AppRoutes() {
  const { profile } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      
      <Route path="/student" element={
        <ProtectedRoute role="student">
          <StudentDashboard />
        </ProtectedRoute>
      } />
      
      <Route path="/lkpd" element={
        <ProtectedRoute role="student">
          <LKPDProvider>
            <LKPDPage />
          </LKPDProvider>
        </ProtectedRoute>
      } />
      
      <Route path="/teacher" element={
        <ProtectedRoute role="teacher">
          <TeacherDashboard />
        </ProtectedRoute>
      } />

      <Route path="/" element={
        <Navigate to={profile?.role === 'teacher' ? '/teacher' : '/student'} />
      } />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Toaster position="top-right" />
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
