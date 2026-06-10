// src/components/scan/PhotoTips.tsx
//
// Reusable photo tips panel for scan dialogs.
// Accepts a `tips` prop (array of i18n keys) so each dialog
// can show only the relevant subset of tips.

import { memo } from 'react';
import { Lightbulb, Check, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface PhotoTipsProps {
  /** Array of i18n key suffixes, e.g. ['photoTip1', 'photoTip2'] */
  tips: string[];
  compact?: boolean;
}

const tipEmojis = ['🔍', '☀️', '🖼️', '🎯', '📸'];

const DO_DONT = [
  { type: 'do', key: 'scan.tipDo1' },
  { type: 'dont', key: 'scan.tipDont1' },
  { type: 'dont', key: 'scan.tipDont2' },
];

export const PhotoTips = memo(function PhotoTips({ tips, compact = false }: PhotoTipsProps) {
  const { t } = useTranslation();
  const displayedTips = compact ? tips.slice(0, 2) : tips;

  return (
    <div className={compact
      ? 'bg-accent/10 rounded-lg p-2.5 border border-border/20'
      : 'bg-accent/20 rounded-xl p-4 border border-border/30'
    }>
      {!compact && (
        <div className="flex items-center gap-2 mb-2.5">
          <Lightbulb className="h-4 w-4 text-amber-500" />
          <span className="text-label-sm font-semibold text-primary">
            {t('scan.photoTipsTitle')}
          </span>
        </div>
      )}
      <ul className="flex flex-col gap-1.5">
        {displayedTips.map((key, i) => (
          <li key={key} className="flex items-start gap-2 text-[13px] text-muted-foreground leading-snug">
            <span className="shrink-0 mt-px">{tipEmojis[i % tipEmojis.length]}</span>
            <span>{t(`scan.${key}`)}</span>
          </li>
        ))}
      </ul>

      {!compact && (
        <div className="flex flex-wrap gap-1.5 mt-2.5">
          {DO_DONT.map(({ type, key }) => {
            const Icon = type === 'do' ? Check : X;
            return (
              <span key={key} className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border font-medium
                ${type === 'do'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50'
                  : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/50'}`}>
                <Icon className="h-3 w-3 shrink-0" />
                {t(key)}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
});

/** Tips for species identification (no "affected area" tip) */
export const SPECIES_SCAN_TIPS = ['photoTipSpecies', 'photoTipNoMulti', 'photoTip2', 'photoTip5'];

/** Tips for health check / disease scan (includes all tips) */
export const HEALTH_CHECK_TIPS = ['photoTip1', 'photoTip2', 'photoTip3', 'photoTip4', 'photoTip5'];
