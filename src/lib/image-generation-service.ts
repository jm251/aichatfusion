import { ImageGenerationRequest, ImageGenerationResponse } from './types';
import { APIBackendClient } from './api-backend-client';
import { getBackendUrl } from './backend-url';

export class ImageGenerationService {
  private static backendUrl = getBackendUrl();
  private static readonly MAX_EDIT_IMAGE_BYTES = 4 * 1024 * 1024;
  private static readonly EDIT_IMAGE_TARGET_SIZES = [1024, 512, 256] as const;

  static async generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResponse> {
    const startTime = Date.now();

    try {
      // Ensure we have a session
      await APIBackendClient.ensureSession();
      const token = APIBackendClient.getSessionToken();

      if (!token) {
        return {
          success: false,
          error: 'No session available',
          responseTime: Date.now() - startTime
        };
      }

      const payload: Record<string, unknown> = {
        prompt: request.prompt,
      };

      if (request.image) {
        payload.image = await this.normalizeImage(request.image);
      } else if (request.model) {
        payload.model = request.model;
      }

      // Use image generation via backend proxy
      const response = await fetch(`${this.backendUrl}/api/proxy/image-generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': token,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})) as {
          error?: string;
          details?: string;
          cause?: string;
        };
        const errorParts = [errorData.error, errorData.details, errorData.cause]
          .filter((value): value is string => typeof value === 'string' && value.trim().length > 0);
        return {
          success: false,
          error: errorParts.join(' - ') || `Image generation failed: ${response.status}`,
          responseTime: Date.now() - startTime
        };
      }

      const data = await response.json();

      if (!data.success || !data.imageUrl) {
        return {
          success: false,
          error: 'No image generated',
          responseTime: Date.now() - startTime
        };
      }

      return {
        success: true,
        imageUrl: data.imageUrl,
        responseTime: Date.now() - startTime
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Date.now() - startTime
      };
    }
  }

  private static async normalizeImage(image: File | string): Promise<string> {
    const dataUrl = await this.normalizeToDataUrl(image);
    return await this.normalizeForEditEndpoint(dataUrl);
  }

  private static async normalizeToDataUrl(image: File | string): Promise<string> {
    if (typeof image !== 'string') {
      return await this.blobToDataUrl(image);
    }
    if (image.startsWith('data:')) {
      return image;
    }
    if (image.startsWith('http')) {
      const response = await fetch(image);
      if (!response.ok) {
        throw new Error(`Failed to fetch attachment image: ${response.status}`);
      }
      const blob = await response.blob();
      return await this.blobToDataUrl(blob);
    }
    return image;
  }

  private static async normalizeForEditEndpoint(dataUrl: string): Promise<string> {
    if (!dataUrl.startsWith('data:')) {
      return dataUrl;
    }

    const blob = await this.dataUrlToBlob(dataUrl);
    const dimensions = await this.getImageDimensions(blob);
    const isSquare = dimensions.width === dimensions.height;
    const isCompatible =
      blob.type === 'image/png' &&
      blob.size <= this.MAX_EDIT_IMAGE_BYTES &&
      isSquare;

    if (isCompatible) {
      return dataUrl;
    }

    return await this.convertToSquarePngDataUrl(blob);
  }

  private static async dataUrlToBlob(dataUrl: string): Promise<Blob> {
    const response = await fetch(dataUrl);
    if (!response.ok) {
      throw new Error('Failed to read uploaded image data');
    }
    return await response.blob();
  }

  private static async convertToSquarePngDataUrl(blob: Blob): Promise<string> {
    const image = await this.loadImage(blob);
    const cropSize = Math.min(image.naturalWidth, image.naturalHeight);
    const offsetX = Math.floor((image.naturalWidth - cropSize) / 2);
    const offsetY = Math.floor((image.naturalHeight - cropSize) / 2);

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    if (!context) {
      throw new Error('Failed to prepare uploaded image');
    }

    for (const size of this.EDIT_IMAGE_TARGET_SIZES) {
      canvas.width = size;
      canvas.height = size;
      context.clearRect(0, 0, size, size);
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      context.drawImage(
        image,
        offsetX,
        offsetY,
        cropSize,
        cropSize,
        0,
        0,
        size,
        size
      );

      const pngBlob = await this.canvasToBlob(canvas, 'image/png');
      if (pngBlob.size <= this.MAX_EDIT_IMAGE_BYTES) {
        return await this.blobToDataUrl(pngBlob);
      }
    }

    throw new Error('Uploaded image is too large for image editing. Try a smaller image.');
  }

  private static loadImage(blob: Blob): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const imageUrl = URL.createObjectURL(blob);
      const image = new Image();

      image.onload = () => {
        URL.revokeObjectURL(imageUrl);
        resolve(image);
      };

      image.onerror = () => {
        URL.revokeObjectURL(imageUrl);
        reject(new Error('Unsupported image attachment'));
      };

      image.src = imageUrl;
    });
  }

  private static async getImageDimensions(blob: Blob): Promise<{ width: number; height: number }> {
    const image = await this.loadImage(blob);
    return { width: image.naturalWidth, height: image.naturalHeight };
  }

  private static canvasToBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob> {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Failed to convert image attachment'));
          return;
        }
        resolve(blob);
      }, type);
    });
  }

  private static blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}
