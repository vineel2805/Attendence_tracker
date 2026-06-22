/**
 * OCR Service using Tesseract.js for local text recognition
 * Handles image preprocessing, text extraction, and memory cleanup
 * No paid APIs required - runs entirely in browser
 */

import { createWorker, Worker, RecognizeResult } from 'tesseract.js';

// OCR Configuration constants
const OCR_CONFIG = {
  LANGUAGE: 'eng',
  WHITELIST: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-:/ ',
  MIN_CONFIDENCE: 60,
  MAX_IMAGE_WIDTH: 1600,
  MAX_IMAGE_HEIGHT: 1600,
  MAX_FILE_SIZE_MB: 10,
} as const;

// Supported file types for upload
const SUPPORTED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/bmp'];

/**
 * Result returned after OCR processing
 */
export interface OCRResult {
  text: string;
  confidence: number;
  lines: string[];
  processingTimeMs: number;
}

/**
 * Error structure for OCR failures
 */
export interface OCRError {
  code: 'INVALID_FILE_TYPE' | 'FILE_TOO_LARGE' | 'PROCESSING_FAILED' | 'LOW_CONFIDENCE';
  message: string;
}

/**
 * Callback for progress updates during OCR
 */
export type OCRProgressCallback = (progress: number, status: string) => void;

/**
 * Validates uploaded file type and size
 * @param file - File to validate
 * @returns Error object if validation fails, null if valid
 */
export const validateFile = (file: File): OCRError | null => {
  if (!SUPPORTED_FILE_TYPES.includes(file.type)) {
    return {
      code: 'INVALID_FILE_TYPE',
      message: `Unsupported file type. Please upload a ${SUPPORTED_FILE_TYPES.map(t => t.split('/')[1].toUpperCase()).join(', ')} image.`,
    };
  }

  const fileSizeMB = file.size / (1024 * 1024);
  if (fileSizeMB > OCR_CONFIG.MAX_FILE_SIZE_MB) {
    return {
      code: 'FILE_TOO_LARGE',
      message: `File too large (${fileSizeMB.toFixed(1)}MB). Maximum size is ${OCR_CONFIG.MAX_FILE_SIZE_MB}MB.`,
    };
  }

  return null;
};

/**
 * Preprocesses image using canvas for better OCR results
 * - Resizes to reasonable dimensions
 * - Converts to grayscale
 * - Applies contrast enhancement
 * - Applies adaptive thresholding
 * @param imageSource - Base64 string or File object
 * @param onProgress - Optional progress callback
 * @returns Preprocessed image as base64 string
 */
export const preprocessImage = async (
  imageSource: string | File,
  onProgress?: OCRProgressCallback
): Promise<string> => {
  return new Promise((resolve, reject) => {
    onProgress?.(5, 'Loading image...');

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        onProgress?.(10, 'Preprocessing image...');

        // Calculate new dimensions while maintaining aspect ratio
        let { width, height } = img;
        const maxDim = Math.max(OCR_CONFIG.MAX_IMAGE_WIDTH, OCR_CONFIG.MAX_IMAGE_HEIGHT);

        if (width > maxDim || height > maxDim) {
          const scale = maxDim / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }

        // Create canvas for preprocessing
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          reject(new Error('Failed to create canvas context'));
          return;
        }

        // Draw original image
        ctx.drawImage(img, 0, 0, width, height);

        onProgress?.(15, 'Enhancing contrast...');

        // Get image data for pixel manipulation
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;

        // Apply grayscale and contrast enhancement
        for (let i = 0; i < data.length; i += 4) {
          // Convert to grayscale using luminance formula
          const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];

          // Apply contrast enhancement (factor of 1.5)
          const contrastFactor = 1.5;
          const enhanced = ((gray - 128) * contrastFactor + 128);

          // Apply threshold for cleaner text (adaptive binarization)
          const threshold = 128;
          const binarized = enhanced > threshold ? 255 : Math.max(0, enhanced * 0.8);

          data[i] = binarized;     // R
          data[i + 1] = binarized; // G
          data[i + 2] = binarized; // B
          // Alpha channel stays the same
        }

        ctx.putImageData(imageData, 0, 0);

        onProgress?.(20, 'Image ready for OCR...');

        // Convert to base64 PNG
        const processedImage = canvas.toDataURL('image/png', 1.0);

        console.log(`[OCR] Image preprocessed: ${img.width}x${img.height} -> ${width}x${height}`);

        resolve(processedImage);
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    // Load image from source
    if (typeof imageSource === 'string') {
      img.src = imageSource;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(imageSource);
    }
  });
};

// Worker instance (reused to avoid reinitializing)
let ocrWorker: Worker | null = null;
let isProcessing = false;

/**
 * Gets or creates the Tesseract worker instance
 * Worker is reused for efficiency
 * @param onProgress - Optional progress callback
 * @returns Tesseract worker instance
 */
const getWorker = async (onProgress?: OCRProgressCallback): Promise<Worker> => {
  if (!ocrWorker) {
    onProgress?.(25, 'Initializing OCR engine...');

    ocrWorker = await createWorker(OCR_CONFIG.LANGUAGE, 1, {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          const progress = 25 + Math.round((m.progress || 0) * 65);
          onProgress?.(progress, 'Recognizing text...');
        }
      },
    });

    // Set recognition parameters for better accuracy
    await ocrWorker.setParameters({
      tessedit_char_whitelist: OCR_CONFIG.WHITELIST,
      preserve_interword_spaces: '1',
    });

    console.log('[OCR] Worker initialized');
  }

  return ocrWorker;
};

/**
 * Main OCR function - processes image and extracts text
 * @param imageSource - Base64 string or File object to process
 * @param onProgress - Optional progress callback
 * @returns OCR result with text, confidence, and timing info
 * @throws Error if processing fails or already in progress
 */
export const performOCR = async (
  imageSource: string | File,
  onProgress?: OCRProgressCallback
): Promise<OCRResult> => {
  // Prevent concurrent processing
  if (isProcessing) {
    throw new Error('OCR is already processing. Please wait.');
  }

  isProcessing = true;
  const startTime = Date.now();

  try {
    // Preprocess image for better accuracy
    const processedImage = await preprocessImage(imageSource, onProgress);

    // Get or create worker
    const worker = await getWorker(onProgress);

    onProgress?.(30, 'Running OCR...');

    // Perform text recognition
    const result: RecognizeResult = await worker.recognize(processedImage);

    onProgress?.(95, 'Processing results...');

    const text = result.data.text;
    const confidence = result.data.confidence;

    // Split text into lines and clean up
    const lines = text
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const processingTimeMs = Date.now() - startTime;

    console.log(`[OCR] Complete - Confidence: ${confidence.toFixed(1)}%, Lines: ${lines.length}, Time: ${processingTimeMs}ms`);

    onProgress?.(100, 'OCR complete');

    return {
      text,
      confidence,
      lines,
      processingTimeMs,
    };
  } finally {
    isProcessing = false;
  }
};

/**
 * Terminates the OCR worker and frees memory
 * Call this when done with OCR to clean up resources
 */
export const terminateOCR = async (): Promise<void> => {
  if (ocrWorker) {
    await ocrWorker.terminate();
    ocrWorker = null;
    console.log('[OCR] Worker terminated');
  }
};

/**
 * Checks if OCR is currently processing
 * @returns true if OCR is in progress
 */
export const isOCRProcessing = (): boolean => isProcessing;
