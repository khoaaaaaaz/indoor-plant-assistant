// src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ClerkProvider } from '@clerk/react'
import { Toaster } from '@/components/ui/sonner'
import './i18n';
import { ErrorBoundary } from '@/components/ErrorBoundary'
import App from './App'
import './index.css'
import { ThemeProvider } from 'next-themes'

const CLERK_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ThemeProvider attribute="class" defaultTheme="light" storageKey="flora-theme">
        <ClerkProvider publishableKey={CLERK_KEY}>
          <BrowserRouter>
            <App />
            <Toaster position="bottom-right" richColors />
          </BrowserRouter>
        </ClerkProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
