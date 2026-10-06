import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import RenewalsSummaryDashboard from './pages/RenewalsSummaryDashboard';
import OverviewPage from './pages/Overview';
import ExpiryPage from './pages/Expiry';
import ApprovalsPage from './pages/Approvals';
import BusinessUnitsPage from './pages/BusinessUnits';
import RegionsPage from './pages/Regions';
import DelayedRenewalsPage from './pages/DelayedRenewals';
import ExplorePage from './pages/Explore';
import Q4FY26Page from './pages/Q4FY26';
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
          <Route path="/delayed-renewals" element={<DelayedRenewalsPage />} />
          <Route path="/q4-fy26" element={<Q4FY26Page />} />
          <Route path="/renewals-hub" element={<RenewalsSummaryDashboard />} />
          <Route path="/explore" element={<ExplorePage />} />
        </Route>

        <Route path="*" element={<Navigate to="/renewals-hub" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
