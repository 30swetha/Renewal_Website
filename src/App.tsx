import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import OverviewPage from './pages/Overview';
import ExpiryPage from './pages/Expiry';
import ApprovalsPage from './pages/Approvals';
import BusinessUnitsPage from './pages/BusinessUnits';
import RegionsPage from './pages/Regions';
import ExplorePage from './pages/Explore';
import HistoryPage from './pages/History';
import { Login } from './pages/Login';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* App Shell Protected Routes */}
        <Route element={<AppShell />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<OverviewPage />} />
          <Route path="/expiry" element={<ExpiryPage />} />
          <Route path="/approvals" element={<ApprovalsPage />} />
          <Route path="/business-units" element={<BusinessUnitsPage />} />
          <Route path="/regions" element={<RegionsPage />} />
          <Route path="/explore" element={<ExplorePage />} />
          <Route path="/history" element={<HistoryPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
