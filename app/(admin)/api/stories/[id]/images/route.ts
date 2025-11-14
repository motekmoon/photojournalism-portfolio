import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// POST add image to story
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const isAuthenticated = await requireAuth(request);
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { cloudinary_public_id, caption, order_index } = body;

    if (!cloudinary_public_id) {
      return NextResponse.json(
        { error: 'cloudinary_public_id is required' },
        { status: 400 }
      );
    }

    const insertImage = `
      INSERT INTO story_images (story_id, cloudinary_public_id, caption, order_index)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const image = await query(insertImage, [
      id,
      cloudinary_public_id,
      caption || null,
      order_index || 0,
    ]);

    // Update media table to link to story
    await query(
      `UPDATE media SET story_id = $1 WHERE cloudinary_public_id = $2`,
      [id, cloudinary_public_id]
    );

    return NextResponse.json({ image: image[0] }, { status: 201 });
  } catch (error: any) {
    console.error('Error adding image to story:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to add image' },
      { status: 500 }
    );
  }
}

// PUT update image order
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const isAuthenticated = await requireAuth(request);
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { images } = body; // Array of { id, order_index }

    if (!Array.isArray(images)) {
      return NextResponse.json(
        { error: 'images array is required' },
        { status: 400 }
      );
    }

    // Update order and caption for each image
    for (const img of images) {
      const updateFields: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (img.order_index !== undefined) {
        updateFields.push(`order_index = $${paramIndex}`);
        params.push(img.order_index);
        paramIndex++;
      }

      if (img.caption !== undefined) {
        updateFields.push(`caption = $${paramIndex}`);
        params.push(img.caption);
        paramIndex++;
      }

      if (updateFields.length > 0) {
        params.push(img.id, id);
        await query(
          `UPDATE story_images 
           SET ${updateFields.join(', ')} 
           WHERE id = $${paramIndex} AND story_id = $${paramIndex + 1}`,
          params
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating image order:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update image order' },
      { status: 500 }
    );
  }
}

// DELETE batch story images
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const isAuthenticated = await requireAuth(request);
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { imageIds } = body; // Array of story_image IDs

    if (!Array.isArray(imageIds) || imageIds.length === 0) {
      return NextResponse.json(
        { error: 'imageIds array is required' },
        { status: 400 }
      );
    }

    // Delete story images
    await query(
      'DELETE FROM story_images WHERE id = ANY($1) AND story_id = $2',
      [imageIds, id]
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting story images:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete story images' },
      { status: 500 }
    );
  }
}

