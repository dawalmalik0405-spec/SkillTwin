import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Brain,
  CheckCircle2,
  XCircle,
  Trophy,
  RotateCcw,
  ChevronRight,
  Loader2,
  PlayCircle,
  AlertCircle
} from 'lucide-react';
import { apiClient } from '../../shared/apiClient';

interface QuizOption {
  id: number;
  text: string;
}

interface QuizQuestion {
  id: string;
  question_text: string;
  options: QuizOption[];
  difficulty: string;
  skill_name: string;
}

interface QuizResult {
  question_id: string;
  is_correct: boolean;
  correct_answer_index: number;
  explanation: string | null;
}

interface QuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: string;
  skillName: string;
  userId: string;
  onQuizComplete: (passed: boolean, score: number) => void;
  userProfile?: any;
}

const PASSING_SCORE = 70;

export const QuizModal: React.FC<QuizModalProps> = ({
  isOpen,
  onClose,
  taskId,
  skillName,
  userId,
  userProfile,
  onQuizComplete
}) => {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [results, setResults] = useState<QuizResult[]>([]);
  const [scorePct, setScorePct] = useState(0);
  const [passed, setPassed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentQuestion = questions[currentQuestionIndex];
  const totalQuestions = questions.length;

  const userLevel = userProfile?.experience_level?.includes('Entry')
    ? 'beginner'
    : 'intermediate';

  const fetchQuiz = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiClient.getQuizQuestions(taskId, 5, userLevel);
      setQuestions(data.questions || []);
      if (!data.questions || data.questions.length === 0) {
        setError('No quiz questions are available for this skill yet.');
      }
    } catch (err) {
      console.error('[QuizModal] Failed to load quiz:', err);
      setError('Failed to load quiz questions. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [taskId, userLevel]);

  // Reset everything each time the modal opens so a retake never inherits the
  // previous attempt's answers or results.
  useEffect(() => {
    if (!isOpen) return;
    setQuestions([]);
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setAnswers({});
    setQuizStarted(false);
    setQuizCompleted(false);
    setResults([]);
    setScorePct(0);
    setPassed(false);
    setError(null);
    fetchQuiz();
  }, [isOpen, taskId, fetchQuiz]);

  const submitQuiz = async (finalAnswers: Record<string, number>) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const submissions = Object.entries(finalAnswers).map(
        ([question_id, selected_answer_index]) => ({
          question_id,
          selected_answer_index
        })
      );

      const data = await apiClient.validateQuiz(userId, taskId, submissions);

      setResults(data.results || []);
      setScorePct(data.score_percentage);
      setPassed(data.passed);
      setQuizCompleted(true);
      onQuizComplete(data.passed, data.score_percentage);
    } catch (err) {
      console.error('[QuizModal] Failed to submit quiz:', err);
      setError('Failed to submit quiz. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdvance = () => {
    if (selectedAnswer === null || !currentQuestion) return;

    const updated = { ...answers, [currentQuestion.id]: selectedAnswer };
    setAnswers(updated);

    if (currentQuestionIndex < totalQuestions - 1) {
      const nextIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIndex);
      // Restore a previously chosen answer if the user is revisiting.
      const saved = updated[questions[nextIndex]?.id];
      setSelectedAnswer(saved !== undefined ? saved : null);
    } else {
      // Grading happens server-side, so pass the freshly built map rather than
      // relying on the state update above having flushed.
      submitQuiz(updated);
    }
  };

  const handleBack = () => {
    if (currentQuestionIndex === 0) return;
    const prevIndex = currentQuestionIndex - 1;
    setCurrentQuestionIndex(prevIndex);
    const saved = answers[questions[prevIndex]?.id];
    setSelectedAnswer(saved !== undefined ? saved : null);
  };

  const handleRetryQuiz = () => {
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setAnswers({});
    setQuizStarted(false);
    setQuizCompleted(false);
    setResults([]);
    setScorePct(0);
    setPassed(false);
    setError(null);
    fetchQuiz();
  };

  const optionClass = (option: QuizOption): string => {
    const base = 'quiz-option';
    if (selectedAnswer === option.id) return `${base} quiz-option--selected`;
    return base;
  };

  const correctCount = results.filter(r => r.is_correct).length;

  if (!isOpen) return null;

  return createPortal(
    <div className="modal-backdrop">
      <div className="quiz-modal">
        <div className="quiz-head">
          <div className="quiz-head-top">
            <div>
              <div className="quiz-head-title">
                <Brain size={20} style={{ color: '#A78BFA' }} />
                {quizCompleted ? 'Quiz Results' : `Quiz: ${skillName}`}
              </div>
              <div className="quiz-head-sub">
                {quizCompleted
                  ? `${PASSING_SCORE}% needed to complete this step`
                  : quizStarted && totalQuestions > 0
                    ? `Question ${currentQuestionIndex + 1} of ${totalQuestions} · ${PASSING_SCORE}% to pass`
                    : `${PASSING_SCORE}% to pass`}
              </div>
            </div>
            <button
              type="button"
              className="quiz-close"
              onClick={onClose}
              aria-label="Close quiz"
            >
              <X size={18} />
            </button>
          </div>

          {quizStarted && !quizCompleted && totalQuestions > 0 && (
            <>
              <div className="quiz-progress-track">
                <div
                  className="quiz-progress-fill"
                  style={{
                    width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%`
                  }}
                />
              </div>
              <div className="quiz-progress-meta">
                <span>{Object.keys(answers).length} answered</span>
                <span>{totalQuestions - currentQuestionIndex - 1} remaining</span>
              </div>
            </>
          )}
        </div>

        <div className="quiz-body">
          {isLoading && (
            <div className="quiz-state">
              <Loader2 size={40} className="vr-spin" style={{ color: '#A78BFA' }} />
              <p>Building your {skillName} quiz...</p>
            </div>
          )}

          {!isLoading && error && (
            <div className="quiz-state">
              <AlertCircle size={40} style={{ color: '#F87171' }} />
              <p style={{ color: '#FCA5A5' }}>{error}</p>
              <button type="button" className="btn btn-primary" onClick={fetchQuiz}>
                Try Again
              </button>
            </div>
          )}

          {/* Pre-quiz screen */}
          {!isLoading && !error && !quizStarted && !quizCompleted && questions.length > 0 && (
            <div className="quiz-result">
              <PlayCircle size={54} style={{ color: '#A78BFA' }} />
              <h3 className="quiz-result-title">
                Ready to test your {skillName} knowledge?
              </h3>
              <p className="quiz-result-msg">
                Answer {totalQuestions} questions to complete this step. You need{' '}
                {PASSING_SCORE}% to pass and unlock the next skill. Your answers are
                graded on the server once you finish.
              </p>
              <div className="quiz-result-actions">
                <button type="button" className="btn btn-outline" onClick={onClose}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setQuizStarted(true)}
                >
                  Start Quiz
                </button>
              </div>
            </div>
          )}

          {/* Question screen */}
          {!isLoading && !error && quizStarted && !quizCompleted && currentQuestion && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <span className="badge">{currentQuestion.difficulty}</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  {currentQuestion.skill_name}
                </span>
              </div>

              <h3 className="quiz-question">{currentQuestion.question_text}</h3>

              <div className="quiz-options">
                {currentQuestion.options.map((option, index) => (
                  <button
                    type="button"
                    key={option.id}
                    className={optionClass(option)}
                    onClick={() => setSelectedAnswer(option.id)}
                  >
                    <span className="quiz-option-key">
                      {String.fromCharCode(65 + index)}
                    </span>
                    <span className="quiz-option-text">{option.text}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Results screen */}
          {!isLoading && !error && quizCompleted && (
            <div className="quiz-result">
              <div
                className={`quiz-result-ring quiz-result-ring--${passed ? 'pass' : 'fail'}`}
              >
                <span className="quiz-result-score">{Math.round(scorePct)}%</span>
                <span className="quiz-result-of">
                  {correctCount}/{results.length || totalQuestions} correct
                </span>
              </div>

              <h3 className="quiz-result-title">
                {passed ? 'Passed — skill complete!' : 'Not quite yet'}
              </h3>
              <p className="quiz-result-msg">
                {passed
                  ? `You scored ${Math.round(scorePct)}% on ${skillName}. This step is marked complete and the next one is unlocked.`
                  : `You scored ${Math.round(scorePct)}%, and ${PASSING_SCORE}% is needed to pass. Review the explanations below and try again.`}
              </p>

              {results.length > 0 && (
                <div className="quiz-review">
                  {results.map((result, index) => {
                    const question = questions.find(q => q.id === result.question_id);
                    const correctOption = question?.options.find(
                      o => o.id === result.correct_answer_index
                    );
                    return (
                      <div className="quiz-review-row" key={result.question_id}>
                        {result.is_correct ? (
                          <CheckCircle2
                            size={17}
                            style={{ color: '#34D399', flexShrink: 0, marginTop: '2px' }}
                          />
                        ) : (
                          <XCircle
                            size={17}
                            style={{ color: '#F87171', flexShrink: 0, marginTop: '2px' }}
                          />
                        )}
                        <div>
                          <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                            Q{index + 1}. {question?.question_text ?? 'Question'}
                          </div>
                          {!result.is_correct && correctOption && (
                            <div style={{ color: '#6EE7B7', marginTop: '3px' }}>
                              Correct answer: {correctOption.text}
                            </div>
                          )}
                          {result.explanation && (
                            <div style={{ marginTop: '3px' }}>{result.explanation}</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="quiz-result-actions">
                <button type="button" className="btn btn-outline" onClick={onClose}>
                  Close
                </button>
                <button type="button" className="btn btn-primary" onClick={handleRetryQuiz}>
                  <RotateCcw size={16} />
                  {passed ? 'Retake Quiz' : 'Try Again'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer navigation, only while answering */}
        {!isLoading && !error && quizStarted && !quizCompleted && currentQuestion && (
          <div className="quiz-foot">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={handleBack}
              disabled={currentQuestionIndex === 0}
            >
              Back
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleAdvance}
              disabled={selectedAnswer === null || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="vr-spin" />
                  Grading...
                </>
              ) : currentQuestionIndex < totalQuestions - 1 ? (
                <>
                  Next Question
                  <ChevronRight size={16} />
                </>
              ) : (
                <>
                  <Trophy size={16} />
                  Submit Quiz
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default QuizModal;
