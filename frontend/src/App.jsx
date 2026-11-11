import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import EmployeesPage from './pages/EmployeesPage';
import OrganisationPage from './pages/OrganisationPage';

const VIEW_ORG = ['admin', 'finance', 'director', 'cfo'];

function Protected({ roles, children }) {
  const { user, booting } = useAuth();
  if (booting) return <div className="boot">OPENING THE BOOKS…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<Protected><Layout /></Protected>}>
        <Route index element={<DashboardPage />} />
        <Route path="employees" element={<Protected roles={VIEW_ORG}><EmployeesPage /></Protected>} />
        <Route path="organisation" element={<Protected roles={VIEW_ORG}><OrganisationPage /></Protected>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
