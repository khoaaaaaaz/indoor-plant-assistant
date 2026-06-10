// src/components/scan/DiseaseLogCard.tsx
import { useState } from 'react';
import { AlertTriangle, CheckCircle, Check, Loader2, Star, Calendar, Clock, MessageSquare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { diseaseLogApi } from '@/services/api';
import { toast } from 'sonner';
import type { DiseaseLog } from '@/types';
import { useTranslation } from 'react-i18next';
import { translateDisease } from '@/lib/translate';

interface DiseaseLogCardProps {
  log: DiseaseLog;
  isLatest?: boolean; // First entry gets primary styling
  onResolved?: (logId: number) => void; // Callback after resolving + feedback submission
}

export function DiseaseLogCard({ log, isLatest = false, onResolved }: DiseaseLogCardProps) {
  const { t, i18n } = useTranslation();
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [score, setScore] = useState<number>(5); // default to 5 (fully recovered)
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isHealthy = !log.disease_name;
  const isResolved = !!log.resolved_at;

  const scanDate = new Date(log.scanned_at).toLocaleDateString(
    i18n.language === 'vi' ? 'vi-VN' : 'en-US',
    { month: 'short', day: 'numeric', year: 'numeric' }
  );

  const resolvedDate = log.resolved_at
    ? new Date(log.resolved_at).toLocaleDateString(
        i18n.language === 'vi' ? 'vi-VN' : 'en-US',
        { month: 'short', day: 'numeric', year: 'numeric' }
      )
    : null;

  // ─── Calculate Active Treatment Countdown ───
  const expectedDate = log.expected_resolve_date
    ? new Date(new Date(log.expected_resolve_date).setHours(0, 0, 0, 0))
    : null;
  const today = new Date(new Date().setHours(0, 0, 0, 0));

  const daysRemaining = expectedDate
    ? Math.max(0, Math.ceil((expectedDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  const handleResolveAndFeedback = async () => {
    setSubmitting(true);
    try {
      // 1. Resolve first
      await diseaseLogApi.resolve(log.id);
      
      // 2. Submit rating feedback
      await diseaseLogApi.submitFeedback(log.id, score, note.trim() || undefined);
      
      toast.success(t('disease.feedbackSuccess'));
      
      setShowFeedbackForm(false);
      onResolved?.(log.id);
    } catch (err) {
      console.error('Failed to submit feedback:', err);
      toast.error(t('disease.feedbackError'));
    } finally {
      setSubmitting(false);
    }
  };

  const getScoreText = (s: number) => {
    switch (s) {
      case 1: 
        return t('disease.score1Desc');
      case 2: 
        return t('disease.score2Desc');
      case 3: 
        return t('disease.score3Desc');
      case 4: 
        return t('disease.score4Desc');
      case 5: 
        return t('disease.score5Desc');
      default: 
        return '';
    }
  };

  const scoreEmojis = ['😞', '🙁', '😐', '🙂', '🎉'];
  const scoreLabels = [
    t('disease.score1'),
    t('disease.score2'),
    t('disease.score3'),
    t('disease.score4'),
    t('disease.score5'),
  ];

  return (
    <div className="relative">
      {/* Timeline dot */}
      <div className={`absolute -left-[21px] top-1 w-3 h-3 rounded-full ring-4 ring-card ${isLatest
        ? (isHealthy ? 'bg-secondary' : isResolved ? 'bg-secondary' : 'bg-destructive')
        : isResolved ? 'bg-secondary/50' : 'bg-muted-foreground/30'
        }`} />

      <div className="flex flex-col md:flex-row gap-2 md:gap-8">
        {/* Date */}
        <div className="md:w-32 shrink-0 pt-0.5">
          <p className="text-label-sm text-muted-foreground">{scanDate}</p>
        </div>

        {/* Content */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            {isHealthy ? (
              <CheckCircle className="h-4 w-4 text-secondary shrink-0" />
            ) : isResolved ? (
              <CheckCircle className="h-4 w-4 text-secondary shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
            )}
            <p className={`text-body-lg font-medium ${isResolved ? 'text-muted-foreground line-through' : 'text-primary'}`}>
              {log.disease_name
                ? translateDisease(log.disease_name, t)
                : t('diseases.Healthy', 'Healthy')}
            </p>
            {isResolved && (
              <Badge variant="outline" className="text-[10px] py-0 bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50">
                ✅ {t('disease.resolved', 'Resolved')} {resolvedDate}
              </Badge>
            )}
          </div>

          {/* Confidence + environment */}
          <div className="flex flex-wrap gap-1.5 mt-1">
            {log.confidence && (
              <Badge variant="outline" className={`text-[11px] py-0 font-semibold border ${
                log.confidence >= 0.8
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50'
                  : log.confidence >= 0.6
                  ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/50'
                  : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/50'
              }`}>
                {Math.round(log.confidence * 100)}% {t('scan.confidence', 'confidence')}
              </Badge>
            )}
            {log.env_temperature && (
              <Badge variant="outline" className="text-[11px] py-0">
                🌡️ {log.env_temperature}°C
              </Badge>
            )}
            {log.env_humidity && (
              <Badge variant="outline" className="text-[11px] py-0">
                💧 {log.env_humidity}%
              </Badge>
            )}
          </div>

          {/* Species-disease affinity warning */}
          {log.species_affinity_warning && !isResolved && (
            <div className="mt-2 flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 p-3">
              <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-800 dark:text-amber-300 font-medium">
                {log.species_affinity_warning}
              </p>
            </div>
          )}

          {/* Care adjustments summary */}
          {log.care_adjustments?.notes && !isResolved && (
            <div className="mt-2 text-[12px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-lg px-3 py-1.5">
              ⚡ {log.care_adjustments.notes}
            </div>
          )}

          {/* Treatment duration countdown & indicators */}
          {log.treatment_duration_days && !isHealthy && (
            <div className="mt-3 flex flex-col gap-1.5 p-3.5 bg-muted/30 border border-border/40 rounded-xl">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                <span>
                  {t('disease.treatmentDuration', { days: log.treatment_duration_days })}
                </span>
              </div>
              
              {!isResolved && expectedDate && (
                <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                  <Clock className="h-3.5 w-3.5 text-primary" />
                  <span>
                    {daysRemaining > 0 ? (
                      t('disease.treatmentRemaining', { days: daysRemaining })
                    ) : (
                      t('disease.treatmentComplete')
                    )}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Treatment recommendation */}
          {log.treatment_recommendation && (
            <details className="mt-2" open={isLatest && !isResolved}>
              <summary className="text-label-sm text-primary cursor-pointer hover:underline">
                {t('scan.treatmentAdvice')}
              </summary>
              <p className="text-body-md text-sm text-muted-foreground mt-1 whitespace-pre-line">
                {log.treatment_recommendation}
              </p>
            </details>
          )}

          {/* Active Treatment Feedback Form */}
          {!isHealthy && !isResolved && showFeedbackForm && (
            <div className="mt-3 p-4 bg-emerald-50/40 border border-emerald-100/50 rounded-2xl flex flex-col gap-3">
              <span className="text-label-sm font-semibold text-primary">
                {t('disease.rateTitle')}
              </span>
              
              {/* Star / Emoji Selector */}
              <div className="grid grid-cols-5 gap-2">
                {scoreEmojis.map((emoji, index) => {
                  const currentScore = index + 1;
                  const isSelected = score === currentScore;
                  return (
                    <button
                      key={currentScore}
                      onClick={() => setScore(currentScore)}
                      className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all duration-200 ${
                        isSelected
                          ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-800 scale-105 shadow-sm ring-1 ring-emerald-500/30'
                          : 'bg-card border-border/40 text-muted-foreground hover:bg-muted/50'
                      }`}
                    >
                      <span className="text-xl mb-1">{emoji}</span>
                      <span className="text-[10px] font-medium leading-none">{scoreLabels[index]}</span>
                    </button>
                  );
                })}
              </div>

              {/* Note field */}
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" />
                  {t('disease.treatmentNotes')}
                </span>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={t('disease.treatmentNotesPlaceholder')}
                  className="w-full text-xs p-2 rounded-lg border border-border/40 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 bg-card min-h-[60px]"
                />
              </div>

              {/* Form Buttons */}
              <div className="flex gap-2 justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFeedbackForm(false)}
                  disabled={submitting}
                  className="rounded-full text-xs text-muted-foreground"
                >
                  {t('disease.cancel')}
                </Button>
                <Button
                  size="sm"
                  onClick={handleResolveAndFeedback}
                  disabled={submitting}
                  className="rounded-full text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-sm"
                >
                  {submitting ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Check className="h-3 w-3" />
                  )}
                  {t('disease.submit')}
                </Button>
              </div>
            </div>
          )}

          {/* Historical Feedback Display (when resolved) */}
          {isResolved && log.feedback_score && (
            <div className="mt-3 p-3 bg-muted/40 border border-border/20 rounded-xl flex flex-col gap-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center text-amber-500">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star 
                      key={i} 
                      className={`h-3.5 w-3.5 ${i < (log.feedback_score || 0) ? 'fill-current text-amber-400' : 'text-muted-foreground/30'}`} 
                    />
                  ))}
                </div>
                <span className="text-label-sm font-semibold text-primary">
                  {getScoreText(log.feedback_score)}
                </span>
              </div>
              {log.feedback_note && (
                <div className="relative pl-3.5 py-0.5 border-l-2 border-primary/20 text-xs italic text-muted-foreground leading-relaxed">
                  “{log.feedback_note}”
                </div>
              )}
            </div>
          )}

          {/* Resolve / Action Trigger Button */}
          {!isHealthy && !isResolved && !showFeedbackForm && (
            <Button
              variant="outline"
              size="sm"
              className="mt-3 rounded-full gap-1.5 text-emerald-700 border-emerald-200 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-900/50 dark:hover:bg-emerald-950/30"
              onClick={() => setShowFeedbackForm(true)}
            >
              <Check className="h-3.5 w-3.5" />
              {daysRemaining > 0 ? (
                t('disease.resolveEarly')
              ) : (
                t('disease.markResolvedRate')
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
