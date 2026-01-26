import React, { useState, useEffect } from 'react';
import { WhatsAppButton } from './WhatsAppButton';
import { InfoBar } from './InfoBar';
import { settingsService, InfoBarConfig } from '../services/settingsService';

interface LayoutProps {
  children: React.ReactNode;
  showNav?: boolean;
  activeTab?: string;
  onNavigate?: (tab: 'simulacros' | 'normativa' | 'estadisticas' | 'admin' | 'planes' | 'matematicas' | 'ai-coach' | 'ayuda' | 'entrevista') => void;
  onLogout?: () => void;
  userName?: string;
  isAdmin?: boolean;
  isPremium?: boolean;
  usageStats?: {
    dailyUsed: number;
    dailyLimit: number;
    monthlyUsed: number;
    monthlyLimit: number;
    questionLimit: number;
  };
  expirationDate?: string;
}

export const Layout: React.FC<LayoutProps> = ({ children, showNav = true, activeTab, onNavigate, onLogout, userName, isAdmin, isPremium, usageStats, expirationDate }) => {
  const [showLimits, setShowLimits] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [infoBarConfig, setInfoBarConfig] = useState<InfoBarConfig | null>(null);

  useEffect(() => {
    settingsService.getInfoBarConfig().then(setInfoBarConfig);
  }, []);

  const handleNavigate = (tab: 'simulacros' | 'normativa' | 'estadisticas' | 'admin' | 'planes' | 'matematicas' | 'ai-coach' | 'ayuda' | 'entrevista') => {
    onNavigate?.(tab);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="flex flex-col min-h-screen bg-background-light font-display">
      {infoBarConfig?.enabled && infoBarConfig.message && (
        <InfoBar message={infoBarConfig.message} />
      )}
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-border-light bg-surface px-6 py-3 lg:px-10 shadow-sm">
        <div className="flex items-center gap-4 cursor-pointer" onClick={() => handleNavigate('simulacros')}>
          <div className="flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-3xl">school</span>
          </div>
          <h2 className="text-[#0d141c] text-lg font-bold tracking-tight">
            Entrenador Docente <span className="text-primary text-xs ml-1 uppercase border border-primary px-1 rounded">CNSC Beta</span>
          </h2>
        </div>
        {showNav && (
          <div className="flex items-center gap-4">
            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="flex md:hidden size-10 rounded-lg bg-slate-100 items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors"
              aria-label="Abrir menú"
            >
              <span className="material-symbols-outlined text-2xl">
                {isMobileMenuOpen ? 'close' : 'menu'}
              </span>
            </button>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-1 text-sm font-medium text-slate-600 bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => handleNavigate('simulacros')}
                className={`px-4 py-2 rounded-md transition-all ${activeTab === 'simulacros' ? 'bg-white text-primary shadow-sm font-bold' : 'hover:text-primary hover:bg-slate-200/50'}`}
              >
                Simulacros
              </button>
              <button
                onClick={() => handleNavigate('normativa')}
                className={`px-4 py-2 rounded-md transition-all ${activeTab === 'normativa' ? 'bg-white text-primary shadow-sm font-bold' : 'hover:text-primary hover:bg-slate-200/50'}`}
              >
                Normativa
              </button>
              <button
                onClick={() => handleNavigate('estadisticas')}
                className={`px-4 py-2 rounded-md transition-all ${activeTab === 'estadisticas' ? 'bg-white text-primary shadow-sm font-bold' : 'hover:text-primary hover:bg-slate-200/50'}`}
              >
                Estadísticas
              </button>

              <button
                onClick={() => handleNavigate('matematicas')}
                className={`px-4 py-2 rounded-md transition-all ${activeTab === 'matematicas' ? 'bg-white text-primary shadow-sm font-bold' : 'hover:text-primary hover:bg-slate-200/50'}`}
              >
                Matemáticas
              </button>

              <button
                onClick={() => handleNavigate('ai-coach')}
                className={`px-4 py-2 rounded-md transition-all flex items-center gap-2 ${activeTab === 'ai-coach' ? 'bg-indigo-600 text-white font-bold shadow-md' : 'text-indigo-600 hover:bg-indigo-50 font-bold'}`}
              >
                <span className="material-symbols-outlined text-lg">psychology</span>
                Coach IA
              </button>

              <button
                onClick={() => handleNavigate('ayuda')}
                className={`px-4 py-2 rounded-md transition-all ${activeTab === 'ayuda' ? 'bg-white text-primary shadow-sm font-bold' : 'hover:text-primary hover:bg-slate-200/50'}`}
              >
                Ayuda
              </button>

              <div className="w-px h-6 bg-slate-300 mx-1"></div>

              <button
                onClick={() => handleNavigate('planes')}
                className={`px-4 py-2 rounded-md transition-all flex items-center gap-2 ${activeTab === 'planes' ? 'bg-amber-100 text-amber-700 font-bold' : 'text-amber-600 hover:bg-amber-50 font-bold'}`}
              >
                <span className="material-symbols-outlined text-lg">workspace_premium</span>
                Planes
              </button>
              {isAdmin && (
                <button
                  onClick={() => handleNavigate('admin')}
                  className={`px-4 py-2 rounded-md transition-all flex items-center gap-1 ${activeTab === 'admin' ? 'bg-purple-100 text-purple-700 font-bold' : 'text-purple-600 hover:bg-purple-50'}`}
                >
                  <span className="material-symbols-outlined text-sm">admin_panel_settings</span>
                  Admin
                </button>
              )}

              {/* Interview Button - Visible to all, locked for free */}
              <button
                onClick={() => handleNavigate('entrevista')}
                className={`px-4 py-2 rounded-md transition-all flex items-center gap-1 ${activeTab === 'entrevista' ? 'bg-indigo-600 text-white font-bold shadow-md transform scale-105' : 'text-indigo-600 hover:bg-indigo-50 font-medium'}`}
                title="Simulacro de Entrevista AI"
              >
                <span className="material-symbols-outlined text-lg">mic</span>
                Entrevista
                {!isPremium && (
                  <span className="material-symbols-outlined text-xs text-amber-500">lock</span>
                )}
              </button>
            </div>

            {userName && (
              <div className="hidden lg:flex items-center gap-2">
                {/* Usage Limits Icon */}
                {usageStats && (
                  <div className="relative">
                    <button
                      onClick={() => setShowLimits(!showLimits)}
                      className={`size-8 rounded-full flex items-center justify-center transition-colors ${(usageStats.dailyUsed >= usageStats.dailyLimit || usageStats.monthlyUsed >= usageStats.monthlyLimit)
                        ? 'bg-red-100 text-red-600 animate-pulse'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                      title="Ver Límites de Uso"
                    >
                      <span className="material-symbols-outlined text-lg">data_usage</span>
                    </button>

                    {showLimits && (
                      <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 p-4 z-50 animate-fade-in-up">
                        <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">Tu Plan Actual</h4>
                        {expirationDate && (
                          <div className="mb-3 pb-3 border-b border-slate-100">
                            <span className="text-xs text-slate-500 block mb-1">Vence el:</span>
                            <span className="text-xs font-bold text-[#0d141c] bg-slate-100 px-2 py-1 rounded">
                              {new Date(expirationDate).toLocaleDateString()}
                            </span>
                          </div>
                        )}

                        <div className="space-y-3">
                          {/* Daily */}
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-slate-600">Simulacros Hoy</span>
                              <span className={`font-bold ${usageStats.dailyUsed >= usageStats.dailyLimit ? 'text-red-500' : 'text-slate-700'}`}>
                                {usageStats.dailyUsed} / {usageStats.dailyLimit}
                              </span>
                            </div>
                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${usageStats.dailyUsed >= usageStats.dailyLimit ? 'bg-red-500' : 'bg-primary'}`}
                                style={{ width: `${Math.min((usageStats.dailyUsed / usageStats.dailyLimit) * 100, 100)}%` }}
                              />
                            </div>
                          </div>

                          {/* Monthly */}
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-slate-600">Simulacros Mes</span>
                              <span className={`font-bold ${usageStats.monthlyUsed >= usageStats.monthlyLimit ? 'text-red-500' : 'text-slate-700'}`}>
                                {usageStats.monthlyUsed} / {usageStats.monthlyLimit}
                              </span>
                            </div>
                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${usageStats.monthlyUsed >= usageStats.monthlyLimit ? 'bg-red-500' : 'bg-primary'}`}
                                style={{ width: `${Math.min((usageStats.monthlyUsed / usageStats.monthlyLimit) * 100, 100)}%` }}
                              />
                            </div>
                          </div>

                          {/* Questions */}
                          <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
                            <span className="text-xs text-slate-500">Preguntas Máx/Simulacro</span>
                            <span className="text-sm font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                              {usageStats.questionLimit}
                            </span>
                          </div>

                          {(usageStats.dailyUsed >= usageStats.dailyLimit || usageStats.monthlyUsed >= usageStats.monthlyLimit) && (
                            <div className="pt-2 text-xs text-red-500 font-medium text-center">
                              ¡Has alcanzado tus límites!
                            </div>
                          )}
                        </div>

                        {/* Close Overlay for mobile/clicking outside roughly */}
                        <div className="fixed inset-0 z-[-1]" onClick={() => setShowLimits(false)} />
                      </div>
                    )}
                  </div>
                )}

                <div className="bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 flex items-center gap-2">
                  <div className="size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                    {userName.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium text-slate-700 max-w-[150px] truncate">
                    {userName}
                  </span>
                </div>
              </div>
            )}

            <button
              onClick={onLogout}
              className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-red-50 text-slate-500 hover:text-red-500 transition-colors"
              title="Cerrar Sesión"
            >
              <div className="size-9 bg-slate-200 rounded-full flex items-center justify-center text-inherit">
                <span className="material-symbols-outlined text-xl">logout</span>
              </div>
            </button>
          </div>
        )}
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Slide-out Panel */}
          <div className="absolute top-0 right-0 h-full w-72 bg-white shadow-2xl animate-slide-in-right flex flex-col">
            {/* User Info */}
            {userName && (
              <div className="p-6 bg-gradient-to-r from-primary to-blue-600 text-white">
                <div className="flex items-center gap-3">
                  <div className="size-12 rounded-full bg-white/20 flex items-center justify-center font-bold text-lg">
                    {userName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold">{userName}</p>
                    <p className="text-sm text-white/70">Usuario activo</p>
                  </div>
                </div>
              </div>
            )}

            {/* Menu Items */}
            <nav className="flex-1 p-4 space-y-2">
              <button
                onClick={() => handleNavigate('simulacros')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === 'simulacros' ? 'bg-primary text-white' : 'text-slate-700 hover:bg-slate-100'}`}
              >
                <span className="material-symbols-outlined">quiz</span>
                Simulacros
              </button>
              <button
                onClick={() => handleNavigate('normativa')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === 'normativa' ? 'bg-primary text-white' : 'text-slate-700 hover:bg-slate-100'}`}
              >
                <span className="material-symbols-outlined">gavel</span>
                Normativa
              </button>
              <button
                onClick={() => handleNavigate('estadisticas')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === 'estadisticas' ? 'bg-primary text-white' : 'text-slate-700 hover:bg-slate-100'}`}
              >
                <span className="material-symbols-outlined">bar_chart</span>
                Estadísticas
              </button>

              <button
                onClick={() => handleNavigate('matematicas')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === 'matematicas' ? 'bg-primary text-white' : 'text-slate-700 hover:bg-slate-100'}`}
              >
                <span className="material-symbols-outlined">calculate</span>
                Matemáticas
              </button>

              <button
                onClick={() => handleNavigate('ai-coach')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === 'ai-coach' ? 'bg-indigo-600 text-white' : 'text-indigo-600 hover:bg-indigo-50'}`}
              >
                <span className="material-symbols-outlined">psychology</span>
                Coach IA
              </button>

              <button
                onClick={() => handleNavigate('ayuda')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === 'ayuda' ? 'bg-primary text-white' : 'text-slate-700 hover:bg-slate-100'}`}
              >
                <span className="material-symbols-outlined">help</span>
                Ayuda
              </button>

              <div className="h-px bg-slate-200 my-3" />

              <button
                onClick={() => handleNavigate('planes')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === 'planes' ? 'bg-amber-100 text-amber-700' : 'text-amber-600 hover:bg-amber-50'}`}
              >
                <span className="material-symbols-outlined">workspace_premium</span>
                Planes
              </button>

              {isPremium && (
                <button
                  onClick={() => handleNavigate('entrevista')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === 'entrevista' ? 'bg-indigo-100 text-indigo-700' : 'text-indigo-600 hover:bg-indigo-50'}`}
                >
                  <span className="material-symbols-outlined">mic</span>
                  Entrevista
                </button>
              )}

              {isAdmin && (
                <button
                  onClick={() => handleNavigate('admin')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === 'admin' ? 'bg-purple-100 text-purple-700' : 'text-purple-600 hover:bg-purple-50'}`}
                >
                  <span className="material-symbols-outlined">admin_panel_settings</span>
                  Admin
                </button>
              )}
            </nav>

            {/* Logout Button */}
            <div className="p-4 border-t border-slate-200">
              <button
                onClick={() => { onLogout?.(); setIsMobileMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
              >
                <span className="material-symbols-outlined">logout</span>
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="flex-grow flex flex-col">
        {children}
      </main>
      <footer className="py-6 bg-white border-t border-border-light text-center">
        <p className="text-xs text-slate-400">© 2026 Entrenador Docente. Diseñado bajo lineamientos CNSC.</p>
      </footer>

      {/* WhatsApp Floating Button for authenticated users */}
      {showNav && <WhatsAppButton />}
    </div>
  );
};
