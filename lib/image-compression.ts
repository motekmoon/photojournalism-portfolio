/**
 * Client-side image compression utility
 * Compresses images before upload to avoid Vercel's 4.5MB request body limit
 */

export interface CompressionOptions {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  quality?: number;
}

/**
 * Compress an image file on the client side
 * Returns a compressed File or Blob
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  const {
    maxSizeMB = 3.5, // Slightly under 4MB to be safe
    maxWidthOrHeight = 3000,
    quality = 0.85,
  } = options;

  // If file is already small enough, return as-is
  if (file.size <= maxSizeMB * 1024 * 1024) {
    return file;
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Calculate new dimensions
        let width = img.width;
        let height = img.height;

        if (width > maxWidthOrHeight || height > maxWidthOrHeight) {
          if (width > height) {
            height = (height * maxWidthOrHeight) / width;
            width = maxWidthOrHeight;
          } else {
            width = (width * maxWidthOrHeight) / height;
            height = maxWidthOrHeight;
          }
        }

        // Create canvas and compress
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Convert to blob with compression
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Compression failed'));
              return;
            }

            // If still too large, compress more aggressively
            if (blob.size > maxSizeMB * 1024 * 1024) {
              // Try again with lower quality
              canvas.toBlob(
                (blob2) => {
                  if (!blob2) {
                    reject(new Error('Compression failed'));
                    return;
                  }

                  // Create a new File with the same name
                  const compressedFile = new File(
                    [blob2],
                    file.name,
                    {
                      type: file.type || 'image/jpeg',
                      lastModified: Date.now(),
                    }
                  );
                  resolve(compressedFile);
                },
                file.type || 'image/jpeg',
                quality * 0.7 // Even lower quality
              );
            } else {
              // Create a new File with the same name
              const compressedFile = new File(
                [blob],
                file.name,
                {
                  type: file.type || 'image/jpeg',
                  lastModified: Date.now(),
                }
              );
              resolve(compressedFile);
            }
          },
          file.type || 'image/jpeg',
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

