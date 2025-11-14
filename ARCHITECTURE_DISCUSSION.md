# Architecture Discussion - Main Page Editor Drag & Drop

**Date:** After restoring to commit `2271893` (stable version)  
**Context:** Planning drag-and-drop reordering for masthead and featured images in main page editor

---

## Background

### Previous Issue
- Last attempt to implement drag-and-drop reordering for main page editor broke media loading app-wide globally
- Need to be very careful this time to avoid breaking existing functionality

### Current State
- Story images have drag-and-drop reordering working (uses `order_index` in `story_images` table)
- Main page editor (masthead/featured images) does NOT have drag-and-drop yet
- Media loading works correctly across the app

---

## Proposed Implementation Plan

### Phase 1: Database Schema (Safe)
1. Add `masthead_order` and `featured_order` columns to `media` table
   - Both nullable (default NULL)
   - Only set when image is marked as masthead/featured
2. Create migration endpoint (similar to `all_metadata` migration)
3. Initialize existing masthead/featured images with order values

### Phase 2: API Updates (Backward Compatible)
1. Update `/api/media` GET route:
   - When `is_masthead=true`: Order by `masthead_order ASC NULLS LAST, created_at DESC`
   - When `is_featured=true`: Order by `featured_order ASC NULLS LAST, created_at DESC`
   - Otherwise: Keep `created_at DESC` (no change)
2. Add `/api/media/reorder` endpoint for batch order updates (similar to story images)

### Phase 3: UI Implementation
1. Add drag-and-drop to masthead and featured sections in main page editor
2. Use optimistic UI updates (like story images) to prevent page jumps
3. Only update local state; API call happens in background

### Phase 4: Testing
1. Verify existing media loading still works everywhere
2. Test drag-and-drop reordering
3. Test that new images get proper order values

### Safety Measures
- ✅ All changes backward compatible
- ✅ GET route changes only affect filtered queries
- ✅ Migration is optional (columns nullable)
- ✅ Optimistic UI prevents page jumps
- ✅ Error handling reverts on failure

---

## Architecture Clarification

### Current Architecture (Correct by Design)

1. **`media` table:**
   - Repository of all images (single source of truth for image data)
   - Stores Cloudinary info, metadata, caption
   - Has `is_featured` and `is_masthead` flags
   - Has `story_id` (optional reference, can be NULL)

2. **`story_images` table:**
   - Junction table for stories (many-to-many relationship)
   - Allows images to be reused across multiple stories
   - Stores story-specific `order_index` and `caption` (can differ per story)
   - Images are NOT unique - same image can appear in multiple stories

**This architecture is intentional and correct.** The "duplication" is by design:
- `media` = image repository (one row per unique image)
- `story_images` = story-image relationships (allows reusing images with story-specific ordering/captions)

---

## Next Steps

1. **Implement drag-and-drop for main page editor:**
   - Follow the 4-phase plan above
   - Be very careful not to break existing media loading
   - Add `masthead_order` and `featured_order` to `media` table (since these are global, not story-specific)

---

## Files to Review

- `lib/db.ts` - Database schema
- `app/(admin)/api/media/route.ts` - Media API (critical, used app-wide)
- `app/(admin)/api/stories/[id]/images/route.ts` - Story images API
- `app/(admin)/admin/main-page/page.tsx` - Main page editor
- `app/(admin)/admin/stories/[id]/page.tsx` - Story detail (has working drag-and-drop)

---

## Notes

- The `/api/media` route is critical - used throughout the app
- Any changes to it must be backward compatible
- Story images drag-and-drop works well as a reference implementation
- Optimistic UI updates prevent page jumps (important UX consideration)

