/**
 * Type definitions for Image Analysis API
 */

export type AnalysisTab = 'describe' | 'ocr' | 'translate' | 'qa';

export interface ImageAnalysisRequest {
  imageBase64: string;
  mimeType: string;
  prompt: string;
  language?: string;
}

export interface ImageAnalysisResponse {
  response: string;
}

export interface ImageAnalysisError {
  detail: string;
  status?: number;
}

export interface QuickPrompt {
  id: string;
  text: string;
  category?: 'description' | 'ocr' | 'qa';
}

export interface AnalysisState {
  selectedImage: File | null;
  imagePreview: string | null;
  prompt: string;
  response: string;
  loading: boolean;
  error: string | null;
  activeTab: AnalysisTab;
}

// New interfaces for features
export interface HistoryEntry {
  id: string;
  image: string;
  prompt: string;
  response: string;
  timestamp: Date;
  language: string;
  tab: AnalysisTab;
}

export interface Language {
  code: string;
  name: string;
  flag: string;
}
