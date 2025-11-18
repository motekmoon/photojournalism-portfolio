import { NextRequest, NextResponse } from 'next/server';
import { uploadImage } from '@/lib/cloudinary';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const isAuthenticated = await requireAuth(request);
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const folder = formData.get('folder') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Convert File to Buffer
    const bytes = await file.arrayBuffer();
    let buffer = Buffer.from(bytes);

    // Check file size and compress if needed
    // Vercel has a 4.5MB limit for serverless function request bodies
    // Cloudinary has a 10MB limit for uploads
    // So we need to compress files over 4MB to ensure they pass Vercel's limit
    const VERCEL_MAX_SIZE = 4 * 1024 * 1024; // 4MB (slightly under 4.5MB limit for safety)
    const CLOUDINARY_MAX_SIZE = 10 * 1024 * 1024; // 10MB (Cloudinary's limit)
    const originalSize = buffer.length;
    
    console.log(`Upload attempt: ${file.name}, size: ${(originalSize / 1024 / 1024).toFixed(2)}MB`);
    
    // Compress if file is larger than Vercel's limit (4MB)
    if (buffer.length > VERCEL_MAX_SIZE) {
      try {
        // Use sharp to compress/resize the image
        const sharp = (await import('sharp')).default;
        const image = sharp(buffer);
        const metadata = await image.metadata();
        
        // CRITICAL: Preserve original format to maintain metadata compatibility
        // JPEG preserves EXIF/IPTC/XMP best, so if original is JPEG, keep it as JPEG
        const isJpeg = metadata.format === 'jpeg' || metadata.format === 'jpg';
        const isPng = metadata.format === 'png';
        const isWebp = metadata.format === 'webp';
        
        // IMPORTANT: Use withMetadata() BEFORE any operations to preserve EXIF, IPTC, XMP, and GPS data
        // This must be called first to ensure metadata is preserved through all transformations
        let processedImage = image
          .withMetadata() // Preserve all metadata (EXIF, IPTC, XMP, GPS) - MUST be called first
          .resize(4000, 4000, {
            fit: 'inside',
            withoutEnlargement: true,
          });

        // Preserve original format - don't convert unless necessary
        // JPEG format preserves EXIF/IPTC/XMP metadata best
        if (isJpeg) {
          // Keep as JPEG - best for metadata preservation
          processedImage = processedImage.jpeg({ quality: 85, mozjpeg: true });
        } else if (isPng) {
          processedImage = processedImage.png({ quality: 90, compressionLevel: 9 });
        } else if (isWebp) {
          processedImage = processedImage.webp({ quality: 85 });
        } else {
          // For unknown formats, convert to JPEG (preserves metadata better than PNG/WebP)
          processedImage = processedImage.jpeg({ quality: 85, mozjpeg: true });
        }

        buffer = Buffer.from(await processedImage.toBuffer());

        // If still too large, compress more aggressively (but keep metadata)
        if (buffer.length > VERCEL_MAX_SIZE) {
          processedImage = sharp(buffer)
            .withMetadata() // Preserve all metadata through second compression pass
            .resize(2500, 2500, {
              fit: 'inside',
              withoutEnlargement: true,
            });
          
          // Preserve format - more aggressive quality
          if (isJpeg) {
            processedImage = processedImage.jpeg({ quality: 70, mozjpeg: true });
          } else if (isPng) {
            processedImage = processedImage.png({ quality: 75, compressionLevel: 9 });
          } else if (isWebp) {
            processedImage = processedImage.webp({ quality: 70 });
          } else {
            processedImage = processedImage.jpeg({ quality: 70, mozjpeg: true });
          }
          
          buffer = Buffer.from(await processedImage.toBuffer());
        }

        // If still too large, one more aggressive compression (but keep metadata)
        if (buffer.length > VERCEL_MAX_SIZE) {
          processedImage = sharp(buffer)
            .withMetadata() // Preserve all metadata through third compression pass
            .resize(2000, 2000, {
              fit: 'inside',
              withoutEnlargement: true,
            });
          
          // Preserve format - even more aggressive quality
          if (isJpeg) {
            processedImage = processedImage.jpeg({ quality: 65, mozjpeg: true });
          } else if (isPng) {
            processedImage = processedImage.png({ quality: 70, compressionLevel: 9 });
          } else if (isWebp) {
            processedImage = processedImage.webp({ quality: 65 });
          } else {
            processedImage = processedImage.jpeg({ quality: 65, mozjpeg: true });
          }
          
          buffer = Buffer.from(await processedImage.toBuffer());
        }
        
        // Last resort - very aggressive compression
        if (buffer.length > VERCEL_MAX_SIZE) {
          processedImage = sharp(buffer)
            .withMetadata() // Preserve all metadata through fourth compression pass
            .resize(1500, 1500, {
              fit: 'inside',
              withoutEnlargement: true,
            });
          
          // Preserve format - maximum compression
          if (isJpeg) {
            processedImage = processedImage.jpeg({ quality: 60, mozjpeg: true });
          } else if (isPng) {
            processedImage = processedImage.png({ quality: 65, compressionLevel: 9 });
          } else if (isWebp) {
            processedImage = processedImage.webp({ quality: 60 });
          } else {
            processedImage = processedImage.jpeg({ quality: 60, mozjpeg: true });
          }
          
          buffer = Buffer.from(await processedImage.toBuffer());
        }

        console.log(`Compressed image from ${(originalSize / 1024 / 1024).toFixed(2)}MB to ${(buffer.length / 1024 / 1024).toFixed(2)}MB (metadata preserved)`);
      } catch (sharpError) {
        console.warn('Sharp compression failed:', sharpError);
        // If sharp fails and file is still too large, return error
        if (buffer.length > VERCEL_MAX_SIZE) {
          return NextResponse.json(
            { 
              error: `File is too large (${(buffer.length / 1024 / 1024).toFixed(2)}MB). Maximum size is 4MB for upload. Please compress the image before uploading.` 
            },
            { status: 413 }
          );
        }
      }
    }
    
    // Final check - if still too large after compression, reject
    if (buffer.length > VERCEL_MAX_SIZE) {
      return NextResponse.json(
        { 
          error: `File is too large (${(buffer.length / 1024 / 1024).toFixed(2)}MB). Maximum size is 4MB for upload. Please compress the image before uploading.` 
        },
        { status: 413 }
      );
    }

    // Upload to Cloudinary with metadata extraction
    let result: any;
    try {
      // Log environment variable status (without exposing secrets)
      console.log('Cloudinary env check:', {
        cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ? 'set' : 'missing',
        api_key: process.env.CLOUDINARY_API_KEY ? `set (${process.env.CLOUDINARY_API_KEY.substring(0, 6)}...)` : 'missing',
        api_secret: process.env.CLOUDINARY_API_SECRET ? 'set' : 'missing',
        cloudinary_url: process.env.CLOUDINARY_URL ? 'set' : 'missing',
      });
      
      result = await uploadImage(buffer, {
        folder: folder || 'portfolio',
        extractMetadata: true,
      });
      
      // Validate upload result
      if (!result || !result.public_id) {
        console.error('Upload result is invalid:', result);
        throw new Error('Cloudinary upload returned invalid result - missing public_id');
      }
      
      console.log('=== CLOUDINARY UPLOAD SUCCESS ===');
      console.log('Public ID:', result.public_id);
      console.log('Secure URL:', result.secure_url);
      console.log('URL:', result.url);
      console.log('Format:', result.format);
      console.log('Width:', result.width);
      console.log('Height:', result.height);
      console.log('Bytes:', result.bytes);
      
      // Verify the image is accessible
      if (!result.secure_url && !result.url) {
        console.error('Upload result missing URL:', result);
        throw new Error('Cloudinary upload returned invalid result - missing URL');
      }
    } catch (uploadError: any) {
      console.error('Error uploading to Cloudinary:', uploadError);
      console.error('Upload error details:', {
        message: uploadError.message,
        http_code: uploadError.http_code,
        name: uploadError.name,
        error: uploadError.error,
      });
      
      // Provide more helpful error messages
      if (uploadError.message?.includes('Unknown API key')) {
        throw new Error(`Cloudinary authentication failed: Please verify your API key and secret are correct and match your Cloudinary account.`);
      }
      if (uploadError.http_code === 401) {
        throw new Error(`Cloudinary authentication failed: Invalid API credentials. Please check your CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.`);
      }
      
      throw new Error(`Cloudinary upload failed: ${uploadError.message || 'Unknown error'}`);
    }

    // Extract ALL metadata from result - with safety checks
    const allMetadata = (result && result.all_metadata) ? result.all_metadata : {};
    const exifData = (result && result.exif) ? result.exif : (allMetadata && allMetadata.exif ? allMetadata.exif : {});
    // imageMetadata is the full image_metadata object (contains IPTC, Exif, XMP, GPS nested structures)
    const imageMetadata = (result && result.image_metadata) ? result.image_metadata : (allMetadata && allMetadata.image_metadata ? allMetadata.image_metadata : {});
    // iptcData is specifically the IPTC portion (could be nested in imageMetadata.IPTC or direct)
    const iptcData = (imageMetadata && imageMetadata.IPTC) ? imageMetadata.IPTC : (allMetadata && allMetadata.iptc ? allMetadata.iptc : (imageMetadata || {}));
    const contextData = (result && result.context) ? result.context : {};
    
    // Log full result structure for debugging (with error handling)
    try {
      console.log('=== CLOUDINARY UPLOAD RESULT - ALL METADATA ===');
      console.log('Full result keys:', result ? Object.keys(result) : 'No result');
      console.log('Has all_metadata:', !!(result && result.all_metadata));
      
      // Safe JSON stringify with error handling
      try {
        console.log('ALL METADATA:', JSON.stringify(allMetadata, null, 2));
      } catch (e) {
        console.log('ALL METADATA (stringify failed):', 'Object too large or circular reference');
        console.log('ALL METADATA keys:', Object.keys(allMetadata));
      }
      
      try {
        console.log('EXIF data:', JSON.stringify(exifData, null, 2));
      } catch (e) {
        console.log('EXIF data (stringify failed)');
      }
      
      try {
        console.log('Image metadata:', JSON.stringify(iptcData, null, 2));
      } catch (e) {
        console.log('Image metadata (stringify failed)');
      }
      
      try {
        console.log('Context data:', JSON.stringify(contextData, null, 2));
      } catch (e) {
        console.log('Context data (stringify failed)');
      }
      
      console.log('Result structure sample:', {
        hasExif: !!(result && result.exif),
        hasImageMetadata: !!(result && result.image_metadata),
        hasAllMetadata: !!(result && result.all_metadata),
        hasContext: !!(result && result.context),
        hasMetadata: !!(result && result.metadata),
        exifType: result && result.exif ? typeof result.exif : 'undefined',
        imageMetadataType: result && result.image_metadata ? typeof result.image_metadata : 'undefined',
        allMetadataType: result && result.all_metadata ? typeof result.all_metadata : 'undefined',
        exifKeys: result && result.exif ? Object.keys(result.exif) : [],
        imageMetadataKeys: result && result.image_metadata ? Object.keys(result.image_metadata) : [],
        allMetadataKeys: result && result.all_metadata ? Object.keys(result.all_metadata) : [],
        contextKeys: result && result.context ? Object.keys(result.context) : [],
        allKeys: result ? Object.keys(result).filter(k => k.toLowerCase().includes('meta') || k.toLowerCase().includes('exif') || k.toLowerCase().includes('iptc')) : [],
      });
    } catch (logError: any) {
      console.error('Error logging metadata:', logError);
      // Continue execution even if logging fails
    }

    // Extract only specific metadata fields: caption, image detail, details, creator, date, image title, location
    // Helper function to extract a field value from metadata objects
    const extractField = (obj: any, fieldNames: string[]): string | null => {
      if (!obj || typeof obj !== 'object') return null;
      
      for (const field of fieldNames) {
        // Try exact match
        if (obj[field] && typeof obj[field] === 'string' && obj[field].trim()) {
          return obj[field].trim();
        }
        // Try case-insensitive match
        for (const key in obj) {
          if (obj.hasOwnProperty(key) && key.toLowerCase() === field.toLowerCase()) {
            const value = obj[key];
            if (typeof value === 'string' && value.trim()) {
              return value.trim();
            }
          }
        }
      }
      return null;
    };
    
    // Helper function to recursively search for a field in nested objects
    const searchField = (obj: any, fieldNames: string[], depth = 0): string | null => {
      if (!obj || typeof obj !== 'object' || depth > 5) return null;
      
      // Check direct fields
      const found = extractField(obj, fieldNames);
      if (found) return found;
      
      // Recursively search nested objects
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          const value = obj[key];
          if (value && typeof value === 'object' && !Array.isArray(value)) {
            const nested = searchField(value, fieldNames, depth + 1);
            if (nested) return nested;
          }
        }
      }
      
      return null;
    };
    
    // Define field mappings for each metadata type
    const fieldMappings = {
      caption: [
        // IPTC
        'Caption-Abstract', 'caption-abstract', 'Caption', 'caption', 'CAPTION',
        // EXIF
        'ImageDescription', 'image-description', 'Image Description', 'IMAGE_DESCRIPTION',
        // XMP
        'dc:description', 'xmp:Description',
        // Common
        'description', 'Description', 'DESCRIPTION',
      ],
      imageDetail: [
        // IPTC
        'Caption-Abstract', 'caption-abstract',
        // EXIF
        'ImageDescription', 'UserComment', 'XPComment',
        // XMP
        'dc:description', 'xmp:Description',
      ],
      details: [
        // IPTC
        'Caption-Abstract', 'Description',
        // EXIF
        'ImageDescription', 'UserComment', 'XPComment', 'XPSubject',
        // XMP
        'dc:description', 'dc:subject', 'xmp:Description',
      ],
      creator: [
        // IPTC
        'By-line', 'by-line', 'ByLine', 'byline', 'Creator', 'creator',
        // EXIF
        'Artist', 'artist', 'ARTIST', 'Copyright', 'copyright',
        // XMP
        'dc:creator', 'photoshop:AuthorsPosition', 'xmp:Creator',
      ],
      date: [
        // IPTC
        'DateCreated', 'date-created', 'Date Created', 'CreationDate',
        // EXIF
        'DateTimeOriginal', 'datetime-original', 'DateTime', 'CreateDate', 'ModifyDate',
        // XMP
        'dc:date', 'xmp:CreateDate', 'xmp:DateCreated',
      ],
      imageTitle: [
        // IPTC
        'Headline', 'headline', 'HEADLINE', 'Title', 'title', 'ObjectName',
        // EXIF
        'XPTitle', 'xp-title', 'XP Title', 'DocumentName',
        // XMP
        'dc:title', 'xmp:Title', 'photoshop:Headline',
      ],
      location: [
        // IPTC
        'City', 'city', 'Province-State', 'province-state', 'Country', 'country',
        'Location', 'location', 'Sublocation', 'sublocation',
        // EXIF
        'GPSLatitude', 'GPSLongitude', 'GPSLatitudeRef', 'GPSLongitudeRef',
        // XMP
        'photoshop:City', 'photoshop:State', 'photoshop:Country',
        'Iptc4xmpCore:Location', 'Iptc4xmpCore:CountryCode',
      ],
    };
    
    // Extract all fields from metadata
    const extractedMetadata: any = {
      caption: null,
      imageDetail: null,
      details: null,
      creator: null,
      date: null,
      imageTitle: null,
      location: null,
    };
    
    // Search in all metadata sources
    const searchSources = [
      imageMetadata?.IPTC,
      imageMetadata?.Exif,
      imageMetadata?.XMP,
      allMetadata?.iptc,
      allMetadata?.exif,
      allMetadata?.exif_full,
      allMetadata?.xmp,
      allMetadata?.image_metadata?.IPTC,
      allMetadata?.image_metadata?.Exif,
      allMetadata?.image_metadata?.XMP,
      allMetadata?.complete_resource_response?.image_metadata?.IPTC,
      allMetadata?.complete_resource_response?.image_metadata?.Exif,
      allMetadata?.complete_resource_response?.image_metadata?.XMP,
      iptcData,
      exifData,
      contextData,
    ];
    
    // Extract each field
    for (const [fieldName, fieldVariants] of Object.entries(fieldMappings)) {
      for (const source of searchSources) {
        if (source) {
          const value = searchField(source, fieldVariants);
          if (value && !extractedMetadata[fieldName]) {
            extractedMetadata[fieldName] = value;
            console.log(`Found ${fieldName}: ${value.substring(0, 50)}...`);
            break;
          }
        }
      }
    }
    
    // Use caption as the primary caption field
    const caption = extractedMetadata.caption || extractedMetadata.imageDetail || extractedMetadata.details || null;
    
    console.log('=== METADATA EXTRACTION RESULT ===');
    console.log('Extracted metadata:', extractedMetadata);

    // Prepare metadata for database storage - only store the extracted fields
    let extractedMetadataJson = null;
    
    try {
      // Only store the extracted metadata fields (remove null values)
      const cleanMetadata: any = {};
      for (const [key, value] of Object.entries(extractedMetadata)) {
        if (value !== null && value !== undefined) {
          cleanMetadata[key] = value;
    }
      }
      
      extractedMetadataJson = Object.keys(cleanMetadata).length > 0 
        ? JSON.stringify(cleanMetadata) 
        : null;
    } catch (error: any) {
      console.error('Error stringifying extracted metadata:', error);
      extractedMetadataJson = null;
    }
    
    // For backward compatibility, also store in exif_data and iptc_data (but only the extracted fields)
    const exifDataJson = extractedMetadataJson;
    const iptcDataJson = extractedMetadataJson;
    const allMetadataJson = extractedMetadataJson;
    
    // Save to database - store ALL metadata in all_metadata column
    // Try with all_metadata column first, fallback if it doesn't exist
    let insertMedia = `
      INSERT INTO media (
        cloudinary_public_id,
        cloudinary_url,
        caption,
        exif_data,
        iptc_data,
        all_metadata
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (cloudinary_public_id) 
      DO UPDATE SET
        cloudinary_url = EXCLUDED.cloudinary_url,
        caption = EXCLUDED.caption,
        exif_data = EXCLUDED.exif_data,
        iptc_data = EXCLUDED.iptc_data,
        all_metadata = EXCLUDED.all_metadata,
        updated_at = NOW()
      RETURNING *
    `;

    let params: any[] = [
      result.public_id,
      result.secure_url,
      caption,
      exifDataJson,
      iptcDataJson,
      allMetadataJson,
    ];

    let media;
    try {
      media = await query(insertMedia, params);
    } catch (error: any) {
      // If the query fails because column doesn't exist, try fallback
      if (error.message?.includes('all_metadata') || error.message?.includes('column') || error.message?.includes('does not exist')) {
        console.warn('all_metadata column not found, using fallback:', error.message);
        insertMedia = `
          INSERT INTO media (
            cloudinary_public_id,
            cloudinary_url,
            caption,
            exif_data,
            iptc_data
          ) VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (cloudinary_public_id) 
          DO UPDATE SET
            cloudinary_url = EXCLUDED.cloudinary_url,
            caption = EXCLUDED.caption,
            exif_data = EXCLUDED.exif_data,
            iptc_data = EXCLUDED.iptc_data,
            updated_at = NOW()
          RETURNING *
        `;
        params = [
          result.public_id,
          imageUrl,
          caption,
          exifDataJson,
          allMetadataJson || iptcDataJson, // Store all metadata in iptc_data if column doesn't exist
        ];
        media = await query(insertMedia, params);
      } else {
        // Re-throw if it's a different error
        throw error;
      }
    }

    console.log('=== SAVED TO DATABASE ===');
    console.log('Public ID:', result.public_id);
    console.log('Caption:', caption || 'NULL');
    console.log('Has EXIF data:', !!exifDataJson);
    console.log('Has IPTC data:', !!iptcDataJson);
    console.log('Has ALL metadata:', !!allMetadataJson);
    console.log('Metadata size:', allMetadataJson ? allMetadataJson.length : 0, 'characters');
    console.log('Media ID:', media[0]?.id);
    
    // Log a summary of what metadata was extracted
    if (allMetadataJson) {
      try {
        const metadata = JSON.parse(allMetadataJson);
        console.log('Metadata keys extracted:', Object.keys(metadata));
        console.log('Has complete_resource_response:', !!metadata.complete_resource_response);
        console.log('Has image_metadata:', !!metadata.image_metadata);
        console.log('Has exif:', !!metadata.exif);
        console.log('Has iptc:', !!metadata.iptc);
        console.log('Has xmp:', !!metadata.xmp);
        console.log('Has gps:', !!metadata.gps);
        console.log('Has colors:', !!metadata.colors);
        console.log('Has faces:', !!metadata.faces);
      } catch (e) {
        console.log('Could not parse metadata for summary');
      }
    }

    return NextResponse.json({
      success: true,
      media: media[0],
      uploadResult: result,
    });
  } catch (error: any) {
    console.error('=== UPLOAD ERROR ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Error name:', error.name);
    console.error('Full error:', error);
    
    // Return detailed error that will show in browser console
    const errorDetails = {
      message: error.message || 'Upload failed',
      name: error.name || 'Error',
      stack: error.stack || 'No stack trace',
    };
    
    // In development, return full error details
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.json(
        { 
          error: error.message || 'Upload failed',
          details: errorDetails,
          stack: error.stack,
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || 'Upload failed' },
      { status: 500 }
    );
  }
}

