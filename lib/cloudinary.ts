import { v2 as cloudinary } from 'cloudinary';
import type { CloudinaryUploadResult } from '@/types';

// Configure Cloudinary
// Prefer CLOUDINARY_URL if available, otherwise use individual env vars
if (process.env.CLOUDINARY_URL) {
  cloudinary.config();
} else {
  cloudinary.config({
    cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

// Log configuration status (without exposing secrets)
console.log('Cloudinary config:', {
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_URL ? 'set' : 'missing',
  api_key: process.env.CLOUDINARY_API_KEY ? 'set' : 'missing',
  api_secret: process.env.CLOUDINARY_API_SECRET ? 'set' : 'missing',
  cloudinary_url: process.env.CLOUDINARY_URL ? 'set' : 'missing',
});

export { cloudinary };

export async function uploadImage(
  file: Buffer | string,
  options?: {
    folder?: string;
    public_id?: string;
    extractMetadata?: boolean;
  }
): Promise<CloudinaryUploadResult> {
  try {
    const uploadOptions: any = {
      resource_type: 'image',
      ...options,
    };

    let result: any;

    // Enable metadata extraction in upload options (face detection disabled)
    if (options?.extractMetadata !== false) {
      // Request metadata extraction (excluding face detection)
      uploadOptions.image_metadata = true; // EXIF, IPTC, XMP, GPS
      uploadOptions.exif = true; // EXIF data
      uploadOptions.colors = true; // Color analysis
      uploadOptions.phash = true; // Perceptual hash
      // uploadOptions.faces = true; // Face detection - DISABLED
      uploadOptions.quality_analysis = true; // Quality analysis
      uploadOptions.cinemagraph_analysis = true; // Cinemagraph detection
      uploadOptions.accessibility_analysis = true; // Accessibility analysis
    }

    // Use upload_stream for Buffer, regular upload for string (file path or data URI)
    if (Buffer.isBuffer(file)) {
      // Use upload_stream for buffers
      result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          uploadOptions,
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        uploadStream.end(file);
      });
    } else {
      // Use regular upload for string paths or data URIs
      result = await cloudinary.uploader.upload(file, uploadOptions);
    }

    // Log initial upload response
    console.log('=== INITIAL UPLOAD RESPONSE ===');
    console.log('Upload successful! Public ID:', result.public_id);
    console.log('Upload response keys:', Object.keys(result));
    console.log('Has exif in upload:', !!result.exif);
    console.log('Has image_metadata in upload:', !!result.image_metadata);
    console.log('Has colors in upload:', !!result.colors);
    
    // Fetch ALL metadata using Admin API if metadata extraction is enabled
    let exifData = result.exif || {};
    let imageMetadata = result.image_metadata || {};
    
           // Store the COMPLETE upload response first - don't lose anything
           let allMetadata: any = {
             // Store complete upload response
             upload_response: result,
             // Extract specific fields for easy access
             exif: exifData,
             image_metadata: imageMetadata,
             colors: result.colors || null,
             phash: result.phash || null,
             // faces: result.faces || null, // Face detection disabled
             quality_analysis: result.quality_analysis || null,
             cinemagraph_analysis: result.cinemagraph_analysis || null,
             accessibility_analysis: result.accessibility_analysis || null,
             // Store ALL fields from upload response
           };
    
    // Copy ALL fields from upload response to allMetadata
    for (const key in result) {
      if (result.hasOwnProperty(key) && !['public_id', 'secure_url', 'width', 'height', 'format', 'resource_type'].includes(key)) {
        if (result[key] !== null && result[key] !== undefined) {
          allMetadata[`upload_${key}`] = result[key];
        }
      }
    }
    
    console.log('Initial metadata from upload response:', {
      exifKeys: exifData ? Object.keys(exifData) : [],
      imageMetadataKeys: imageMetadata ? Object.keys(imageMetadata) : [],
    });
    
    if (options?.extractMetadata !== false) {
      try {
        console.log('=== STARTING METADATA EXTRACTION ===');
        console.log('Public ID:', result.public_id);
        console.log('Waiting 2 seconds for Cloudinary to process metadata...');
        
        // Wait for Cloudinary to process all metadata (can take a moment)
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        console.log('Calling Admin API to fetch metadata...');
        
               // Use Admin API to get ALL resource details including ALL metadata
               const resource = await cloudinary.api.resource(result.public_id, {
                 image_metadata: true, // EXIF, IPTC, XMP, GPS
                 exif: true, // EXIF data
                 colors: true, // Color analysis
                 // faces: true, // Face detection - DISABLED
                 pages: true, // Multi-page documents
                 phash: true, // Perceptual hash
                 quality_analysis: true, // Quality analysis
                 cinemagraph_analysis: true, // Cinemagraph detection
                 accessibility_analysis: true, // Accessibility analysis
               });
        
        console.log('=== ADMIN API RESOURCE - COMPLETE RESPONSE ===');
        console.log('Admin API call successful!');
        console.log('Resource keys:', Object.keys(resource));
        console.log('Number of keys:', Object.keys(resource).length);
        
               // Log what metadata fields are present
               console.log('Has image_metadata:', !!resource.image_metadata);
               console.log('Has exif:', !!resource.exif);
               console.log('Has colors:', !!resource.colors);
        
        // Try to stringify, but handle if it's too large
        try {
          console.log('Full resource object (first 5000 chars):', JSON.stringify(resource, null, 2).substring(0, 5000));
        } catch (e) {
          console.log('Resource object too large to stringify, showing structure only');
          console.log('Resource structure:', {
            keys: Object.keys(resource),
            image_metadata_keys: resource.image_metadata ? Object.keys(resource.image_metadata) : null,
            exif_keys: resource.exif ? Object.keys(resource.exif) : null,
          });
        }
        
        // Store the COMPLETE resource response - EVERYTHING Cloudinary returns
        // This ensures we don't lose any data
        allMetadata.complete_resource_response = resource;
        
        // Also extract specific fields for easier access, but keep the complete response
        if (resource.image_metadata && typeof resource.image_metadata === 'object') {
          imageMetadata = resource.image_metadata;
          allMetadata.image_metadata = imageMetadata;
          
          // Extract nested metadata structures
          if (resource.image_metadata.Exif) {
            allMetadata.exif_full = resource.image_metadata.Exif;
          }
          if (resource.image_metadata.IPTC) {
            allMetadata.iptc = resource.image_metadata.IPTC;
          }
          if (resource.image_metadata.XMP) {
            allMetadata.xmp = resource.image_metadata.XMP;
          }
          if (resource.image_metadata.GPS) {
            allMetadata.gps = resource.image_metadata.GPS;
          }
        }
        
        if (resource.exif && typeof resource.exif === 'object') {
          exifData = resource.exif;
          allMetadata.exif = exifData;
        }
        
        // Extract ALL fields from resource - don't miss anything
        // Copy every field that might contain metadata or useful info
        const allResourceKeys = Object.keys(resource);
        console.log('Total fields in resource response:', allResourceKeys.length);
        console.log('All resource keys:', allResourceKeys);
        
        // Store ALL fields from resource, not just the ones we know about
        for (const key of allResourceKeys) {
          const value = resource[key];
          
          // Skip fields we've already handled explicitly
          if (['public_id', 'format', 'version', 'resource_type', 'type', 'created_at', 'bytes', 'width', 'height', 'url', 'secure_url', 'backup', 'next_cursor', 'derived'].includes(key)) {
            continue;
          }
          
          // Store everything else
          if (value !== null && value !== undefined) {
            // If it's an object/array, store it directly
            if (typeof value === 'object') {
              allMetadata[key] = value;
            } else {
              // Store primitive values too
              allMetadata[key] = value;
            }
          }
        }
        
               // Also explicitly extract known metadata fields for backward compatibility
               if (resource.colors) {
                 allMetadata.colors = resource.colors;
               }
               if (resource.phash) {
                 allMetadata.phash = resource.phash;
               }
               // Face detection disabled - not extracting faces
               // if (resource.faces) {
               //   allMetadata.faces = resource.faces;
               // }
               if (resource.quality_analysis) {
                 allMetadata.quality_analysis = resource.quality_analysis;
               }
        if (resource.cinemagraph_analysis) {
          allMetadata.cinemagraph_analysis = resource.cinemagraph_analysis;
        }
        if (resource.accessibility_analysis) {
          allMetadata.accessibility_analysis = resource.accessibility_analysis;
        }
        if (resource.pages) {
          allMetadata.pages = resource.pages;
        }
        if (resource.metadata) {
          allMetadata.metadata = resource.metadata;
        }
        if (resource.iptc) {
          allMetadata.iptc = { ...allMetadata.iptc, ...resource.iptc };
        }
        if (resource.xmp) {
          allMetadata.xmp = { ...allMetadata.xmp, ...resource.xmp };
        }
        if (resource.gps) {
          allMetadata.gps = { ...allMetadata.gps, ...resource.gps };
        }
        if (resource.context) {
          allMetadata.context = resource.context;
        }
        if (resource.tags) {
          allMetadata.tags = resource.tags;
        }
        if (resource.moderation) {
          allMetadata.moderation = resource.moderation;
        }
        if (resource.ocr) {
          allMetadata.ocr = resource.ocr;
        }
        if (resource.auto_tagging) {
          allMetadata.auto_tagging = resource.auto_tagging;
        }
        if (resource.visual_search) {
          allMetadata.visual_search = resource.visual_search;
        }
        
        console.log('=== EXTRACTED ALL METADATA ===');
        console.log('All metadata keys:', Object.keys(allMetadata));
        try {
          const metadataSize = JSON.stringify(allMetadata).length;
          console.log('Complete metadata object size:', metadataSize, 'characters');
          if (metadataSize < 10000) {
            console.log('Complete metadata object:', JSON.stringify(allMetadata, null, 2));
          } else {
            console.log('Metadata object too large, showing summary:');
            console.log('Keys:', Object.keys(allMetadata));
            console.log('Has complete_resource_response:', !!allMetadata.complete_resource_response);
            console.log('Has image_metadata:', !!allMetadata.image_metadata);
            console.log('Has exif:', !!allMetadata.exif);
            console.log('Has iptc:', !!allMetadata.iptc);
          }
        } catch (e) {
          console.log('Could not stringify metadata (likely circular reference or too large)');
          console.log('Metadata keys:', Object.keys(allMetadata));
        }
        console.log('=== METADATA EXTRACTION COMPLETE ===');
      } catch (metadataError: any) {
        console.error('=== ERROR FETCHING METADATA VIA ADMIN API ===');
        console.error('Error message:', metadataError.message);
        console.error('Error stack:', metadataError.stack);
        console.error('Error name:', metadataError.name);
        console.error('Full error:', metadataError);
        // Fall back to upload response metadata
        console.log('Falling back to upload response metadata only');
      }
    } else {
      console.log('Metadata extraction disabled (extractMetadata = false)');
    }

    return {
      public_id: result.public_id,
      secure_url: result.secure_url,
      width: result.width,
      height: result.height,
      format: result.format,
      resource_type: result.resource_type,
      exif: exifData,
      image_metadata: imageMetadata,
      all_metadata: allMetadata, // Include ALL extracted metadata
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw error;
  }
}

export async function deleteImage(publicId: string): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw error;
  }
}

export function getImageUrl(publicId: string, transformations?: any): string {
  return cloudinary.url(publicId, {
    secure: true,
    ...transformations,
  });
}

