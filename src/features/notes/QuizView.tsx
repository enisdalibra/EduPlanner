import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/database";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { parseQuiz, type QuizQuestion } from "@/lib/quizParser";
import { useTranslation } from "@/hooks/useTranslation";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

// ─── Types ─────────────────────────────────────────────────────────────────────

type AnswerState = {
  selectedIndex: number;   // which option was chosen (-1 = not answered)
  isCorrect: boolean;
};

// ─── Option Button ──────────────────────────────────────────────────────────────

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

interface OptionButtonProps {
  letter: string;
  text: string;
  isCorrect: boolean;
  isSelected: boolean;
  isRevealed: boolean;
  onClick: () => void;
}

function OptionButton({ letter, text, isCorrect, isSelected, isRevealed, onClick }: OptionButtonProps) {
  let buttonClass = "w-full text-left flex items-center gap-5 px-7 py-5 rounded-2xl border-2 transition-all duration-200 cursor-pointer active:scale-[0.99]";
  let letterClass = "w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg flex-shrink-0 transition-all duration-200";

  if (!isRevealed) {
    // Not yet answered — neutral with hover effect
    buttonClass += " bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 hover:border-primary hover:bg-primary/5 hover:shadow-md";
    letterClass += " bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300";
  } else if (isCorrect) {
    // This is the correct answer — always green
    buttonClass += " bg-success/10 border-success shadow-md shadow-success/20";
    letterClass += " bg-success text-white";
  } else if (isSelected && !isCorrect) {
    // Wrong selection — red
    buttonClass += " bg-danger/10 border-danger shadow-md shadow-danger/20";
    letterClass += " bg-danger text-white";
  } else {
    // Other options after reveal — dimmed
    buttonClass += " bg-gray-50 dark:bg-gray-900 border-gray-100 dark:border-gray-700 opacity-60";
    letterClass += " bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400";
  }

  return (
    <button
      className={buttonClass}
      onClick={onClick}
      disabled={isRevealed}
      aria-pressed={isSelected}
    >
      <span className={letterClass}>{letter}</span>
      <span className="text-xl font-medium text-text dark:text-white leading-snug">{text}</span>
      {isRevealed && isCorrect && (
        <Icon name="check_circle" className="ml-auto text-success text-[28px] flex-shrink-0" />
      )}
      {isRevealed && isSelected && !isCorrect && (
        <Icon name="cancel" className="ml-auto text-danger text-[28px] flex-shrink-0" />
      )}
    </button>
  );
}

// ─── Results Screen ──────────────────────────────────────────────────────────────

interface ResultsScreenProps {
  questions: QuizQuestion[];
  answers: Record<number, AnswerState>;
  onReview: () => void;
  onBack: () => void;
  t: (key: string) => string;
}

function ResultsScreen({ questions, answers, onReview, onBack, t }: ResultsScreenProps) {
  const totalAnswered = Object.keys(answers).length;
  const correctCount = Object.values(answers).filter(a => a.isCorrect).length;
  const wrongCount = totalAnswered - correctCount;
  const totalScore = Math.round(
    Object.entries(answers).reduce((sum, [idx, ans]) => {
      if (ans.isCorrect) return sum + questions[Number(idx)].pointValue;
      return sum;
    }, 0)
  );

  // Determine grade label
  const grade =
    totalScore >= 90 ? { label: "Luar Biasa! 🌟", color: "text-success" } :
    totalScore >= 75 ? { label: "Bagus! 👍", color: "text-primary" } :
    totalScore >= 60 ? { label: "Cukup Baik", color: "text-warning" } :
    { label: "Perlu Latihan", color: "text-danger" };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background dark:bg-gray-900 p-8">
      {/* Score circle */}
      <div className="relative w-52 h-52 mb-8">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="8" className="text-gray-100 dark:text-gray-800" />
          <circle
            cx="50" cy="50" r="42" fill="none" strokeWidth="8"
            strokeDasharray={`${2 * Math.PI * 42 * totalScore / 100} ${2 * Math.PI * 42 * (1 - totalScore / 100)}`}
            strokeLinecap="round"
            className={totalScore >= 75 ? "text-success" : totalScore >= 60 ? "text-primary" : "text-danger"}
            stroke="currentColor"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-5xl font-black text-text dark:text-white">{totalScore}</span>
          <span className="text-lg text-gray-500 dark:text-gray-400 font-medium">/ 100</span>
        </div>
      </div>

      {/* Title */}
      <h1 className="text-4xl font-black text-text dark:text-white tracking-tight mb-2">
        {t('quizView.finishTitle')}
      </h1>
      <p className={cn("text-2xl font-bold mb-10", grade.color)}>{grade.label}</p>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-6 mb-12 w-full max-w-xl">
        <div className="panel text-center py-6">
          <div className="text-4xl font-black text-success mb-1">{correctCount}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">{t('quizView.totalCorrect')}</div>
        </div>
        <div className="panel text-center py-6">
          <div className="text-4xl font-black text-danger mb-1">{wrongCount}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">{t('quizView.totalWrong')}</div>
        </div>
        <div className="panel text-center py-6">
          <div className="text-4xl font-black text-primary mb-1">{questions.length}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">{t('quizView.totalQuestions')}</div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        <button
          onClick={onReview}
          className="btn btn-ghost text-lg px-8 py-4"
        >
          <Icon name="rate_review" className="w-6 h-6" />
          {t('quizView.reviewBtn')}
        </button>
        <button
          onClick={onBack}
          className="btn btn-primary text-lg px-8 py-4"
        >
          <Icon name="arrow_back" className="w-6 h-6" />
          {t('quizView.backBtn')}
        </button>
      </div>
    </div>
  );
}

// ─── Main QuizView Component ────────────────────────────────────────────────────

export function QuizView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const note = useLiveQuery(() => id ? db.notes.get(id) : undefined, [id]);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, AnswerState>>({});
  const [showResults, setShowResults] = useState(false);
  const [isReviewMode, setIsReviewMode] = useState(false);

  // Parse quiz from note content
  useEffect(() => {
    if (note?.content) {
      setQuestions(parseQuiz(note.content));
    }
  }, [note?.content]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (showResults) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') goNext();
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') goPrev();
    if (e.key === 'Escape') navigate('/evaluations');
  }, [currentIndex, questions.length, showResults]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const goNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(i => i + 1);
    }
  };

  const goPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(i => i - 1);
    }
  };

  const handleSelectOption = (optionIndex: number) => {
    if (answers[currentIndex] !== undefined) return; // already answered

    const isCorrect = questions[currentIndex].options[optionIndex].isCorrect;
    setAnswers(prev => ({
      ...prev,
      [currentIndex]: { selectedIndex: optionIndex, isCorrect }
    }));
  };

  const handleFinish = () => {
    setShowResults(true);
    setIsReviewMode(false);
  };

  const handleReview = () => {
    setShowResults(false);
    setIsReviewMode(true);
    setCurrentIndex(0);
  };

  // Loading state
  if (!note) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background dark:bg-gray-900">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // No quiz questions found
  if (questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background dark:bg-gray-900 p-8 text-center">
        <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6">
          <Icon name="quiz" className="text-[48px] text-gray-400" />
        </div>
        <h2 className="text-2xl font-bold text-text dark:text-white mb-3">{t('quizView.noQuestions')}</h2>
        <p className="text-gray-500 dark:text-gray-400 max-w-md mb-8 leading-relaxed">{t('quizView.noQuestionsHint')}</p>
        <button onClick={() => navigate('/evaluations')} className="btn btn-primary text-lg px-8 py-4">
          <Icon name="arrow_back" className="w-5 h-5" />
          {t('quizView.backBtn')}
        </button>
      </div>
    );
  }

  // Results screen
  if (showResults) {
    return (
      <ResultsScreen
        questions={questions}
        answers={answers}
        onReview={handleReview}
        onBack={() => navigate('/evaluations')}
        t={t}
      />
    );
  }

  // ── Quiz screen ──
  const question = questions[currentIndex];
  const answer = answers[currentIndex];
  const isRevealed = answer !== undefined;
  const answeredCount = Object.keys(answers).length;
  const isLastQuestion = currentIndex === questions.length - 1;
  const canFinish = answeredCount === questions.length;

  return (
    <div className="min-h-screen bg-background dark:bg-gray-900 flex flex-col">

      {/* ── Top Bar ── */}
      <header className="sticky top-0 z-10 bg-white/80 dark:bg-gray-800/80 backdrop-blur border-b border-gray-100 dark:border-gray-700 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          {/* Left: exit button + title */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => navigate('/evaluations')}
              className="btn btn-ghost !py-2 !px-3 flex-shrink-0"
              title={t('quizView.exitQuiz')}
            >
              <Icon name="close" className="w-5 h-5" />
            </button>
            <span className="font-bold text-text dark:text-white truncate text-lg">{note.title}</span>
          </div>

          {/* Right: progress + score */}
          <div className="flex items-center gap-4 flex-shrink-0">
            {/* Progress pills */}
            <div className="hidden sm:flex items-center gap-1">
              {questions.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentIndex(i)}
                  className={cn(
                    "w-2.5 h-2.5 rounded-full transition-all duration-200",
                    i === currentIndex ? "bg-primary w-6" :
                    answers[i] !== undefined
                      ? answers[i].isCorrect ? "bg-success" : "bg-danger"
                      : "bg-gray-200 dark:bg-gray-600"
                  )}
                  title={`Soal ${i + 1}`}
                />
              ))}
            </div>

            {/* Score badge */}
            <div className="flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full font-bold text-sm">
              <Icon name="stars" className="w-4 h-4" />
              {Math.round(Object.entries(answers).reduce((sum, [idx, ans]) =>
                ans.isCorrect ? sum + questions[Number(idx)].pointValue : sum, 0
              ))} / 100
            </div>
          </div>
        </div>
      </header>

      {/* ── Question Area ── */}
      <main className="flex-1 flex flex-col max-w-4xl mx-auto w-full px-6 py-8 gap-8">

        {/* Question number + points */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="bg-primary text-white text-base font-bold px-4 py-1.5 rounded-full">
              {t('quizView.question')} {currentIndex + 1}
            </span>
            {isReviewMode && (
              <span className="text-sm text-gray-400 dark:text-gray-500 font-medium">
                ({t('quizView.of')} {questions.length})
              </span>
            )}
          </div>
          <span className="text-sm font-bold text-gray-400 dark:text-gray-500">
            +{question.pointValue} {t('quizView.points')}
          </span>
        </div>

        {/* Question text */}
        <div className="panel-lg">
          <div className="prose prose-xl dark:prose-invert max-w-none [&_p]:font-bold [&_p]:text-2xl [&_p]:leading-relaxed [&_p]:text-text dark:[&_p]:text-white">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {question.questionMarkdown || question.heading}
            </ReactMarkdown>
          </div>
        </div>

        {/* Options */}
        <div className="flex flex-col gap-4">
          {question.options.map((option, idx) => (
            <OptionButton
              key={idx}
              letter={OPTION_LETTERS[idx] || String(idx + 1)}
              text={option.text}
              isCorrect={option.isCorrect}
              isSelected={answer?.selectedIndex === idx}
              isRevealed={isRevealed}
              onClick={() => handleSelectOption(idx)}
            />
          ))}
        </div>

        {/* Feedback message */}
        {isRevealed && (
          <div className={cn(
            "flex items-center gap-3 px-6 py-4 rounded-2xl font-bold text-xl animate-[viewFadeIn_0.2s_ease-out]",
            answer.isCorrect
              ? "bg-success/10 text-success border-2 border-success/30"
              : "bg-danger/10 text-danger border-2 border-danger/30"
          )}>
            <Icon name={answer.isCorrect ? "check_circle" : "cancel"} className="text-[28px] flex-shrink-0" />
            <span>
              {answer.isCorrect
                ? t('quizView.answeredCorrectly').replace('{{pts}}', String(question.pointValue))
                : t('quizView.answeredWrong') + " " + question.options.find(o => o.isCorrect)?.text
              }
            </span>
          </div>
        )}
      </main>

      {/* ── Bottom Navigation Bar ── */}
      <footer className="sticky bottom-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur border-t border-gray-100 dark:border-gray-700 px-6 py-5">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">

          {/* Prev */}
          <button
            onClick={goPrev}
            disabled={currentIndex === 0}
            className="btn btn-ghost text-lg px-8 py-4 disabled:opacity-30"
          >
            <Icon name="arrow_back" className="w-6 h-6" />
            {t('quizView.prev')}
          </button>

          {/* Center: question counter */}
          <span className="text-base font-bold text-gray-500 dark:text-gray-400 tabular-nums">
            {currentIndex + 1} / {questions.length}
          </span>

          {/* Next / Finish */}
          {isLastQuestion ? (
            <button
              onClick={canFinish ? handleFinish : goNext}
              className={cn(
                "btn text-lg px-8 py-4",
                canFinish ? "btn-primary shadow-lg shadow-primary/30" : "btn-ghost"
              )}
            >
              {canFinish ? (
                <>
                  <Icon name="emoji_events" className="w-6 h-6" />
                  {t('quizView.finish')}
                </>
              ) : (
                <>
                  {t('quizView.next')}
                  <Icon name="arrow_forward" className="w-6 h-6" />
                </>
              )}
            </button>
          ) : (
            <button
              onClick={goNext}
              className="btn btn-primary text-lg px-8 py-4"
            >
              {t('quizView.next')}
              <Icon name="arrow_forward" className="w-6 h-6" />
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
