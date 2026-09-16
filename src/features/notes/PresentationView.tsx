import React, { useState, useCallback, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/database";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useTranslation } from "@/hooks/useTranslation";
import { useTheme } from "@/hooks/useTheme";
import { preprocessMarkdown } from "@/lib/preprocessMarkdown";
import { MarkdownImage } from "@/components/ui/MarkdownImage";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { parsePresentation, type PresentationSlide } from "@/lib/presentationParser";

type AnswerState = {
  selectedIndex: number;
  isCorrect: boolean;
};

const OPTION_LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H"];

// ─── Resolve effective dark mode ───────────────────────────────────────────────

function useIsDark(): boolean {
  const { theme } = useTheme();
  if (theme === 'dark') return true;
  if (theme === 'light') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}


// ─── Slide Thumbnail Dots ───────────────────────────────────────────────────────

interface ThumbnailsProps {
  total: number;
  current: number;
  isDark: boolean;
  onChange: (i: number) => void;
}

function SlideThumbnails({ total, current, isDark, onChange }: ThumbnailsProps) {
  const activeCls  = isDark ? "bg-white" : "bg-gray-700";
  const inactiveCls = isDark ? "bg-white/40 hover:bg-white/70" : "bg-gray-400/60 hover:bg-gray-600/80";

  return (
    <div className="flex items-center gap-1.5 flex-wrap justify-center max-w-xs">
      {Array.from({ length: total }, (_, i) => (
        <button
          key={i}
          onClick={() => onChange(i)}
          className={cn(
            "rounded-full transition-all duration-200 flex-shrink-0",
            i === current
              ? `w-6 h-2.5 ${activeCls}`
              : `w-2.5 h-2.5 ${inactiveCls}`
          )}
          title={`Slide ${i + 1}`}
        />
      ))}
    </div>
  );
}

// ─── Main PresentationView ──────────────────────────────────────────────────────

export function PresentationView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const isDark = useIsDark();

  const note = useLiveQuery(() => id ? db.notes.get(id) : undefined, [id]);
  const [slides, setSlides] = useState<PresentationSlide[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isThumbsOpen, setIsThumbsOpen] = useState(false);
  const [answers, setAnswers] = useState<Record<number, AnswerState>>({});

  useEffect(() => {
    if (note?.content) {
      const parsed = parsePresentation(note.content, note.title);
      setSlides(parsed);
      setCurrentIndex(0);
      setAnswers({});
    }
  }, [note?.content, note?.title]);

  const goNext = useCallback(() => {
    setCurrentIndex(i => {
      const currentSlide = slides[i];
      if (currentSlide?.kind === "quiz" && answers[currentSlide.questionIndex] === undefined) {
        return i;
      }
      return Math.min(i + 1, slides.length - 1);
    });
  }, [answers, slides]);

  const goPrev = useCallback(() => {
    setCurrentIndex(i => Math.max(i - 1, 0));
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') {
        e.preventDefault(); goNext();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault(); goPrev();
      } else if (e.key === 'Escape') {
        navigate('/materials');
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [goNext, goPrev, navigate]);

  // ── Theme-aware CSS classes ──────────────────────────────────────────────────
  const bg          = isDark ? "bg-gray-900"  : "bg-white";
  const textPrimary = isDark ? "text-white"   : "text-gray-900";
  const textMuted   = isDark ? "text-white/60" : "text-gray-500";
  const hudBg       = isDark ? "bg-white/10 hover:bg-white/20" : "bg-gray-100 hover:bg-gray-200";
  const hudText     = isDark ? "text-white/80 hover:text-white" : "text-gray-600 hover:text-gray-900";
  const thumbsPanel = isDark ? "bg-gray-800 border-white/10" : "bg-white border-gray-200 shadow-xl";
  const thumbItem   = isDark ? "bg-white/5 text-white/70 hover:bg-white/15" : "bg-gray-50 text-gray-600 hover:bg-gray-100";
  const progTrack   = isDark ? "bg-white/10" : "bg-gray-200";
  const headingText = isDark ? "text-white"   : "text-gray-900";
  const hintText    = isDark ? "text-white/30 font-mono" : "text-gray-400 font-mono";

  // Markdown prose class: use prose-invert only in dark mode
  const proseClass = cn(
    "prose prose-lg md:prose-xl max-w-none",
    isDark ? "prose-invert" : "prose-gray",
    isDark
      ? [
          "prose-headings:text-white prose-headings:font-bold",
          "prose-h3:text-2xl prose-h3:text-primary/90 prose-h3:mb-4",
          "prose-h4:text-xl prose-h4:text-white/80",
          "prose-p:text-white/85 prose-p:leading-relaxed prose-p:text-lg md:prose-p:text-xl",
          "prose-strong:text-white prose-strong:font-bold",
          "prose-em:text-white/70",
          "prose-code:text-primary prose-code:bg-primary/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-base",
          "prose-pre:bg-white/5 prose-pre:border prose-pre:border-white/10 prose-pre:rounded-2xl",
          "prose-blockquote:border-l-primary prose-blockquote:border-l-4 prose-blockquote:pl-6 prose-blockquote:text-white/60 prose-blockquote:italic",
          "prose-ul:text-white/85 prose-ol:text-white/85",
          "prose-li:text-lg md:prose-li:text-xl prose-li:leading-relaxed prose-li:my-2",
          "prose-table:text-white/85",
          "prose-th:text-white prose-th:bg-white/10 prose-th:font-bold prose-th:text-base",
          "prose-td:text-white/80 prose-td:border-white/10 prose-td:text-base",
          "prose-hr:border-white/20",
          "prose-a:text-primary prose-a:no-underline hover:prose-a:underline",
        ].join(" ")
      : [
          "prose-headings:text-gray-900 prose-headings:font-bold",
          "prose-h3:text-2xl prose-h3:text-primary prose-h3:mb-4",
          "prose-h4:text-xl prose-h4:text-gray-700",
          "prose-p:text-gray-700 prose-p:leading-relaxed prose-p:text-lg md:prose-p:text-xl",
          "prose-strong:text-gray-900 prose-strong:font-bold",
          "prose-em:text-gray-600",
          "prose-code:text-primary prose-code:bg-primary/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-base",
          "prose-pre:bg-gray-50 prose-pre:border prose-pre:border-gray-200 prose-pre:rounded-2xl",
          "prose-blockquote:border-l-primary prose-blockquote:border-l-4 prose-blockquote:pl-6 prose-blockquote:text-gray-500 prose-blockquote:italic",
          "prose-ul:text-gray-700 prose-ol:text-gray-700",
          "prose-li:text-lg md:prose-li:text-xl prose-li:leading-relaxed prose-li:my-2",
          "prose-table:text-gray-700",
          "prose-th:text-gray-800 prose-th:bg-gray-100 prose-th:font-bold prose-th:text-base",
          "prose-td:text-gray-700 prose-td:border-gray-200 prose-td:text-base",
          "prose-hr:border-gray-200",
          "prose-a:text-primary prose-a:no-underline hover:prose-a:underline",
        ].join(" ")
  );

  // ── Loading ──
  if (!note) {
    return (
      <div className={cn("flex items-center justify-center min-h-screen", bg)}>
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── No slides ──
  if (slides.length === 0) {
    return (
      <div className={cn("flex flex-col items-center justify-center min-h-screen p-8 text-center", bg)}>
        <Icon name="slideshow" className={cn("text-[64px] mb-4", textMuted)} />
        <h2 className={cn("text-2xl font-bold mb-2", textPrimary)}>{t('presentationView.noSlides')}</h2>
        <p className={cn("mb-8 max-w-sm", textMuted)}>{t('presentationView.noSlidesHint')}</p>
        <button
          onClick={() => navigate('/materials')}
          className={cn("btn", isDark ? "btn-ghost text-white border border-white/20" : "btn-ghost")}
        >
          <Icon name="arrow_back" className="w-5 h-5" />
          {t('presentationView.backBtn')}
        </button>
      </div>
    );
  }

  const slide = slides[currentIndex];
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === slides.length - 1;
  const progressPercent = slides.length > 1 ? (currentIndex / (slides.length - 1)) * 100 : 100;
  const quizSlides = slides.filter(candidate => candidate.kind === "quiz");
  const answeredCount = Object.keys(answers).length;
  const correctCount = Object.values(answers).filter(answer => answer.isCorrect).length;
  const quizScore = quizSlides.reduce((score, quizSlide) => (
    answers[quizSlide.questionIndex]?.isCorrect ? score + quizSlide.question.pointValue : score
  ), 0);
  const currentAnswer = slide.kind === "quiz" ? answers[slide.questionIndex] : undefined;

  const handleSelectOption = (optionIndex: number) => {
    if (slide.kind !== "quiz" || currentAnswer !== undefined) return;
    setAnswers(previous => ({
      ...previous,
      [slide.questionIndex]: {
        selectedIndex: optionIndex,
        isCorrect: slide.question.options[optionIndex].isCorrect,
      },
    }));
  };

  return (
    <div
      className={cn("flex flex-col min-h-screen select-none overflow-hidden transition-colors duration-300", bg, textPrimary)}
      style={{ fontFamily: 'Inter, sans-serif' }}
    >
      {/* ── Progress bar ── */}
      <div className={cn("fixed top-0 left-0 right-0 z-50 h-1", progTrack)}>
        <div
          className="h-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* ── Top HUD ── */}
      <header className="fixed top-1 left-0 right-0 z-40 flex items-center justify-between px-6 py-3 pointer-events-none">
        {/* Exit button */}
        <button
          className={cn(
            "pointer-events-auto flex items-center gap-2 backdrop-blur px-4 py-2 rounded-xl text-sm font-medium transition-all",
            hudBg, hudText
          )}
          onClick={() => navigate('/materials')}
          title={t('presentationView.exitBtn')}
        >
          <Icon name="close" className="w-4 h-4" />
          {t('presentationView.exitBtn')}
        </button>

        {/* Center: title + slide counter */}
        <div className="pointer-events-auto flex flex-col items-center gap-1">
          <span className={cn("text-sm font-semibold truncate max-w-xs text-center", textMuted)}>
            {note.title}
          </span>
          <button
            onClick={() => setIsThumbsOpen(p => !p)}
            className={cn("text-xs transition-colors", textMuted, "hover:opacity-100 opacity-70")}
          >
            {t('presentationView.slide')} {currentIndex + 1} / {slides.length}
          </button>
        </div>

        {/* Right: quiz progress or keyboard hint */}
        {quizSlides.length > 0 ? (
          <div className="pointer-events-auto flex items-center gap-2 bg-primary/10 text-primary px-3 py-2 rounded-full text-xs font-bold">
            <Icon name="quiz" className="w-4 h-4" />
            {answeredCount === quizSlides.length
              ? `${t('presentationView.quizScore')} ${quizScore}/100`
              : `${t('presentationView.quizProgress')} ${correctCount}/${answeredCount}`}
          </div>
        ) : (
          <div className={cn("text-xs hidden sm:block", hintText)}>
            ← → {t('presentationView.navigate')} · Esc {t('presentationView.exit')}
          </div>
        )}
      </header>

      {/* ── Slide panel thumbnails dropdown ── */}
      {isThumbsOpen && (
        <div className={cn(
          "fixed top-16 left-1/2 -translate-x-1/2 z-50 border rounded-2xl p-4 shadow-2xl max-w-sm w-full mx-4",
          thumbsPanel
        )}>
          <div className="flex flex-wrap gap-2 justify-center">
            {slides.map((s, i) => (
              <button
                key={i}
                onClick={() => { setCurrentIndex(i); setIsThumbsOpen(false); }}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-left transition-all w-full",
                  i === currentIndex
                    ? "bg-primary text-white font-bold"
                    : thumbItem
                )}
              >
                <span className="text-[10px] font-mono w-5 text-center opacity-60">{i + 1}</span>
                <span className="truncate">{s.heading || t('presentationView.coverSlide')}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Main Slide Content ── */}
      <main
        className="flex-1 flex flex-col items-center justify-center px-8 py-24 md:px-16 relative overflow-y-auto"
      >
        <div
          key={currentIndex}
          className="w-full max-w-5xl animate-[viewFadeIn_0.3s_ease-out]"
        >
          {/* Non-cover slide heading */}
          {!slide.isCover && slide.heading && (
            <div className="mb-8">
              <div className="inline-flex items-center gap-3 mb-4">
                <div className="w-8 h-0.5 bg-primary rounded-full" />
                <span className="text-primary text-sm font-bold uppercase tracking-widest">
                  {currentIndex + 1} / {slides.length}
                </span>
              </div>
              <h2 className={cn("text-4xl md:text-5xl font-black leading-tight tracking-tight", headingText)}>
                {slide.heading}
              </h2>
            </div>
          )}

          {/* Cover slide */}
          {slide.isCover && (
            <div className="mb-10 text-center">
              <div className="w-20 h-20 bg-primary/20 border border-primary/30 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <Icon name="menu_book" className="text-[40px] text-primary" />
              </div>
              <h1 className={cn("text-5xl md:text-6xl font-black leading-tight tracking-tight mb-2", headingText)}>
                {slide.heading}
              </h1>
            </div>
          )}

          {/* Slide body — Markdown rendered */}
          {slide.kind === "material" && slide.body && (
            // flow-root establishes a new BFC so floated images are properly contained
            <div className={cn(proseClass, "flow-root")}>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  // Unwrap paragraphs that contain only an image.
                  // react-markdown wraps <img> in <p>, creating invalid <p><figure> HTML.
                  // Browsers auto-correct this by ejecting the <figure> out of the <p>,
                  // which breaks the BFC and prevents text from wrapping the float.
                  p: ({ node, children, ...props }) => {
                    const onlyImage =
                      node?.children?.length === 1 &&
                      node.children[0].type === 'element' &&
                      (node.children[0] as { tagName?: string }).tagName === 'img';
                    return onlyImage ? <>{children}</> : <p {...props}>{children}</p>;
                  },
                  img: ({ src, alt }) => (
                    <MarkdownImage src={src} alt={alt} isDark={isDark} presentationMode />
                  )
                }}
              >
                {preprocessMarkdown(slide.body)}
              </ReactMarkdown>
            </div>
          )}

          {/* Interactive quiz embedded in the material sequence */}
          {slide.kind === "quiz" && (
            <div className="space-y-5 pb-20">
              {slide.question.questionMarkdown && (
                <div className={cn(proseClass, "max-w-none mb-7")}>
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      p: ({ node, children, ...props }) => {
                        const onlyImage =
                          node?.children?.length === 1 &&
                          node.children[0].type === 'element' &&
                          (node.children[0] as { tagName?: string }).tagName === 'img';
                        return onlyImage ? <>{children}</> : <p {...props}>{children}</p>;
                      },
                      img: ({ src, alt }) => (
                        <MarkdownImage src={src} alt={alt} isDark={isDark} presentationMode />
                      ),
                    }}
                  >
                    {preprocessMarkdown(slide.question.questionMarkdown)}
                  </ReactMarkdown>
                </div>
              )}

              <div className="grid gap-3">
                {slide.question.options.map((option, optionIndex) => {
                  const isSelected = currentAnswer?.selectedIndex === optionIndex;
                  const isRevealed = currentAnswer !== undefined;
                  return (
                    <button
                      key={optionIndex}
                      type="button"
                      disabled={isRevealed}
                      aria-pressed={isSelected}
                      onClick={() => handleSelectOption(optionIndex)}
                      className={cn(
                        "w-full flex items-center gap-4 rounded-2xl border-2 px-5 py-4 text-left transition-all",
                        !isRevealed && (isDark
                          ? "border-white/15 bg-white/5 hover:border-primary hover:bg-primary/10"
                          : "border-gray-200 bg-white hover:border-primary hover:bg-primary/5"),
                        isRevealed && option.isCorrect && "border-success bg-success/10",
                        isRevealed && isSelected && !option.isCorrect && "border-danger bg-danger/10",
                        isRevealed && !option.isCorrect && !isSelected && "opacity-50 border-gray-200 dark:border-white/10"
                      )}
                    >
                      <span className={cn(
                        "flex h-10 w-10 flex-none items-center justify-center rounded-xl font-bold",
                        isRevealed && option.isCorrect ? "bg-success text-white" :
                          isRevealed && isSelected ? "bg-danger text-white" :
                          isDark ? "bg-white/10 text-white" : "bg-gray-100 text-gray-700"
                      )}>
                        {OPTION_LETTERS[optionIndex] || optionIndex + 1}
                      </span>
                      <span className={cn("text-lg font-medium", headingText)}>{option.text}</span>
                      {isRevealed && option.isCorrect && <Icon name="check_circle" className="ml-auto text-success text-[28px]" />}
                      {isRevealed && isSelected && !option.isCorrect && <Icon name="cancel" className="ml-auto text-danger text-[28px]" />}
                    </button>
                  );
                })}
              </div>

              {currentAnswer && (
                <div className={cn(
                  "flex items-center gap-3 rounded-2xl border-2 px-5 py-4 text-lg font-bold",
                  currentAnswer.isCorrect
                    ? "border-success/30 bg-success/10 text-success"
                    : "border-danger/30 bg-danger/10 text-danger"
                )}>
                  <Icon name={currentAnswer.isCorrect ? "check_circle" : "cancel"} className="text-[28px]" />
                  <span>
                    {currentAnswer.isCorrect
                      ? t('quizView.answeredCorrectly').replace('{{pts}}', String(slide.question.pointValue))
                      : `${t('quizView.answeredWrong')} ${slide.question.options.find(option => option.isCorrect)?.text}`}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Cover: start prompt */}
          {slide.isCover && !slide.body && (
            <p className={cn("text-center text-lg mt-8 animate-pulse", textMuted)}>
              {t('presentationView.clickToStart')}
            </p>
          )}
        </div>
      </main>

      {/* Viewport-fixed edge gutters — outside slide content so zoom/scale cannot enlarge them. */}
      {slide.kind === "material" && (
        <div className="pointer-events-none fixed inset-0 z-30">
          {!isFirst && (
            <button
              type="button"
              aria-label={t('presentationView.prev')}
              onClick={goPrev}
              className={cn(
                "pointer-events-auto absolute left-0 top-12 bottom-0 cursor-w-resize group",
                "w-[clamp(3rem,4.5vw,4.5rem)]",
                "bg-transparent border-0 outline-none focus:outline-none"
              )}
            >
              <div className={cn(
                "absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-30 transition-opacity duration-300",
                isDark ? "text-white" : "text-gray-600"
              )}>
                <Icon name="chevron_left" className="w-8 h-8" />
              </div>
            </button>
          )}
          <button
            type="button"
            aria-label={isLast ? t('presentationView.finish') : t('presentationView.next')}
            onClick={isLast ? () => navigate('/materials') : goNext}
            className={cn(
              "pointer-events-auto absolute right-0 top-12 bottom-0 cursor-e-resize group",
              "w-[clamp(3rem,4.5vw,4.5rem)]",
              "bg-transparent border-0 outline-none focus:outline-none"
            )}
          >
            <div className={cn(
              "absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-30 transition-opacity duration-300",
              isDark ? "text-white" : "text-gray-600"
            )}>
              <Icon name={isLast ? "done_all" : "chevron_right"} className="w-8 h-8" />
            </div>
          </button>
        </div>
      )}

      {slide.kind === "quiz" && (
        <footer className={cn(
          "fixed bottom-0 left-0 right-0 z-40 flex items-center justify-between border-t px-6 py-4 backdrop-blur",
          isDark ? "border-white/10 bg-gray-900/90" : "border-gray-200 bg-white/90"
        )}>
          <button
            type="button"
            onClick={goPrev}
            disabled={isFirst}
            className="btn btn-ghost disabled:opacity-30"
          >
            <Icon name="arrow_back" className="w-5 h-5" />
            {t('presentationView.prev')}
          </button>
          {!currentAnswer && <span className={cn("text-sm", textMuted)}>{t('presentationView.answerToContinue')}</span>}
          <button
            type="button"
            disabled={!currentAnswer}
            onClick={isLast ? () => navigate('/materials') : goNext}
            className="btn btn-primary disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isLast ? t('presentationView.finish') : t('presentationView.next')}
            <Icon name={isLast ? "done_all" : "arrow_forward"} className="w-5 h-5" />
          </button>
        </footer>
      )}
    </div>
  );
}
