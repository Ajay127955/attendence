import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { SocketProvider } from './context/SocketContext.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import './index.css';

// Vite sets BASE_URL to the configured `base` (e.g. "/attendence/").
// React Router wants a basename without a trailing slash.
const basename = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '') || '/';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <BrowserRouter basename={basename}>
          <AuthProvider>
            <SocketProvider>
              <App />
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 3500,
                  className:
                    '!rounded-xl !border !border-ink-200 !bg-white !text-ink-900 !text-sm !shadow-pop dark:!border-ink-700 dark:!bg-ink-900 dark:!text-ink-100',
                }}
              />
            </SocketProvider>
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
