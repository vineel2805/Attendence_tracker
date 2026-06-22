/**
 * TimetableScannerOCR - Main component for uploading and processing timetable images
 * Uses local Tesseract.js for OCR (no paid APIs required)
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Upload,
  X,
  Loader2,
  Scan,
  RotateCcw,
  ImageIcon,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { Button } from './Button';
import { toast } from 'sonner';
import { DayId, SubjectV2, ClassEntry } from '@/types';
import {
  validateFile,
  performOCR,
  terminateOCR,
  isOCRProcessing,
  OCRResult,
} from '@/utils/ocrService';
import {
  parseTimetableText,
  ParsedTimetable,
} from '@/utils/timetableParser';
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

// Processing stage types
type ProcessingStage = 'idle' | 'uploading' | 'preprocessing' | 'ocr' | 'parsing' | 'preview' | 'error';

export const TimetableScannerOCR: React.FC<TimetableScannerOCRProps> = ({
  onScanComplete,
  onClose,
  existingSubjects,
}) => {
  // Component state
  const [stage, setStage] = useState<ProcessingStage>('idle');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [parsedData, setParsedData] = useState<EditableTimetableData | null>(null);
  const [parseConfidence, setParseConfidence] = useState(0);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cleanup OCR worker on unmount
  useEffect(() => {
    return () => {
      terminateOCR();
    };
  }, []);

  /**
   * Handle file selection from input
   */
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type and size
    const error = validateFile(file);
    if (error) {
      toast.error(error.message);
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
      setSelectedFile(file);
      setStage('idle');
      setErrorMessage(null);
      setOcrResult(null);
      setParsedData(null);
    };
    reader.readAsDataURL(file);
  }, []);

  /**
   * Handle drag and drop file upload
   */
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
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
      setSelectedFile(file);
      setStage('idle');
      setErrorMessage(null);
    };
    reader.readAsDataURL(file);
  }, []);

  /**
   * Handle drag over event
   */
  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  /**
   * Progress callback for OCR processing
   */
  const handleProgress = useCallback((progressValue: number, status: string) => {
    setProgress(progressValue);
    setStatusText(status);
  }, []);

  /**
   * Main image processing function
   */
  const processImage = useCallback(async () => {
    if (!imagePreview || isOCRProcessing()) return;

    setStage('preprocessing');
    setProgress(0);
    setErrorMessage(null);

    try {
      // Run OCR
      setStage('ocr');
      const result = await performOCR(imagePreview, handleProgress);
      setOcrResult(result);

      console.log('[Scanner] OCR Result:', {
        confidence: result.confidence.toFixed(1) + '%',
        lines: result.lines.length,
        time: result.processingTimeMs + 'ms',
      });

      // Warn about low confidence
      if (result.confidence < 60) {
        toast.warning(`Low OCR confidence (${result.confidence.toFixed(0)}%). Results may need correction.`);
      }

      // Parse timetable structure from OCR text
      setStage('parsing');
      setStatusText('Parsing timetable structure...');

      const parsed = parseTimetableText(result.lines);

      if ('code' in parsed) {
        // Parser returned an error
        throw new Error(parsed.message);
      }

      // Convert to editable format
      const editableData: EditableTimetableData = {
        days: parsed.days,
        timetable: parsed.timetable,
        subjects: parsed.subjects,
      };

      setParsedData(editableData);
      setParseConfidence(parsed.parseConfidence);
      setStage('preview');

      const totalPeriods = Object.values(parsed.days).reduce((sum, d) => sum + d.totalPeriods, 0);
      toast.success(`Found ${parsed.subjects.length} subjects across ${totalPeriods} periods!`);

    } catch (error) {
      console.error('[Scanner] Error:', error);
      setStage('error');
      setErrorMessage(error instanceof Error ? error.message : 'Processing failed. Please try again.');
      toast.error('Failed to process timetable');
    }
  }, [imagePreview, handleProgress]);

  /**
   * Handle preview confirmation
   */
  const handlePreviewConfirm = useCallback((finalData: FinalTimetableData) => {
    onScanComplete(finalData);
    toast.success('Timetable ready to save!');
  }, [onScanComplete]);

  /**
   * Clear and reset state
   */
  const handleClear = useCallback(() => {
    setImagePreview(null);
    setSelectedFile(null);
    setStage('idle');
    setProgress(0);
    setStatusText('');
    setErrorMessage(null);
    setOcrResult(null);
    setParsedData(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  /**
   * Handle modal close with cleanup
   */
  const handleClose = useCallback(() => {
    terminateOCR();
    onClose();
  }, [onClose]);

  // Show preview modal if we have parsed data
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

  const isProcessing = ['preprocessing', 'ocr', 'parsing'].includes(stage);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-bg-primary rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-text-primary">
            Scan Timetable (OCR)
          </h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-bg-muted rounded-lg"
            disabled={isProcessing}
          >
            <X className="w-5 h-5 text-text-muted" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Upload Area - Show when no image selected */}
          {!imagePreview ? (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-text-muted transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-12 h-12 mx-auto mb-3 text-text-muted" />
              <p className="text-text-primary font-medium">
                Upload Timetable Image
              </p>
              <p className="text-sm text-text-muted mt-1">
                Click or drag and drop
              </p>
              <p className="text-xs text-text-muted mt-2">
                Supports: JPG, PNG, WEBP, BMP (max 10MB)
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Image Preview */}
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

              {/* Processing Status */}
              {isProcessing && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 text-accent animate-spin" />
                    <span className="text-sm text-text-secondary">{statusText}</span>
                  </div>
                  <div className="h-2 bg-bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-text-muted text-center">
                    {progress}% complete
                  </p>
                </div>
              )}

              {/* Error State */}
              {stage === 'error' && errorMessage && (
                <div className="bg-danger/10 border border-danger/20 rounded-lg p-3 flex gap-2">
                  <AlertCircle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-text-primary font-medium">
                      Processing Failed
                    </p>
                    <p className="text-sm text-text-secondary mt-1">
                      {errorMessage}
                    </p>
                  </div>
                </div>
              )}

              {/* OCR Result Info */}
              {ocrResult && stage === 'idle' && (
                <div className="bg-success/10 border border-success/20 rounded-lg p-3 flex gap-2">
                  <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-text-primary font-medium">
                      OCR Complete
                    </p>
                    <p className="text-xs text-text-secondary mt-1">
                      Confidence: {ocrResult.confidence.toFixed(1)}% |
                      Lines: {ocrResult.lines.length} |
                      Time: {(ocrResult.processingTimeMs / 1000).toFixed(1)}s
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/bmp"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Action Buttons */}
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
              <Button
                onClick={() => fileInputRef.current?.click()}
                className="w-full"
              >
                <ImageIcon className="w-4 h-4 mr-2" />
                Select Image
              </Button>
            )}
          </div>

          {/* Tips */}
          <div className="bg-bg-muted rounded-lg p-3">
            <p className="text-xs font-medium text-text-secondary mb-1">
              Tips for better results:
            </p>
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
