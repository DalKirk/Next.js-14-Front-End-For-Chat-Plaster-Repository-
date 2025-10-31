import { ImageAnalysisRequest, ImageAnalysisResponse, ImageAnalysisError, HistoryEntry } from '@/types/image-analysis';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://web-production-3ba7e.up.railway.app';

export class ImageAnalysisService {
  /**
   * Analyze an image using Claude Vision API
   */
  static async analyzeImage(
    imageFile: File,
    prompt: string,
    language?: string
  ): Promise<ImageAnalysisResponse> {
    try {
      // Convert image to base64
      const base64Data = await this.fileToBase64(imageFile);
      
      // Add language instruction to prompt if specified
      const languagePrompt = language && language !== 'English' 
        ? `${prompt}\n\nIMPORTANT: Respond in ${language}.`
        : prompt;
      
      const requestBody: ImageAnalysisRequest = {
        imageBase64: base64Data,
        mimeType: imageFile.type,
        prompt: languagePrompt,
        language: language
      };

      const response = await fetch(`${API_URL}/api/analyze-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData: ImageAnalysisError = await response.json().catch(() => ({
          detail: `Server error: ${response.status}`,
          status: response.status
        }));
        throw new Error(errorData.detail || 'Failed to analyze image');
      }

      const data: ImageAnalysisResponse = await response.json();
      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unexpected error occurred');
    }
  }

  /**
   * Analyze image with streaming response
   */
  static async analyzeImageStreaming(
    imageFile: File,
    prompt: string,
    language: string | undefined,
    onChunk: (chunk: string) => void
  ): Promise<void> {
    try {
      const base64Data = await this.fileToBase64(imageFile);
      
      const languagePrompt = language && language !== 'English' 
        ? `${prompt}\n\nIMPORTANT: Respond in ${language}.`
        : prompt;
      
      const requestBody: ImageAnalysisRequest = {
        imageBase64: base64Data,
        mimeType: imageFile.type,
        prompt: languagePrompt,
        language: language
      };

      const response = await fetch(`${API_URL}/api/analyze-image-stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('Stream not available');
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            
            try {
              const parsed = JSON.parse(data);
              if (parsed.text) {
                onChunk(parsed.text);
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Streaming analysis failed');
    }
  }

  /**
   * Convert File to base64 string
   */
  private static fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onloadend = () => {
        const result = reader.result as string;
        const base64Data = result.split(',')[1];
        resolve(base64Data);
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      reader.readAsDataURL(file);
    });
  }

  /**
   * Validate image file
   */
  static validateImageFile(file: File): { valid: boolean; error?: string } {
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: 'Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image.'
      };
    }

    if (file.size > maxSize) {
      return {
        valid: false,
        error: 'File size exceeds 5MB limit.'
      };
    }

    return { valid: true };
  }

  /**
   * Create image preview URL
   */
  static createImagePreview(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onloadend = () => {
        resolve(reader.result as string);
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to create preview'));
      };
      
      reader.readAsDataURL(file);
    });
  }

  /**
   * Compress image for progressive loading
   */
  static async compressImage(file: File, maxWidth: number = 800, quality: number = 0.7): Promise<File> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Calculate new dimensions
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Failed to compress image'));
                return;
              }
              const compressedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            },
            file.type,
            quality
          );
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target?.result as string;
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * History Management
   */
  static saveToHistory(entry: HistoryEntry): void {
    const history = this.getHistory();
    history.unshift(entry);
    // Keep only last 20 entries
    const trimmedHistory = history.slice(0, 20);
    localStorage.setItem('imageAnalysisHistory', JSON.stringify(trimmedHistory));
  }

  static getHistory(): HistoryEntry[] {
    try {
      const stored = localStorage.getItem('imageAnalysisHistory');
      if (!stored) return [];
      const parsed = JSON.parse(stored);
      // Convert timestamp strings back to Date objects
      return parsed.map((entry: any) => ({
        ...entry,
        timestamp: new Date(entry.timestamp)
      }));
    } catch {
      return [];
    }
  }

  static clearHistory(): void {
    localStorage.removeItem('imageAnalysisHistory');
  }

  static deleteHistoryEntry(id: string): void {
    const history = this.getHistory();
    const filtered = history.filter(entry => entry.id !== id);
    localStorage.setItem('imageAnalysisHistory', JSON.stringify(filtered));
  }

  /**
   * Export functionality
   */
  static exportAsJSON(data: HistoryEntry): void {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    this.downloadBlob(blob, `analysis-${data.id}.json`);
  }

  static exportAsText(data: HistoryEntry): void {
    const text = `Image Analysis Report
Generated: ${data.timestamp.toLocaleString()}
Language: ${data.language}
Analysis Type: ${data.tab}

Prompt:
${data.prompt}

Response:
${data.response}
`;
    const blob = new Blob([text], { type: 'text/plain' });
    this.downloadBlob(blob, `analysis-${data.id}.txt`);
  }

  static async copyToClipboard(text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      throw new Error('Failed to copy to clipboard');
    }
  }

  private static downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
