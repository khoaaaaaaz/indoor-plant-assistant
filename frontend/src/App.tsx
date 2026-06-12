// src/App.tsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { Show } from '@clerk/react';
import { AppLayout } from './components/layout/AppLayout';
import { Leaf } from 'lucide-react';
import { SignInButton } from '@clerk/react';

// Pages
import Dashboard from './pages/Dashboard';
import PlantDetail from './pages/PlantDetail';
import CareSchedule from './pages/CareSchedule';
import MyGarden from './pages/MyGarden';
import Settings from './pages/Settings';
import AdminDashboard from './pages/AdminDashboard';

function App() {
  return (
    <AppLayout>
      <Show when="signed-in">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/garden" element={<MyGarden />} />
          <Route path="/plants/:plantId" element={<PlantDetail />} />
          <Route path="/care" element={<CareSchedule />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/admin" element={<AdminDashboard />} />
          {/* Catch-all: redirect unknown routes to dashboard */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Show>

      <Show when="signed-out">
        {/* Landing page for unauthenticated users */}
        <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
          <div className="w-24 h-24 bg-accent/40 rounded-full flex items-center justify-center mb-6">
            <Leaf className="h-12 w-12 text-primary" />
          </div>
          <h1 className="font-headline text-headline-xl text-primary mb-3">
            Plant Assistant
          </h1>
          <p className="text-body-lg text-muted-foreground max-w-md mx-auto mb-8">
            Your personal AI botanist. Identify species, diagnose diseases, and never forget to water your plants again.
          </p>
          <SignInButton mode="redirect">
            <button className="bg-primary text-primary-foreground rounded-full py-3 px-8 text-label-sm font-semibold shadow-sm hover:shadow-md hover:bg-primary/90 transition-all active:scale-[0.98]">
              Get Started
            </button>
          </SignInButton>
        </div>
      </Show>
    </AppLayout>
  );
}

export default App;
