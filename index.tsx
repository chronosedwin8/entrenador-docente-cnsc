import React from 'react';
import ReactDOM from 'react-dom/client';
import { Toaster } from 'react-hot-toast';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <Toaster
      position="top-center"
      toastOptions={{
        duration: 4000,
        style: {
          background: '#1e293b',
          color: '#f1f5f9',
          fontWeight: 500,
        },
        success: {
          iconTheme: { primary: '#22c55e', secondary: '#f1f5f9' },
        },
        error: {
          iconTheme: { primary: '#ef4444', secondary: '#f1f5f9' },
        },
      }}
    />
    <App />
  </React.StrictMode>
);
