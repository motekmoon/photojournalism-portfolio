export interface Story {
  id: number;
  slug: string;
  title: string;
  year: number | null;
  location: string | null;
  narrative: string | null;
  featured_image_public_id: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface StoryImage {
  id: number;
  story_id: number;
  cloudinary_public_id: string;
  caption: string | null;
  order_index: number;
  created_at: Date;
}

export interface Media {
  id: number;
  cloudinary_public_id: string;
  cloudinary_url: string;
  caption: string | null;
  exif_data: Record<string, any> | null;
  iptc_data: Record<string, any> | null;
  all_metadata?: {
    // Complete resource response from Cloudinary Admin API
    complete_resource_response?: Record<string, any>;
    // Specific fields for easy access
    exif?: Record<string, any>;
    image_metadata?: Record<string, any>;
    exif_full?: Record<string, any>;
    iptc?: Record<string, any>;
    xmp?: Record<string, any>;
    gps?: Record<string, any>;
    colors?: any;
    phash?: string;
    faces?: any;
    quality_analysis?: any;
    cinemagraph_analysis?: any;
    accessibility_analysis?: any;
    pages?: any;
    metadata?: Record<string, any>;
    context?: any;
    tags?: any[];
    moderation?: any;
    ocr?: any;
    auto_tagging?: any;
    visual_search?: any;
    // Any other fields from Cloudinary
    [key: string]: any;
  } | null;
  is_featured: boolean;
  is_masthead: boolean;
  story_id: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface Setting {
  key: string;
  value: any;
  updated_at: Date;
}

export interface Page {
  slug: string;
  content: string;
  updated_at: Date;
}

export interface CloudinaryUploadResult {
  public_id: string;
  secure_url: string;
  width: number;
  height: number;
  format: string;
  resource_type: string;
  exif?: Record<string, any>;
  image_metadata?: Record<string, any>;
  all_metadata?: {
    // Complete resource response from Cloudinary Admin API
    complete_resource_response?: Record<string, any>;
    // Specific fields for easy access
    exif?: Record<string, any>;
    image_metadata?: Record<string, any>;
    exif_full?: Record<string, any>;
    iptc?: Record<string, any>;
    xmp?: Record<string, any>;
    gps?: Record<string, any>;
    colors?: any;
    phash?: string;
    faces?: any;
    quality_analysis?: any;
    cinemagraph_analysis?: any;
    accessibility_analysis?: any;
    pages?: any;
    metadata?: Record<string, any>;
    context?: any;
    tags?: any[];
    moderation?: any;
    ocr?: any;
    auto_tagging?: any;
    visual_search?: any;
    // Any other fields from Cloudinary
    [key: string]: any;
  };
}

