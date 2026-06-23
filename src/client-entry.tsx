import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from '@/lib/theme';
import { I18nProvider } from '@/lib/i18n';
import './styles.css';

// Simple client-side app
function App() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-foreground">NutriFit Bangla</h1>
          <p className="text-muted-foreground">AI Diet & Fitness Planner</p>
        </div>
        
        <div className="surface-card p-6 space-y-4">
          <div className="text-left space-y-2">
            <h2 className="text-xl font-semibold">Welcome! 🎉</h2>
            <p className="text-sm text-muted-foreground">
              Your personalized Bangladeshi diet, fitness & water tracking app with an AI coach.
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="surface-card p-4">
              <div className="text-2xl font-bold text-primary">100%</div>
              <div className="text-muted-foreground">Local foods</div>
            </div>
            <div className="surface-card p-4">
              <div className="text-2xl font-bold text-primary">EN/বাং</div>
              <div className="text-muted-foreground">Bilingual</div>
            </div>
          </div>
          
          <button className="w-full bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors">
            Get Started
          </button>
        </div>
        
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} NutriFit Bangla
        </p>
      </div>
    </div>
  );
}

const queryClient = new QueryClient();
const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element not found');

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <I18nProvider>
          <App />
          <Toaster richColors position="top-center" />
        </I18nProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
