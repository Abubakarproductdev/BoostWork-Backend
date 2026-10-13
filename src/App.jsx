import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import OverallPerformance from './pages/OverallPerformance';
import ProposalPerformance from './pages/ProposalPerformance';
import ProposalWriting from './pages/ProposalWriting';
import ClientLeadGeneration from './pages/ClientLeadGeneration';
import CustomizeDetails from './pages/CustomizeDetails';
import { JobProvider } from './context/JobContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Login from './pages/Login';
import PromptSettings from './pages/PromptSettings';
import Strategy from './pages/Strategy';
import Research from './pages/Research';
import { Logo } from './components/ui';

function SplashScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6">
      <Logo className="scale-125" />
      <div className="w-40 h-1.5 rounded-full skeleton" />
    </div>
  );
}

function AuthenticatedApp() {
  const { isAuthenticated, isInitializing, user } = useAuth();

  if (isInitializing) return <SplashScreen />;
  if (!isAuthenticated) return <Login />;

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
            <Route path="strategy" element={<Strategy />} />
            <Route path="research" element={<Research />} />
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
    <ThemeProvider>
      <AuthProvider>
        <AuthenticatedApp />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
