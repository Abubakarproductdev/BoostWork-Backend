import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import Layout from './components/layout/Layout';
import OverallPerformance from './pages/OverallPerformance';
import ProposalPerformance from './pages/ProposalPerformance';
import ProposalWriting from './pages/ProposalWriting';
import ClientLeadGeneration from './pages/ClientLeadGeneration';
import CustomizeDetails from './pages/CustomizeDetails';
import { JobProvider } from './context/JobContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import PromptSettings from './pages/PromptSettings';

function AuthenticatedApp() {
  const { isAuthenticated, isInitializing, user } = useAuth();

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-[#0a0f1c] flex items-center justify-center text-stone-400 gap-3">
        <RefreshCw className="w-5 h-5 animate-spin text-amber-400" />
        Loading your workspace...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  // Keyed by uid so switching accounts fully remounts and no state leaks between users.
  return (
    <JobProvider key={user.uid} userId={user.uid}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<OverallPerformance />} />
            <Route path="proposals" element={<ProposalPerformance />} />
            <Route path="write" element={<ProposalWriting />} />
            <Route path="leads" element={<ClientLeadGeneration />} />
            <Route path="profile" element={<CustomizeDetails />} />
            <Route path="ai-prompts" element={<PromptSettings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </JobProvider>
  );
}

function App() {
  return (
    <AuthProvider>
      <AuthenticatedApp />
    </AuthProvider>
  );
}

export default App;
