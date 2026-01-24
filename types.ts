
export enum EnhancementType {
  GENERAL = 'General Enhancement',
  RESTORE = 'Old Photo Restoration',
  COLORIZE = 'Colorize B&W',
  LIGHTING = 'Fix Lighting',
  CREATIVE = 'Creative Re-style',
  UPSCALE = 'Simulated Upscale',
  VECTORIZE = 'Vectorize / HD SVG',
  REMOVE_SUBJECT = 'Remove Subject',
  REMOVE_TEXT = 'Remove Text',
  REMOVE_BACKGROUND = 'Remove Background',
  REMOVE_WATERMARK = 'Watermark Remover',
  VARIATION = 'Inspire / Variant',
  EDIT = 'Magic Editor',
  GENERATION = 'Text to Image'
}

export enum AspectRatio {
  AUTO = 'auto',
  SQUARE = '1:1',
  PORTRAIT = '3:4',
  LANDSCAPE = '4:3',
  WIDE = '16:9',
  TALL = '9:16',
  CUSTOM = 'custom'
}

export interface EnhancementConfig {
  types: EnhancementType[];
  customPrompt?: string;
  negativePrompt?: string;
  referenceImage?: string; // Base64 of the reference image
  maskImage?: string; // Base64 of the mask image (for inpainting)
  aspectRatio: AspectRatio;
  customWidth?: number;
  customHeight?: number;
  imageCount: number; // 1-5
  model: 'gemini-2.5-flash-image' | 'gemini-3-pro-image-preview' | 'fal-ai/drct-super-resolution' | 'cloudinary-ai';
}

export interface ProcessedImage {
  original: string; // Base64 or URL
  enhanced: string[]; // Array of Base64 or URLs
  config: EnhancementConfig;
  originalDims?: { w: number, h: number };
  enhancedDims?: { w: number, h: number };
  processingTime?: number; // Duration in milliseconds
}

export interface BatchItem {
  id: string;
  file: File;
  preview: string; // Base64
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: string; // Enhanced Base64 (First result only for batch)
  error?: string;
  originalDims?: { w: number, h: number };
  enhancedDims?: { w: number, h: number };
}
