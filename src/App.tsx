import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import RenewalsSummaryDashboard from './pages/RenewalsSummaryDashboard';
import AssistantPage from './pages/AssistantPage';
import { Login } from './pages/Login';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* App Shell Protected Routes */}
        <Route element={<AppShell />}>
          <Route path="/" element={<RenewalsSummaryDashboard />} />
          <Route path="/renewals-hub" element={<RenewalsSummaryDashboard />} />
          <Route path="/assistant" element={<AssistantPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
