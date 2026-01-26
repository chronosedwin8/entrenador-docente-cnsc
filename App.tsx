import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { Layout } from './components/Layout';
import { Onboarding } from './components/Onboarding';
import { LandingPage } from './components/LandingPage';
import { ConfigPanel } from './components/ConfigPanel';
import { Simulator } from './components/Simulator';
import { ResultsDashboard } from './components/ResultsDashboard';
import { NormativaView } from './components/NormativaView';
import { GlobalStatsView } from './components/GlobalStatsView';
import { fetchQuestionBatch } from './services/geminiService';
import { supabase } from './services/supabase';
import { UpdatePassword } from './components/UpdatePassword';
import { AdminPanel } from './components/AdminPanel';
import { PlansView } from './components/PlansView';
import { MathLearningView } from './components/MathLearningView';
import { AIAnalysisView } from './components/AIAnalysisView';
import { HelpVideosView } from './components/HelpVideosView';
import { InterviewView } from './components/InterviewView';
import { TermsModal } from './components/TermsModal';
import { MaintenancePage } from './components/MaintenancePage';
import { settingsService, MaintenanceConfig } from './services/settingsService';
import { UserProfile, ExamConfig, Question, SimulationResult, AnswerRecord, UserRole, KnowledgeArea, SystemRole, SubscriptionTier } from './types';

enum AppView {
  ONBOARDING,
  CONFIG,
  LOADING_EXAM,
  SIMULATOR,
  RESULTS,
  NORMATIVA,
  GLOBAL_STATS,
  UPDATE_PASSWORD,
  ADMIN,
  EXPIRED,
  LANDING,
  PLANS,
  MATH_LEARNING,
  AI_ANALYSIS,
  INTERVIEW,
  HELP_VIDEOS
}

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(AppView.LANDING);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [maintenance, setMaintenance] = useState<MaintenanceConfig | null>(null);
  const [examConfig, setExamConfig] = useState<ExamConfig | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [history, setHistory] = useState<SimulationResult[]>([]);
  // Simulation Persistence State
  const [simCurrentIndex, setSimCurrentIndex] = useState(0);
  const [simAnswers, setSimAnswers] = useState<AnswerRecord[]>([]);
  const [simTimeLeft, setSimTimeLeft] = useState(0);
  // Loading State
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [isBackgroundLoading, setIsBackgroundLoading] = useState(false);
  const backgroundLoadRef = useRef(false); // Ref to track if background load is active across renders
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [showTerms, setShowTerms] = useState(false);

  // Check Session & Load History
  useEffect(() => {
    // Check Maintenance Mode
    settingsService.getMaintenanceConfig().then(setMaintenance);

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth Event:", event);

      if (event === 'PASSWORD_RECOVERY') {
        setView(AppView.UPDATE_PASSWORD);
      } else if (event === 'SIGNED_IN' && session) {
        // If we just signed in, check if it was a recovery flow first
        // But supabase triggers PASSWORD_RECOVERY before SIGNED_IN usually.
        // However, if we come from a link, we might want to be careful.
        // We will defer to see if view is already UPDATE_PASSWORD
        setView(prev => {
          if (prev === AppView.UPDATE_PASSWORD) return prev;
          fetchProfile(session.user.id);
          return prev; // We don't change view here, fetchProfile will do it if needed
        });
      } else if (event === 'SIGNED_OUT') {
        setUserProfile(null);
        setView(AppView.LANDING);
      }
    });

    // Initial session check
    checkSession();

    return () => {
      subscription.unsubscribe();
      backgroundLoadRef.current = false; // Ensure background tasks stop on unmount
    };
  }, []);

  const checkSession = async () => {
    // Check if we are in a recovery flow via URL
    // The hash contains type=recovery
    if (window.location.hash && window.location.hash.includes('type=recovery')) {
      console.log("Recovery link detected, waiting for auth event...");
      return; // Do nothing, let onAuthStateChange handle it
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      fetchProfile(session.user.id);
    }
  };

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (data && !error) {
      // Update last_login_at
      await supabase
        .from('profiles')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', userId);

      // Get email_confirmed_at from auth.users
      const { data: authUser } = await supabase.auth.getUser();
      if (authUser?.user?.email_confirmed_at && !data.email_confirmed_at) {
        await supabase
          .from('profiles')
          .update({ email_confirmed_at: authUser.user.email_confirmed_at })
          .eq('id', userId);
      }

      setUserProfile({
        id: data.id,
        name: data.name,
        role: data.role as UserRole,
        area: data.area as KnowledgeArea,
        system_role: (data.system_role as SystemRole) || 'user',
        subscription_tier: (data.subscription_tier as SubscriptionTier) || 'free',
        created_at: data.created_at,
        expiration_date: data.expiration_date,
        terms_accepted_at: data.terms_accepted_at,
        custom_daily_limit: data.custom_daily_limit,
        custom_monthly_limit: data.custom_monthly_limit,
        custom_question_limit: data.custom_question_limit,
        has_interview_access: data.has_interview_access
      });

      // Check terms acceptance
      // We check DB value first, then fallback to localStorage for resilience if schema update failed
      const hasAcceptedLocally = localStorage.getItem(`terms_accepted_${data.id}`) === 'true';

      if (!data.terms_accepted_at && !hasAcceptedLocally) {
        setShowTerms(true);
      }

      // Check expiration
      if (data.expiration_date && new Date(data.expiration_date) < new Date()) {
        setView(AppView.EXPIRED);
      } else {
        // If we are on landing or onboarding, move to config
        setView(prev => {
          if (prev === AppView.UPDATE_PASSWORD) return prev;
          // REMOVED AUTO-REDIRECT FROM LANDING: Users must explicitly click "Start"
          if (prev === AppView.ONBOARDING) return AppView.CONFIG;
          return prev;
        });
      }

      fetchHistory(userId);
    }
  };

  const fetchHistory = async (userId: string) => {
    const { data, error } = await supabase
      .from('simulations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (data && !error) {
      const mappedHistory: SimulationResult[] = data.map((item: any) => ({
        totalQuestions: item.total_questions,
        correctCount: item.correct_count,
        score: item.score,
        answers: item.answers, // JSON
        questions: item.questions, // JSON
        date: new Date(item.created_at),
        mode: item.mode,
        targetCompetency: item.target_competency
      }));
      setHistory(mappedHistory);
    }
  };

  const saveToHistory = async (newResult: SimulationResult) => {
    // Optimistic update
    setHistory(prev => [newResult, ...prev]);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('simulations')
      .insert({
        user_id: user.id,
        mode: newResult.mode,
        target_competency: newResult.targetCompetency,
        total_questions: newResult.totalQuestions,
        correct_count: newResult.correctCount,
        score: newResult.score,
        questions: newResult.questions,
        answers: newResult.answers,
        created_at: newResult.date.toISOString()
      });

    if (error) {
      console.error("Error saving simulation:", error);
    }
  };

  const handleProfileComplete = (profile: UserProfile) => {
    setUserProfile(profile);
    setView(AppView.CONFIG);
    // Refresh history just in case
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) fetchHistory(data.user.id);
    });
  };

  // Loading Messages - Mix of informative and inspirational
  const LOADING_MESSAGES = [
    // Informative - Technical
    { text: "Conectando con la inteligencia artificial...", icon: "psychology" },
    { text: "Generando casos pedagógicos personalizados...", icon: "school" },
    { text: "Aplicando marco normativo vigente...", icon: "gavel" },
    { text: "Calibrando nivel de dificultad CNSC...", icon: "tune" },
    // Inspirational
    { text: "💡 ¿Sabías que la práctica constante aumenta tu puntaje hasta un 40%?", icon: "lightbulb" },
    { text: "🎯 Cada simulacro te acerca más a tu nombramiento.", icon: "target" },
    { text: "📚 Conocer la Ley 115 y el Decreto 1278 es clave para aprobar.", icon: "menu_book" },
    { text: "🏆 Los docentes mejor preparados superan el concurso con confianza.", icon: "emoji_events" },
    // Feature Recommendations
    { text: "💬 Prueba el módulo de Entrevista para dominar la fase oral.", icon: "record_voice_over" },
    { text: "⚖️ Usa el Asistente Legal para consultar normativas específicas.", icon: "balance" },
    { text: "📊 Revisa tu historial para identificar áreas de mejora.", icon: "analytics" },
    { text: "🔥 Los usuarios Premium tienen más simulacros y preguntas.", icon: "workspace_premium" },
    // Motivational
    { text: "✨ Tu esfuerzo de hoy es tu éxito de mañana.", icon: "auto_awesome" },
    { text: "🚀 Estás un paso más cerca de transformar vidas en el aula.", icon: "rocket_launch" },
    { text: "💪 La constancia vence lo que la suerte no alcanza.", icon: "fitness_center" },
  ];

  const handleExamStart = async (config: ExamConfig) => {
    setExamConfig(config);
    setView(AppView.LOADING_EXAM);
    setLoadingProgress(10);
    setLoadingMessage(LOADING_MESSAGES[0].text);
    setQuestions([]);
    setResult(null);

    // Reset Persistence
    setSimCurrentIndex(0);
    setSimAnswers([]);
    setSimTimeLeft(config.questionCount * 120);

    backgroundLoadRef.current = false;

    // Start animated progress and rotating messages
    let currentProgress = 15;
    let messageIndex = 0;

    // Clear any existing interval
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }

    progressIntervalRef.current = setInterval(() => {
      // Increment progress smoothly (never exceed 85% until response arrives)
      if (currentProgress < 85) {
        currentProgress += Math.random() * 4 + 1; // Random increment 1-5%
        currentProgress = Math.min(currentProgress, 85);
        setLoadingProgress(Math.round(currentProgress));
      }

      // Rotate messages every 2 seconds (interval runs every 400ms, so every 5 ticks)
      messageIndex = (messageIndex + 1) % LOADING_MESSAGES.length;
      setLoadingMessage(LOADING_MESSAGES[messageIndex].text);
    }, 800);

    if (userProfile) {
      try {
        // STRATEGY: Immediate Start
        // Only load 3 questions initially to get the user into the simulator FAST.
        const INITIAL_BATCH_SIZE = 3;

        const initialQuestions = await fetchQuestionBatch(
          userProfile.role,
          userProfile.area,
          INITIAL_BATCH_SIZE,
          config.selectedCompetency,
          config.forceRefresh
        );

        // Stop the animation
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = null;
        }

        setLoadingProgress(95);
        setLoadingMessage("¡Preguntas listas! Iniciando simulacro...");

        if (initialQuestions && initialQuestions.length > 0) {
          setQuestions(initialQuestions);
          // Wait a tiny bit to show completion
          setTimeout(() => {
            setLoadingProgress(100);
            setTimeout(() => {
              setView(AppView.SIMULATOR);
              // Trigger background loading for the rest
              if (config.questionCount > INITIAL_BATCH_SIZE) {
                loadRemainingQuestionsInBg(config, initialQuestions.length);
              }
            }, 300);
          }, 400);
        } else {
          throw new Error("No se generaron preguntas iniciales.");
        }
      } catch (e) {
        // Stop the animation on error
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = null;
        }
        console.error("Start exam error:", e);
        toast.error("Ocurrió un error conectando con la IA. Verifica tu conexión o intenta de nuevo.");
        setView(AppView.CONFIG);
      }
    }
  };

  // Background Loader
  const loadRemainingQuestionsInBg = async (config: ExamConfig, currentCount: number) => {
    if (!userProfile || backgroundLoadRef.current) return;

    backgroundLoadRef.current = true;
    setIsBackgroundLoading(true);

    let loaded = currentCount;
    const BATCH_SIZE = 4; // Fetch small chunks
    let errorCount = 0; // Prevent infinite loops on API failure

    while (loaded < config.questionCount && backgroundLoadRef.current) {
      if (errorCount >= 3) {
        console.warn("Deteniendo carga en segundo plano por múltiples errores.");
        break;
      }

      try {
        const countToFetch = Math.min(BATCH_SIZE, config.questionCount - loaded);
        const newBatch = await fetchQuestionBatch(
          userProfile.role,
          userProfile.area,
          countToFetch,
          config.selectedCompetency,
          config.forceRefresh
        );

        if (newBatch.length > 0) {
          // Append to state safely
          setQuestions(prev => {
            // Avoid duplicates just in case
            const ids = new Set(prev.map(q => q.id));
            const uniqueNew = newBatch.filter(q => !ids.has(q.id));
            return [...prev, ...uniqueNew];
          });
          loaded += newBatch.length;
          errorCount = 0; // Reset error count on success
        } else {
          errorCount++;
          // If we fail a batch, wait a bit
          await new Promise(r => setTimeout(r, 2000));
        }

        // Gentle delay between batches
        await new Promise(r => setTimeout(r, 1000));

      } catch (e) {
        console.error("Bg load error", e);
        errorCount++;
      }
    }
    setIsBackgroundLoading(false);
    backgroundLoadRef.current = false;
  };

  const handleExamFinish = (answers: AnswerRecord[]) => {
    backgroundLoadRef.current = false; // Stop loading

    const correctCount = answers.filter(a => a.isCorrect).length;
    const score = (correctCount / answers.length) * 100;

    // SAVE FULL CONTEXT: We must save 'questions' array because AI generates them dynamically.
    const newResult: SimulationResult = {
      totalQuestions: answers.length,
      correctCount,
      score,
      answers,
      questions: questions, // Store the snapshot of questions
      date: new Date(),
      // Add Config Context for better Stats
      mode: examConfig?.mode,
      targetCompetency: examConfig?.selectedCompetency
    };

    setResult(newResult);
    saveToHistory(newResult);

    // Clear persistence on finish
    setSimAnswers([]);
    setSimCurrentIndex(0);

    setView(AppView.RESULTS);
  };

  const handleRestart = () => {
    backgroundLoadRef.current = false;
    backgroundLoadRef.current = false;
    setQuestions([]);
    setResult(null);
    setSimAnswers([]);
    setSimCurrentIndex(0);
    setView(AppView.CONFIG);
  };

  // Navigation
  const handleNavigate = (tab: 'simulacros' | 'normativa' | 'estadisticas' | 'admin' | 'planes' | 'matematicas' | 'ai-coach' | 'ayuda' | 'entrevista') => {
    backgroundLoadRef.current = false; // Cancel bg load if navigating away
    if (tab === 'simulacros') {
      // If we have an active exam (questions exist and no result yet), go back to simulator
      if (userProfile && questions.length > 0 && !result) {
        setView(AppView.SIMULATOR);
      } else {
        userProfile ? setView(AppView.CONFIG) : setView(AppView.LANDING);
      }
    } else if (tab === 'normativa') {
      setView(AppView.NORMATIVA);
    } else if (tab === 'estadisticas') {
      setView(AppView.GLOBAL_STATS);
    } else if (tab === 'admin') {
      setView(AppView.ADMIN);
    } else if (tab === 'planes') {
      setView(AppView.PLANS);
    } else if (tab === 'matematicas') {
      setView(AppView.MATH_LEARNING);
    } else if (tab === 'ai-coach') {
      setView(AppView.AI_ANALYSIS);
    } else if (tab === 'ayuda') {
      setView(AppView.HELP_VIDEOS);
    } else if (tab === 'entrevista') {
      setView(AppView.INTERVIEW);
    }
  };

  const getActiveTab = () => {
    if (view === AppView.NORMATIVA) return 'normativa';
    if (view === AppView.GLOBAL_STATS) return 'estadisticas';
    if (view === AppView.ADMIN) return 'admin';
    if (view === AppView.PLANS) return 'planes';
    if (view === AppView.MATH_LEARNING) return 'matematicas';
    if (view === AppView.AI_ANALYSIS) return 'ai-coach';
    if (view === AppView.HELP_VIDEOS) return 'ayuda';
    if (view === AppView.INTERVIEW) return 'entrevista';
    return 'simulacros';
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUserProfile(null);
    setHistory([]);
    setView(AppView.LANDING);
  };

  const getUsageStats = () => {
    if (!userProfile) return undefined;

    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const dailyUsed = history.filter(h => h.date >= startOfDay).length;
    const monthlyUsed = history.filter(h => h.date >= startOfMonth).length;

    const defaultQ = userProfile.subscription_tier === 'premium' ? 50 : 5;

    return {
      dailyUsed,
      dailyLimit: userProfile.custom_daily_limit ?? 1,
      monthlyUsed,
      monthlyLimit: userProfile.custom_monthly_limit ?? 2,
      questionLimit: userProfile.custom_question_limit ?? defaultQ
    };
  };

  const handleTermsAccept = async () => {
    if (!userProfile) return;

    try {
      // 1. Try to persist to DB
      const { error } = await supabase
        .from('profiles')
        .update({ terms_accepted_at: new Date().toISOString() })
        .eq('id', userProfile.id);

      if (error) {
        console.warn("Could not save terms acceptance to DB (likely schema mismatch). Using LocalStorage fallback.", error);
      }
    } catch (e) {
      console.warn("Terms DB update failed", e);
    }

    // 2. Always persist locally as fallback
    localStorage.setItem(`terms_accepted_${userProfile.id}`, 'true');
    setShowTerms(false);
  };

  // MAINTENANCE MODE CHECK
  if (maintenance?.enabled && view !== AppView.LANDING) {
    // If enabled, only Admin can proceed.
    // If we don't know the profile yet (e.g. initial load), we might briefly show maintenance page, which is fine.
    // However, if the user IS an admin, we want to let them through.

    // Condition to BLOCK:
    // 1. Maintenance is ON.
    // 2. We are NOT on Landing Page (so user is inside app).
    // 3. EITHER:
    //    a. User profile is NOT loaded yet (so we don't know if admin) -> Block to be safe.
    //    b. User profile IS loaded and role is NOT admin -> Block.
    //
    // IMPLICATION: Admins might see a flash of Maintenance Page before profile loads?
    // fetchProfile is called in useEffect.
    // 
    // Optimization: If userProfile is null, but we have a session... 
    // We can't know role without profile.

    const isAdmin = userProfile?.system_role === 'admin';

    if (!isAdmin) {
      return <MaintenancePage message={maintenance.message} />;
    }
  }

  return (
    view === AppView.LANDING ? (
      <LandingPage onStart={() => {
        // If user is already logged in (profile exists), go to Config
        if (userProfile) {
          setView(AppView.CONFIG);
        } else {
          // Otherwise go to Onboarding
          setView(AppView.ONBOARDING);
        }
      }} />
    ) : (
      <Layout
        showNav={view !== AppView.ONBOARDING}
        onNavigate={handleNavigate}
        activeTab={getActiveTab()}
        onLogout={handleLogout}
        userName={userProfile?.name}
        isAdmin={userProfile?.system_role === 'admin'}
        isPremium={(userProfile?.subscription_tier === 'premium' && userProfile?.has_interview_access) || userProfile?.system_role === 'admin'}
        usageStats={getUsageStats()}
        expirationDate={userProfile?.expiration_date}
      >
        {view === AppView.ONBOARDING && (
          <Onboarding onComplete={handleProfileComplete} />
        )}

        {view === AppView.CONFIG && userProfile && (
          <ConfigPanel
            userProfile={userProfile}
            onStart={handleExamStart}
            history={history}
            onNavigate={(tab) => handleNavigate(tab)}
          />
        )}

        {view === AppView.LOADING_EXAM && (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 animate-fade-in">
            <div className="relative size-32 mb-8">
              <svg className="size-full transform -rotate-90">
                <circle cx="64" cy="64" r="60" stroke="#e2e8f0" strokeWidth="8" fill="transparent" />
                <circle
                  cx="64" cy="64" r="60"
                  stroke="#0d7ff2" strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={377}
                  strokeDashoffset={377 - (377 * loadingProgress) / 100}
                  strokeLinecap="round"
                  className="transition-all duration-300 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-xl font-bold text-primary">
                {loadingProgress}%
              </div>
            </div>

            <h2 className="text-2xl font-bold text-[#0d141c] mb-4">Preparando Sesión</h2>

            {/* Dynamic Message with fade animation */}
            <div className="h-16 flex items-center justify-center">
              <p
                key={loadingMessage}
                className="text-slate-600 max-w-md text-lg animate-fade-in"
              >
                {loadingMessage}
              </p>
            </div>

            <p className="text-slate-400 text-sm mt-4 max-w-sm">
              El examen comenzará en breve y se cargarán más preguntas mientras respondes.
            </p>
          </div>
        )}

        {view === AppView.SIMULATOR && examConfig && questions.length > 0 && (
          <Simulator
            questions={questions}
            totalTarget={examConfig.questionCount}
            mode={examConfig.mode}
            onFinish={handleExamFinish}
            isLoadingMore={isBackgroundLoading}
            // Persistence
            currentIndex={simCurrentIndex}
            onIndexChange={setSimCurrentIndex}
            answers={simAnswers}
            onAnswersChange={setSimAnswers}
            timeLeft={simTimeLeft}
            onTimeUpdate={setSimTimeLeft}
          />
        )}

        {view === AppView.RESULTS && result && (
          <ResultsDashboard
            result={result}
            // We don't need to pass questions separately anymore, they are in result.questions
            questions={result.questions}
            onRestart={handleRestart}
          />
        )}

        {view === AppView.NORMATIVA && <NormativaView
          isPremium={userProfile?.subscription_tier === 'premium' || userProfile?.system_role === 'admin'}
          onNavigateToPlans={() => handleNavigate('planes')}
          onNavigate={handleNavigate}
        />}
        {view === AppView.GLOBAL_STATS && <GlobalStatsView history={history} />}
        {view === AppView.UPDATE_PASSWORD && (
          <UpdatePassword onSuccess={() => {
            toast.success('Por favor inicia sesión con tu nueva contraseña.');
            handleLogout();
          }} />
        )}

        {view === AppView.PLANS && <PlansView userId={userProfile?.id} />}
        {view === AppView.MATH_LEARNING && <MathLearningView />}
        {view === AppView.HELP_VIDEOS && <HelpVideosView />}
        {view === AppView.AI_ANALYSIS && userProfile && (
          <AIAnalysisView
            userProfile={userProfile}
            history={history}
            onNavigateToPlans={() => handleNavigate('planes')}
          />
        )}

        {view === AppView.INTERVIEW && userProfile && (
          <InterviewView userProfile={userProfile} onNavigateToPlans={() => handleNavigate('planes')} />
        )}

        {view === AppView.ADMIN && userProfile && userProfile.system_role === 'admin' && (
          <AdminPanel
            currentUser={userProfile}
            onClose={() => setView(AppView.CONFIG)}
            onHistoryReset={(targetUserId) => {
              // If we are deleting OUR OWN history, refresh local state
              if (targetUserId === userProfile.id) {
                fetchHistory(targetUserId);
              }
            }}
          />
        )}

        {view === AppView.EXPIRED && (
          <div className="text-center p-10 flex flex-col items-center justify-center flex-1">
            <div className="bg-red-50 p-6 rounded-full text-red-500 mb-6">
              <span className="material-symbols-outlined text-4xl">block</span>
            </div>
            <h2 className="text-3xl font-black text-[#0d141c] mb-4">Tu Plan ha Expirado</h2>
            <p className="text-slate-600 max-w-md mb-8">
              Tu suscripción anual ha finalizado. Por favor contacta al administrador para renovar tu acceso a la plataforma.
            </p>
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-8 w-full max-w-xs">
              <p className="text-xs text-slate-500 uppercase font-bold mb-1">Fecha de Expiración</p>
              <p className="text-xl font-bold text-[#0d141c]">
                {userProfile?.expiration_date ? new Date(userProfile.expiration_date).toLocaleDateString() : 'Desconocida'}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="px-6 py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl shadow-sm hover:bg-slate-50 transition-colors"
            >
              Cerrar Sesión
            </button>
          </div>
        )}

        {showTerms && (
          <TermsModal onAccept={handleTermsAccept} />
        )}
      </Layout>
    )
  );
};

export default App;