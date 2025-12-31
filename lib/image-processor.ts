/**
 * Client-side image processing for avatar optimization
 * Mimics Facebook/Instagram architecture
 * 
 * Processes images into multiple sizes before upload:
 * - thumbnail: 40x40 (chat messages, comments)
 * - small: 80x80 (user lists, mentions)
 * - medium: 200x200 (profile cards)
 * - large: 400x400 (profile header)
 */

export type AvatarSize = 'thumbnail' | 'small' | 'medium' | 'large';

export interface ProcessedImage {
  blob: Blob;
  dataUrl: string;
  size: AvatarSize;
  width: number;
  height: number;
  sizeKB: number;
}

export interface ProcessedAvatarSet {
  thumbnail: ProcessedImage;
  small: ProcessedImage;
  medium: ProcessedImage;
  large: ProcessedImage;
  original: File;
}

const SIZE_CONFIG = {
  thumbnail: { width: 40, height: 40, quality: 0.7 },
  small: { width: 80, height: 80, quality: 0.75 },
  medium: { width: 200, height: 200, quality: 0.85 },
  large: { width: 400, height: 400, quality: 0.9 },
} as const;

export class ImageProcessor {
  /**
   * Process uploaded image into multiple optimized sizes
   */
  static async processAvatar(file: File): Promise<ProcessedAvatarSet> {
    // Validate file
    if (!file.type.startsWith('image/')) {
      throw new Error('File must be an image');
    }

    if (file.size > 10 * 1024 * 1024) {
      throw new Error('Image must be less than 10MB');
    }

    // Load image
    const image = await this.loadImage(file);

    // Process all sizes in parallel
    const [thumbnail, small, medium, large] = await Promise.all([
      this.resizeImage(image, 'thumbnail'),
      this.resizeImage(image, 'small'),
      this.resizeImage(image, 'medium'),
      this.resizeImage(image, 'large'),
    ]);

    return {
      thumbnail,
      small,
      medium,
      large,
      original: file,
    };
  }

  /**
   * Load image from file
   */
  private static loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image'));
      };

      img.src = url;
    });
  }

  /**
   * Resize and compress image to specific size
   */
  private static async resizeImage(
    image: HTMLImageElement,
    size: AvatarSize
  ): Promise<ProcessedImage> {
    const config = SIZE_CONFIG[size];
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }

    // Set canvas size
    canvas.width = config.width;
    canvas.height = config.height;

    // Calculate crop dimensions to maintain aspect ratio
    const aspectRatio = image.width / image.height;
    let sourceWidth = image.width;
    let sourceHeight = image.height;
    let sourceX = 0;
    let sourceY = 0;

    if (aspectRatio > 1) {
      // Landscape: crop width
      sourceWidth = image.height;
      sourceX = (image.width - sourceWidth) / 2;
    } else if (aspectRatio < 1) {
      // Portrait: crop height
      sourceHeight = image.width;
      sourceY = (image.height - sourceHeight) / 2;
    }

    // Draw image (cropped and resized)
    ctx.drawImage(
      image,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      config.width,
      config.height
    );

    // Convert to blob
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Failed to create blob'));
        },
        'image/jpeg',
        config.quality
      );
    });

    // Convert to data URL for preview
    const dataUrl = canvas.toDataURL('image/jpeg', config.quality);

    return {
      blob,
      dataUrl,
      size,
      width: config.width,
      height: config.height,
      sizeKB: Math.round(blob.size / 1024),
    };
  }

  /**
   * Get total size of all processed images
   */
  static getTotalSize(processed: ProcessedAvatarSet): number {
    return (
      processed.thumbnail.sizeKB +
      processed.small.sizeKB +
      processed.medium.sizeKB +
      processed.large.sizeKB
    );
  }

  /**
   * Validate image dimensions
   */
  static validateImage(file: File): Promise<{ valid: boolean; error?: string }> {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(url);

        if (img.width < 40 || img.height < 40) {
          resolve({
            valid: false,
            error: 'Image must be at least 40x40 pixels',
          });
        } else {
          resolve({ valid: true });
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve({
          valid: false,
          error: 'Failed to load image',
        });
      };

      img.src = url;
    });
  }
}
