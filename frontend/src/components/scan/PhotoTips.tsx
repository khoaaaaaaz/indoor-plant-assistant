// src/components/scan/PhotoTips.tsx
//
// Reusable photo tips panel for scan dialogs.
// Accepts a `tips` prop (array of i18n keys) so each dialog
// can show only the relevant subset of tips.

import { Lightbulb } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface PhotoTipsProps {
  /** Array of i18n key suffixes, e.g. ['photoTip1', 'photoTip2'] */
  tips: string[];
}

const tipEmojis = ['🔍', '☀️', '🖼️', '🎯', '📸'];

export function PhotoTips({ tips }: PhotoTipsProps) {
  const { t } = useTranslation();

  return (
    <div className="bg-accent/20 rounded-xl p-4 border border-border/30">
      <div className="flex items-center gap-2 mb-2.5">
        <Lightbulb className="h-4 w-4 text-amber-500" />
        <span className="text-label-sm font-semibold text-primary">
          {t('scan.photoTipsTitle')}
        </span>
      </div>
      <ul className="flex flex-col gap-1.5">
        {tips.map((key, i) => (
          <li key={key} className="flex items-start gap-2 text-[13px] text-muted-foreground leading-snug">
            <span className="shrink-0 mt-px">{tipEmojis[i % tipEmojis.length]}</span>
            <span>{t(`scan.${key}`)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Tips for species identification (no "affected area" tip) */
export const SPECIES_SCAN_TIPS = ['photoTip1', 'photoTip2', 'photoTip3', 'photoTip5'];

/** Tips for health check / disease scan (includes all tips) */
export const HEALTH_CHECK_TIPS = ['photoTip1', 'photoTip2', 'photoTip3', 'photoTip4', 'photoTip5'];
