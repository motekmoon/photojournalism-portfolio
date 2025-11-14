import { sql } from '@vercel/postgres';

export async function query<T = any>(queryText: string, params?: any[]): Promise<T[]> {
  try {
    const result = await sql.query(queryText, params);
    return result.rows as T[];
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

export async function queryOne<T = any>(queryText: string, params?: any[]): Promise<T | null> {
  const results = await query<T>(queryText, params);
  return results[0] || null;
}

// Database schema initialization
export async function initializeSchema() {
  const createStoriesTable = `
    CREATE TABLE IF NOT EXISTS stories (
      id SERIAL PRIMARY KEY,
      slug VARCHAR(255) UNIQUE NOT NULL,
      title VARCHAR(255) NOT NULL,
      year INTEGER,
      location VARCHAR(255),
      narrative TEXT,
      featured_image_public_id VARCHAR(255),
      is_featured BOOLEAN DEFAULT FALSE,
      featured_order INTEGER,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `;

  const createStoryImagesTable = `
    CREATE TABLE IF NOT EXISTS story_images (
      id SERIAL PRIMARY KEY,
      story_id INTEGER REFERENCES stories(id) ON DELETE CASCADE,
      cloudinary_public_id VARCHAR(255) NOT NULL,
      caption TEXT,
      order_index INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `;

  const createMediaTable = `
    CREATE TABLE IF NOT EXISTS media (
      id SERIAL PRIMARY KEY,
      cloudinary_public_id VARCHAR(255) UNIQUE NOT NULL,
      cloudinary_url TEXT NOT NULL,
      caption TEXT,
      exif_data JSONB,
      iptc_data JSONB,
      all_metadata JSONB,
      is_featured BOOLEAN DEFAULT FALSE,
      is_masthead BOOLEAN DEFAULT FALSE,
      masthead_order INTEGER,
      featured_order INTEGER,
      story_id INTEGER REFERENCES stories(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `;

  // Add all_metadata column if it doesn't exist (for existing databases)
  const addAllMetadataColumn = `
    DO $$ 
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'media' AND column_name = 'all_metadata'
      ) THEN
        ALTER TABLE media ADD COLUMN all_metadata JSONB;
      END IF;
    END $$;
  `;

  // Add order columns if they don't exist (for existing databases)
  const addOrderColumns = `
    DO $$ 
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'media' AND column_name = 'masthead_order'
      ) THEN
        ALTER TABLE media ADD COLUMN masthead_order INTEGER;
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'media' AND column_name = 'featured_order'
      ) THEN
        ALTER TABLE media ADD COLUMN featured_order INTEGER;
      END IF;
    END $$;
  `;

  // Add featured columns to stories table if they don't exist
  const addStoryFeaturedColumns = `
    DO $$ 
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'stories' AND column_name = 'is_featured'
      ) THEN
        ALTER TABLE stories ADD COLUMN is_featured BOOLEAN DEFAULT FALSE;
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'stories' AND column_name = 'featured_order'
      ) THEN
        ALTER TABLE stories ADD COLUMN featured_order INTEGER;
      END IF;
    END $$;
  `;

  const createSettingsTable = `
    CREATE TABLE IF NOT EXISTS settings (
      key VARCHAR(255) PRIMARY KEY,
      value JSONB NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `;

  const createPagesTable = `
    CREATE TABLE IF NOT EXISTS pages (
      slug VARCHAR(255) PRIMARY KEY,
      content TEXT NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `;

  try {
    await query(createStoriesTable);
    await query(createStoryImagesTable);
    await query(createMediaTable);
    await query(addAllMetadataColumn); // Add all_metadata column if needed
    await query(addOrderColumns); // Add order columns if needed
    await query(addStoryFeaturedColumns); // Add featured columns to stories if needed
    await query(createSettingsTable);
    await query(createPagesTable);
    console.log('Database schema initialized successfully');
  } catch (error) {
    console.error('Error initializing database schema:', error);
    throw error;
  }
}

