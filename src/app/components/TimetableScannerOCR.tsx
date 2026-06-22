/**
 * TimetableScannerOCR - AI-based timetable image scanner
 * Uploads an image, sends it to the Vision proxy, receives structured timetable data,
 * and opens the existing editable preview.
 */

import React, { useState, useRef, useCallback } from 'react';
import {
  Upload,
  X,
  Loader2,
  Scan,
  RotateCcw,
  ImageIcon,
  AlertCircle,
} from 'lucide-react';
import { Button } from './Button';
import { toast } from 'sonner';
import { DayId, SubjectV2, ClassEntry } from '@/types';
import {
  validateFile,
  performAIOCR,
  GeminiRawResponse,
  extractGeminiRetrySeconds,
} from '@/utils/aiOcrService';
import { convertGeminiResponseToFinalTimetableData } from '@/utils/geminiAdapter';
import {
  TimetableEditablePreview,
  EditableTimetableData,
  FinalTimetableData,
} from './TimetableEditablePreview';

/**
 * Output interface for the scanner component
 */
export interface ScannedTimetableResult {
  days: Record<DayId, { totalPeriods: number }>;
  subjects: SubjectV2[];
  timetable: Record<DayId, ClassEntry[]>;
}

interface TimetableScannerOCRProps {
  onScanComplete: (data: ScannedTimetableResult) => void;
  onClose: () => void;
  existingSubjects: SubjectV2[];
}

type ProcessingStage = 'idle' | 'uploading' | 'processing' | 'preview' | 'error';

const emptyEditableTimetable = (): Record<DayId, string[]> => ({
  Mon: [], Tue: [], Wed: [], Thu: [], Fri: [], Sat: [], Sun: [],
});

const DEBUG_GEMINI = import.meta.env.VITE_GEMINI_DEBUG !== 'false';

const loadImageMeta = (dataUrl: string): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.width, height: img.height });
    img.onerror = () => reject(new Error('Failed to load image metadata'));
    img.src = dataUrl;
  });
};

const computeExtractionReport = (finalData: FinalTimetableData) => {
  const dayCount = Object.values(finalData.days).filter((day) => day.totalPeriods > 0).length;
  const subjectCount = finalData.subjects.length;
  const periodCount = Object.values(finalData.timetable).reduce((sum, entries) => {
    return sum + entries.reduce((periodSum, entry) => periodSum + entry.duration, 0);
  }, 0);

  const dayAccuracy = Math.round((dayCount / 7) * 100);
  const subjectAccuracy = Math.min(100, 50 + subjectCount * 5);
  const periodAccuracy = Math.min(100, periodCount > 0 ? 60 + Math.min(periodCount, 20) * 2 : 0);

  return {
    dayAccuracy,
    subjectAccuracy,
    periodAccuracy,
    dayCount,
    subjectCount,
    periodCount,
  };
};

const convertFinalToEditable = (finalData: FinalTimetableData): EditableTimetableData => {
  const editable: EditableTimetableData = {
    days: finalData.days,
    timetable: emptyEditableTimetable(),
    subjects: finalData.subjects.map((subject) => subject.name),
  };

  (Object.keys(finalData.days) as DayId[]).forEach((day) => {
    const totalPeriods = finalData.days[day]?.totalPeriods ?? 0;
    const slots = Array.from({ length: totalPeriods }, () => '');

    (finalData.timetable[day] || []).forEach((entry) => {
      const subject = finalData.subjects.find((item) => item.id === entry.subjectId);
      const subjectName = subject?.name || 'Unknown';

      for (let offset = 0; offset < entry.duration; offset += 1) {
        const index = entry.startPeriod - 1 + offset;
        if (index >= 0 && index < slots.length) {
          slots[index] = subjectName;
        }
      }
    });

    editable.timetable[day] = slots;
  });

  return editable;
};

export const TimetableScannerOCR: React.FC<TimetableScannerOCRProps> = ({
  onScanComplete,
  onClose,
  existingSubjects,
}) => {
  const [stage, setStage] = useState<ProcessingStage>('idle');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retryAfterSeconds, setRetryAfterSeconds] = useState<number | null>(null);
  const [parsedData, setParsedData] = useState<EditableTimetableData | null>(null);
  const [parseConfidence, setParseConfidence] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const error = validateFile(file);
    if (error) {
      toast.error(error.message);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      setImagePreview(e.target?.result as string);
      setSelectedFile(file);
      setStage('idle');
      setErrorMessage(null);
      setParsedData(null);
      setProgress(0);
      setStatusText('');
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (!file) return;

    const error = validateFile(file);
    if (error) {
      toast.error(error.message);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      setImagePreview(e.target?.result as string);
      setSelectedFile(file);
      setStage('idle');
      setErrorMessage(null);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const processImage = useCallback(async () => {
    if (!imagePreview) return;

    setStage('processing');
    setProgress(0);
    setStatusText('Sending image to Gemini Vision...');
    setErrorMessage(null);
    setRetryAfterSeconds(null);

    try {
      if (DEBUG_GEMINI) {
        const imageMeta = await loadImageMeta(imagePreview);
        console.log('[Gemini Debug] image upload', {
          fileName: selectedFile?.name,
          fileType: selectedFile?.type,
          fileSizeBytes: selectedFile?.size,
          dataUrlLength: imagePreview.length,
          imageWidth: imageMeta.width,
          imageHeight: imageMeta.height,
        });
      }

      const geminiResp: GeminiRawResponse = await performAIOCR(imagePreview, { timeoutMs: 120000 });

      if (DEBUG_GEMINI) {
        console.log('[Gemini Debug] raw Gemini response', geminiResp);
      }

      const finalData = convertGeminiResponseToFinalTimetableData(geminiResp);
      const editableData = convertFinalToEditable(finalData);

      if (DEBUG_GEMINI) {
        console.log('[Gemini Debug] generated FinalTimetableData', finalData);
        console.log('[Gemini Debug] generated EditableTimetableData', editableData);
        console.log('[Gemini Debug] extraction report', {
          ...computeExtractionReport(finalData),
          parseConfidence: geminiResp.parseConfidence ?? 0,
          confidenceVisualization:
            (geminiResp.parseConfidence ?? 0) >= 90
              ? 'normal'
              : (geminiResp.parseConfidence ?? 0) >= 70
                ? 'warning'
                : 'highlight',
        });
      }

      setParseConfidence(geminiResp.parseConfidence ?? 100);
      setParsedData(editableData);
      setStage('preview');

      const totalPeriods = Object.values(finalData.days).reduce((sum, d) => sum + d.totalPeriods, 0);
      toast.success(`AI parsed ${finalData.subjects.length} subjects across ${totalPeriods} periods`);
    } catch (error) {
      console.error('[Scanner] AI Error:', error);
      const message = error instanceof Error ? error.message : 'Processing failed. Please try again.';
      setStage('error');
      setErrorMessage(message);
      setRetryAfterSeconds(extractGeminiRetrySeconds(message));
      toast.error('Failed to process timetable via Gemini Vision');
    }
  }, [imagePreview, selectedFile]);

  const handlePreviewConfirm = useCallback((finalData: FinalTimetableData) => {
    onScanComplete(finalData);
    toast.success('Timetable ready to save!');
  }, [onScanComplete]);

  const handleClear = useCallback(() => {
    setImagePreview(null);
    setSelectedFile(null);
    setStage('idle');
    setProgress(0);
    setStatusText('');
    setErrorMessage(null);
    setParsedData(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  if (stage === 'preview' && parsedData) {
    return (
      <TimetableEditablePreview
        data={parsedData}
        existingSubjects={existingSubjects}
        onConfirm={handlePreviewConfirm}
        onCancel={() => setStage('idle')}
        parseConfidence={parseConfidence}
      />
    );
  }

  const isProcessing = stage === 'processing';

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-bg-primary rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-text-primary">
            Scan Timetable (Gemini Vision)
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-bg-muted rounded-lg"
            disabled={isProcessing}
          >
            <X className="w-5 h-5 text-text-muted" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {!imagePreview ? (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-text-muted transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-12 h-12 mx-auto mb-3 text-text-muted" />
              <p className="text-text-primary font-medium">Upload Timetable Image</p>
              <p className="text-sm text-text-muted mt-1">Click or drag and drop</p>
              <p className="text-xs text-text-muted mt-2">Supports: JPG, PNG, WEBP, BMP (max 10MB)</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative rounded-xl overflow-hidden border border-border">
                <img
                  src={imagePreview}
                  alt="Timetable preview"
                  className="w-full h-auto max-h-64 object-contain bg-bg-secondary"
                />
                {!isProcessing && (
                  <button
                    onClick={handleClear}
                    className="absolute top-2 right-2 p-2 bg-bg-primary/80 hover:bg-bg-primary rounded-lg"
                  >
                    <X className="w-4 h-4 text-text-primary" />
                  </button>
                )}
              </div>

              {isProcessing && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 text-accent animate-spin" />
                    <span className="text-sm text-text-secondary">{statusText}</span>
                  </div>
                  <div className="h-2 bg-bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-accent transition-all duration-300" style={{ width: `${progress}%` }} />
                  </div>
                  <p className="text-xs text-text-muted text-center">{progress}% complete</p>
                </div>
              )}

              {stage === 'error' && errorMessage && (
                <div className="bg-danger/10 border border-danger/20 rounded-lg p-3 space-y-3">
                  <div className="flex gap-2">
                    <AlertCircle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-text-primary font-medium">Processing Failed</p>
                      <p className="text-sm text-text-secondary mt-1">{errorMessage}</p>
                      {retryAfterSeconds && (
                        <p className="text-xs text-text-muted mt-2">
                          Suggested wait: {retryAfterSeconds} seconds
                        </p>
                      )}
                    </div>
                  </div>
                  <Button variant="secondary" onClick={processImage} className="w-full">
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Retry Scan
                  </Button>
                </div>
              )}
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/bmp"
            onChange={handleFileSelect}
            className="hidden"
          />

          <div className="flex gap-2">
            {imagePreview ? (
              <>
                <Button
                  variant="secondary"
                  onClick={handleClear}
                  disabled={isProcessing}
                  className="flex-1"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Clear
                </Button>
                <Button
                  onClick={processImage}
                  disabled={isProcessing}
                  className="flex-1"
                >
                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Scan className="w-4 h-4 mr-2" />
                  )}
                  {isProcessing ? 'Processing...' : 'Process Image'}
                </Button>
              </>
            ) : (
              <Button onClick={() => fileInputRef.current?.click()} className="w-full">
                <ImageIcon className="w-4 h-4 mr-2" />
                Select Image
              </Button>
            )}
          </div>

          <div className="bg-bg-muted rounded-lg p-3">
            <p className="text-xs font-medium text-text-secondary mb-1">Tips for better results:</p>
            <ul className="text-xs text-text-muted space-y-1">
              <li>• Use a clear, well-lit photo of your timetable</li>
              <li>• Ensure text is readable and not blurry</li>
              <li>• Crop to show only the timetable area</li>
              <li>• You can edit detected subjects before saving</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
