// src/components/scan/ScanDialog.tsx
import { useState, useRef, useEffect, useMemo } from 'react';
import { Camera, Upload, Loader2, RefreshCw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { scanApi } from '@/services/api';
import { ScanResultCard } from './ScanResultCard';
import { PhotoTips, SPECIES_SCAN_TIPS } from './PhotoTips';
import { CameraFrameGuide } from './CameraFrameGuide';
import { toast } from 'sonner';
import type { SpeciesScanResult } from '@/types';
import { useTranslation } from 'react-i18next';
import { useImageCapture } from '@/hooks/useImageCapture';

const MAX_FILE_SIZE_MB = 10;
const LOADING_STEPS_KEYS = ['scan.uploading', 'scan.identifying', 'scan.fetchingCare', 'scan.almostReady'];

interface ScanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ScanDialog({ open, onOpenChange }: ScanDialogProps) {
  const [step, setStep] = useState<'select' | 'preview' | 'scanning' | 'result'>('select');
  const [stepIndex, setStepIndex] = useState(0);
  const [result, setResult] = useState<SpeciesScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation();
  const { prepareImage, createSignal, cancel } = useImageCapture();

  // Preview URL (memoised, revoked on cleanup)
  const previewUrl = useMemo(() => {
    if (selectedFile) return URL.createObjectURL(selectedFile);
    return null;
  }, [selectedFile]);

  useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
  }, [previewUrl]);

  const loadingSteps = useMemo(() => LOADING_STEPS_KEYS.map(key => t(key)), [t]);

  useEffect(() => {
    if (step !== 'scanning') return;
    const interval = setInterval(() => {
      setStepIndex((i) => Math.min(i + 1, loadingSteps.length - 1));
    }, 1800);
    return () => clearInterval(interval);
  }, [step, loadingSteps.length]);

  // ── File validation + preview ──
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so re-selecting same file triggers onChange
    e.target.value = '';

    // Size guard
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      toast.error(t('scan.fileTooLarge'));
      return;
    }

    setSelectedFile(file);
    setError(null);
    setStep('preview');
  };

  // ── Start scan from preview ──
  const handleScan = async () => {
    if (!selectedFile) return;
    setStep('scanning');
    setStepIndex(0);
    setError(null);

    try {
      const compressed = await prepareImage(selectedFile);
      const signal = createSignal();
      const response = await scanApi.identifySpecies(compressed, { signal });
      setResult(response.data);
      setStep('result');
    } catch (err: any) {
      if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED' || err.message === 'canceled') {
        return;
      }
      const errorMessage = err.response?.data?.detail || 'Scan failed. Please try again.';
      setError(errorMessage);
      toast.error(errorMessage);
      setStep('select');
    }
  };

  const handleRetake = () => {
    setSelectedFile(null);
    setError(null);
    setStep('select');
  };

  const handleClose = () => {
    cancel();
    setStep('select');
    setResult(null);
    setError(null);
    setSelectedFile(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-headline text-headline-lg-mobile text-primary">
            {step === 'select' && t('scan.identify')}
            {step === 'preview' && t('scan.previewTitle')}
            {step === 'scanning' && t('scan.analyzing')}
            {step === 'result' && t('scan.identified')}
          </DialogTitle>
        </DialogHeader>

        {/* ── Step 1: Select image ── */}
        {step === 'select' && (
          <div className="flex flex-col gap-4 py-4">
            {error && (
              <p className="text-destructive text-body-md text-sm text-center">{error}</p>
            )}
            <p className="text-body-md text-muted-foreground text-center">
              {t('scan.identifyDescription')}
            </p>

            {/* Photo tips — shown during selection */}
            <PhotoTips tips={SPECIES_SCAN_TIPS} />

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 h-24 flex-col gap-2 rounded-xl"
                onClick={() => {
                  cameraInputRef.current?.click();
                }}
              >
                <Camera className="h-6 w-6 text-primary" />
                <span className="text-label-sm">{t('scan.camera')}</span>
              </Button>
              <Button
                variant="outline"
                className="flex-1 h-24 flex-col gap-2 rounded-xl"
                onClick={() => {
                  galleryInputRef.current?.click();
                }}
              >
                <Upload className="h-6 w-6 text-primary" />
                <span className="text-label-sm">{t('scan.gallery')}</span>
              </Button>
            </div>
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              multiple={false}
              className="hidden"
              onChange={handleInputChange}
            />
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple={false}
              className="hidden"
              onChange={handleInputChange}
            />
          </div>
        )}

        {/* ── Step 2: Preview ── */}
        {step === 'preview' && previewUrl && (
          <div className="flex flex-col gap-4 py-4">
            {/* Thumbnail with CameraFrameGuide overlay */}
            <div className="relative aspect-[4/3] w-full max-w-sm mx-auto rounded-xl overflow-hidden border border-border/50 bg-muted flex items-center justify-center shadow-inner">
              <img
                src={previewUrl}
                alt="Preview"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 pointer-events-none">
                <CameraFrameGuide />
              </div>
            </div>

            {/* Tips reminder */}
            <PhotoTips tips={SPECIES_SCAN_TIPS} compact />

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 rounded-xl gap-2"
                onClick={handleRetake}
              >
                <RefreshCw className="h-4 w-4" />
                {t('scan.retake')}
              </Button>
              <Button
                className="flex-1 rounded-xl gap-2"
                onClick={handleScan}
              >
                <Camera className="h-4 w-4" />
                {t('scan.scanNow')}
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 3: Scanning ── */}
        {step === 'scanning' && (
          <div className="flex flex-col items-center py-12 gap-4">
            <Loader2 className="h-12 w-12 text-primary animate-spin" />
            <p className="text-body-md text-muted-foreground">
              {loadingSteps[stepIndex]}
            </p>
          </div>
        )}

        {/* ── Step 4: Result ── */}
        {step === 'result' && result && (
          <ScanResultCard result={result} onClose={handleClose} />
        )}
      </DialogContent>
    </Dialog>
  );
}
