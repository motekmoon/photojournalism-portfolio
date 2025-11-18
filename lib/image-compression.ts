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
    maxSizeMB = 3.0, // More conservative - 3MB to be well under 4.5MB limit
    maxWidthOrHeight = 2500, // Smaller max dimension
    quality = 0.80, // Lower quality for better compression
  } = options;

  // Always compress if file is over 2MB to ensure we're well under the limit
  if (file.size <= 2 * 1024 * 1024) {
    console.log(`File ${file.name} is already small enough (${(file.size / 1024 / 1024).toFixed(2)}MB), skipping compression`);
    return file;
  }

  console.log(`Starting compression for ${file.name}: ${(file.size / 1024 / 1024).toFixed(2)}MB`);

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

        // Convert to blob with compression - use iterative approach
        const tryCompress = (targetQuality: number, attempt: number = 1): void => {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Compression failed'));
                return;
              }

              // If still too large and we haven't tried too many times, compress more
              if (blob.size > maxSizeMB * 1024 * 1024 && attempt < 5) {
                // Reduce dimensions and quality further
                const newWidth = Math.floor(width * 0.9);
                const newHeight = Math.floor(height * 0.9);
                canvas.width = newWidth;
                canvas.height = newHeight;
                ctx.clearRect(0, 0, newWidth, newHeight);
                ctx.drawImage(img, 0, 0, newWidth, newHeight);
                
                // Try with even lower quality
                tryCompress(targetQuality * 0.85, attempt + 1);
              } else {
                // If still too large after all attempts, resize more aggressively
                if (blob.size > maxSizeMB * 1024 * 1024) {
                  // Last resort: resize to smaller dimensions
                  const finalWidth = Math.min(width, 2000);
                  const finalHeight = Math.min(height, 2000);
                  canvas.width = finalWidth;
                  canvas.height = finalHeight;
                  ctx.clearRect(0, 0, finalWidth, finalHeight);
                  ctx.drawImage(img, 0, 0, finalWidth, finalHeight);
                  
                  canvas.toBlob(
                    (finalBlob) => {
                      if (!finalBlob) {
                        reject(new Error('Compression failed'));
                        return;
                      }
                      
                      const compressedFile = new File(
                        [finalBlob],
                        file.name,
                        {
                          type: 'image/jpeg', // Always use JPEG for maximum compression
                          lastModified: Date.now(),
                        }
                      );
                      console.log(`Final compression: ${(file.size / 1024 / 1024).toFixed(2)}MB -> ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`);
                      resolve(compressedFile);
                    },
                    'image/jpeg',
                    0.60 // Very low quality for maximum compression
                  );
                } else {
                  // Success! File is small enough
                  const compressedFile = new File(
                    [blob],
                    file.name,
                    {
                      type: 'image/jpeg', // Always use JPEG for better compression
                      lastModified: Date.now(),
                    }
                  );
                  console.log(`Compression successful: ${(file.size / 1024 / 1024).toFixed(2)}MB -> ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`);
                  resolve(compressedFile);
                }
              }
            },
            'image/jpeg', // Always use JPEG for better compression
            targetQuality
          );
        };
        
        tryCompress(quality);
      };
      img.onerror = (err) => {
        console.error('Error loading image:', err);
        reject(new Error('Failed to load image'));
      };
      img.src = e.target?.result as string;
    };
    reader.onerror = (err) => {
      console.error('Error reading file:', err);
      reject(new Error('Failed to read file'));
    };
    reader.readAsDataURL(file);
  });
}

