import React, { useState, useEffect } from 'react';
import { Question, AnswerRecord, SimulationMode } from '../types';

interface SimulatorProps {
  questions: Question[];
  totalTarget: number;
  mode: SimulationMode;
  isLoadingMore: boolean;
  onFinish: (answers: AnswerRecord[]) => void;
  // Persistence Props
  currentIndex: number;
  onIndexChange: (index: number) => void;
  answers: AnswerRecord[];
  onAnswersChange: (answers: AnswerRecord[]) => void;
  timeLeft: number;
  onTimeUpdate: (time: number) => void;
}

export const Simulator: React.FC<SimulatorProps> = ({
  questions, totalTarget, mode, isLoadingMore, onFinish,
  currentIndex, onIndexChange, answers, onAnswersChange, timeLeft, onTimeUpdate
}) => {
  // Local UI State only
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [startTime, setStartTime] = useState(Date.now());
  // Removed local timeLeft, currentIndex, answers state

  const currentQuestion = questions[currentIndex];
  const isPractice = mode === SimulationMode.PRACTICA_COMPONENTE;

  // Timer Logic
  useEffect(() => {
    if (!isPractice && timeLeft > 0) {
      // We use window.setInterval but must be careful with updates
      const timer = setInterval(() => {
        onTimeUpdate(timeLeft - 1);
      }, 1000);
      return () => clearInterval(timer);
    } else if (timeLeft === 0 && !isPractice) {
      onFinish(answers);
    }
  }, [timeLeft, isPractice, answers, onFinish, onTimeUpdate]);

  // When new questions arrive, we don't need to do anything special, 
  // they just become available in the array.

  const handleOptionSelect = (optionId: string) => {
    if (showFeedback && isPractice) return;
    setSelectedOption(optionId);
  };

  const handleSubmitAnswer = () => {
    const timeSpent = (Date.now() - startTime) / 1000;
    const selected = selectedOption || "";

    const record: AnswerRecord = {
      questionId: currentQuestion?.id || "unknown",
      selectedOptionId: selected,
      isCorrect: selected === currentQuestion?.correctOptionId,
      timeSpentSeconds: timeSpent
    };

    const newAnswers = [...answers, record];
    onAnswersChange(newAnswers);

    if (isPractice) {
      setShowFeedback(true);
    } else {
      attemptGoToNext(newAnswers);
    }
  };

  const attemptGoToNext = (currentAnswers: AnswerRecord[]) => {
    // Logic: 
    // 1. If there is a next question in array -> Go to it.
    // 2. If no next question BUT we haven't reached totalTarget -> Wait/Show loading.
    // 3. If no next question AND we reached totalTarget (or close enough) -> Finish.

    if (currentIndex < questions.length - 1) {
      // Normal flow
      onIndexChange(currentIndex + 1);
      setSelectedOption(null);
      setShowFeedback(false);
      setStartTime(Date.now());
    } else {
      // End of current list
      if (questions.length < totalTarget && isLoadingMore) {
        // Wait for more questions. 
        // We can just stay on this screen but show a "Loading next" state?
        // Actually, better to show a dedicated "Loading next batch" view *instead* of current question if we try to advance.
        // For now, let's auto-finish ONLY if we really are done or stopped loading.
      } else {
        onFinish(currentAnswers);
      }
    }
  };

  // If we are at the last question of the CURRENT list, but expecting more...
  // We need to handle the render carefully.
  const isLastAvailable = currentIndex === questions.length - 1;
  const isWaitingForMore = isLastAvailable && questions.length < totalTarget && isLoadingMore;

  // Function to manually advance if the user was waiting and new questions arrived
  useEffect(() => {
    // If we were at the end, and suddenly questions.length grew, we don't auto-advance visually,
    // the user must click "Siguiente". 
    // EXCEPT if the user has ALREADY answered the current one and is just waiting?
    // Complexity: Keep it simple. User answers Q5. Clicks Next. 
    // If Q6 exists, go to Q6. If not, show "Generando...".
    // This logic is handled in the Render.
  }, [questions.length]);

  const handleNextClick = () => {
    if (isPractice && showFeedback) {
      attemptGoToNext(answers);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // RENDER: Loading State (Waiting for background fetch)
  if (!currentQuestion) {
    if (isLoadingMore) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-10 text-center animate-pulse">
          <div className="size-16 border-4 border-slate-200 border-t-primary rounded-full animate-spin mb-4"></div>
          <h3 className="text-xl font-bold text-slate-700">Generando siguientes preguntas...</h3>
          <p className="text-slate-500">Nuestra IA está trabajando en tiempo real.</p>
        </div>
      );
    }
    return <div className="p-10 text-center">Finalizando sesión...</div>;
  }

  return (
    <div className="flex flex-col h-full max-w-6xl mx-auto w-full p-4 md:p-6 gap-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-border-light shadow-sm">
        <div className="flex items-center gap-4">
          <span className="font-bold text-lg text-slate-700">
            Pregunta {currentIndex + 1} <span className="text-slate-400 text-sm">/ {totalTarget}</span>
          </span>
          <div className="hidden md:block h-2 w-32 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / totalTarget) * 100}%` }}
            ></div>
          </div>
        </div>
        {!isPractice && (
          <div className={`flex items-center gap-2 font-mono text-lg font-bold px-3 py-1 rounded bg-slate-50 ${timeLeft < 300 ? 'text-red-600' : 'text-slate-700'}`}>
            <span className="material-symbols-outlined">timer</span>
            {formatTime(timeLeft)}
          </div>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
        {/* Context Column */}
        <div className="lg:w-1/2 flex flex-col h-full bg-white rounded-xl border border-border-light shadow-sm overflow-hidden">
          <div className="bg-slate-50 p-4 border-b border-border-light flex items-center justify-between">
            <h3 className="font-bold text-slate-700 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">menu_book</span>
              Caso Situacional
            </h3>
            <span className="text-xs font-medium px-2 py-1 bg-white border rounded text-slate-500 truncate max-w-[150px]">
              {currentQuestion.competency || "General"}
            </span>
          </div>
          <div className="p-6 overflow-y-auto prose prose-slate max-w-none">
            <p className="text-lg leading-relaxed text-slate-800">
              {currentQuestion.context || currentQuestion.text}
            </p>
            {currentQuestion.context && (
              <div className="mt-6 p-4 bg-blue-50 border-l-4 border-primary rounded-r-lg">
                <p className="font-bold text-primary-dark mb-1">Pregunta:</p>
                <p className="text-slate-900 font-medium">{currentQuestion.text}</p>
              </div>
            )}
          </div>
        </div>

        {/* Options Column */}
        <div className="lg:w-1/2 flex flex-col gap-4">
          <div className="flex flex-col gap-3">
            {currentQuestion.options?.map((option) => {
              let stateClass = "border-border-light bg-white hover:border-primary/50";
              if (selectedOption === option.id) stateClass = "border-primary bg-blue-50 ring-1 ring-primary";

              if (showFeedback && isPractice) {
                if (option.id === currentQuestion.correctOptionId) stateClass = "border-green-500 bg-green-50 ring-1 ring-green-500";
                else if (selectedOption === option.id) stateClass = "border-red-500 bg-red-50 ring-1 ring-red-500";
                else stateClass = "opacity-50 grayscale";
              }

              return (
                <button
                  key={option.id}
                  onClick={() => handleOptionSelect(option.id)}
                  disabled={showFeedback}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all flex gap-4 items-start ${stateClass}`}
                >
                  <span className={`size-8 flex items-center justify-center rounded-full text-sm font-bold shrink-0 ${selectedOption === option.id || (showFeedback && isPractice && option.id === currentQuestion.correctOptionId) ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600'}`}>
                    {option.id}
                  </span>
                  <span className="text-slate-800 pt-1 text-sm md:text-base">{option.text}</span>
                </button>
              );
            })}
          </div>

          {/* Feedback (Practice Mode) */}
          {showFeedback && isPractice && (
            <div className="bg-white p-6 rounded-xl border border-border-light shadow-lg animate-fade-in mt-auto">
              <div className={`flex items-center gap-2 font-bold mb-2 ${currentQuestion.correctOptionId === selectedOption ? 'text-green-600' : 'text-red-600'}`}>
                <span className="material-symbols-outlined">{currentQuestion.correctOptionId === selectedOption ? 'check_circle' : 'cancel'}</span>
                {currentQuestion.correctOptionId === selectedOption ? 'Respuesta Correcta' : 'Respuesta Incorrecta'}
              </div>
              <p className="text-slate-700 mb-4 text-sm">{currentQuestion.normative?.explanation}</p>

              <button
                onClick={handleNextClick}
                disabled={isWaitingForMore && isLastAvailable}
                className="w-full mt-2 py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary-dark disabled:bg-slate-300 disabled:cursor-wait flex items-center justify-center gap-2"
              >
                {isWaitingForMore && isLastAvailable ? (
                  <>
                    <span className="size-4 border-2 border-white/50 border-t-white rounded-full animate-spin"></span>
                    Generando pregunta...
                  </>
                ) : 'Siguiente Pregunta'}
              </button>
            </div>
          )}

          {/* Main Action Button */}
          {(!isPractice || !showFeedback) && (
            <button
              onClick={handleSubmitAnswer}
              disabled={!selectedOption || (isWaitingForMore && isLastAvailable && !isPractice)} // If normal mode, we wait on submit only if next isn't ready? No, we submit then wait.
              className="mt-auto w-full py-4 bg-primary text-white font-bold rounded-xl shadow-md hover:bg-primary-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isPractice ? 'Verificar Respuesta' : (
                (isWaitingForMore && isLastAvailable) ? (
                  <>
                    <span className="size-5 border-2 border-white/50 border-t-white rounded-full animate-spin"></span>
                    Generando siguiente...
                  </>
                ) : 'Confirmar y Avanzar'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};