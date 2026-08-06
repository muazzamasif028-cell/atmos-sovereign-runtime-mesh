import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import WorkflowsPage from './pages/WorkflowsPage';
import WorkflowEditorPage from './pages/WorkflowEditorPage';
import ExecutionsPage from './pages/ExecutionsPage';
import IntegrationsPage from './pages/IntegrationsPage';
import LoginPage from './pages/LoginPage';
import { AuthProvider, useAuth } from './context/AuthContext';
import NavBar from './components/NavBar';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
                  <NavBar />
                  <main style={{ flex: 1, padding: '24px' }}>
                    <Routes>
                      <Route path="/" element={<Navigate to="/workflows" replace />} />
                      <Route path="/workflows" element={<WorkflowsPage />} />
                      <Route path="/workflows/:id/edit" element={<WorkflowEditorPage />} />
                      <Route path="/executions" element={<ExecutionsPage />} />
                      <Route path="/integrations" element={<IntegrationsPage />} />
                    </Routes>
                  </main>
                </div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
