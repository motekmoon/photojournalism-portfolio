# Story Details Page Implementation - Approaches Analysis

## Current Situation

- **Existing Admin Route**: `/api/stories/[id]` → Uses numeric ID (e.g., `/api/stories/1`)
- **Link Target**: `/stories/${story.slug}` → Uses string slug (e.g., `/stories/test-story`)
- **Need**: Public API route to fetch story by slug + public story detail page

## Approach Options

### Approach 1: Separate Public API Route (`/api/public/stories/[slug]`)

**Structure:**
```
app/
  api/
    public/
      stories/
        [slug]/
          route.ts
```

**URL:** `/api/public/stories/test-story`

**Pros:**
- ✅ **No route conflicts** - Completely separate path
- ✅ **Clear separation** - Public vs admin routes are distinct
- ✅ **Safe** - Won't interfere with existing admin routes
- ✅ **Easy to test** - Can test independently
- ✅ **No auth required** - Public route, no authentication needed

**Cons:**
- ❌ **Different URL pattern** - Not consistent with admin route pattern
- ❌ **Longer URL** - `/api/public/stories/[slug]` vs `/api/stories/[id]`
- ❌ **Two endpoints** - One for ID, one for slug (but this might be fine)

**Risk Level:** 🟢 **LOW** - Safest option, no chance of breaking existing routes

---

### Approach 2: Modify Existing Route to Handle Both ID and Slug

**Structure:**
```
app/(admin)/api/stories/[id]/route.ts
```

**Modification:** Check if param is numeric (ID) or string (slug)

**URL:** `/api/stories/1` OR `/api/stories/test-story`

**Pros:**
- ✅ **Single endpoint** - One route handles both cases
- ✅ **RESTful** - Same resource, different identifiers
- ✅ **Consistent URL pattern** - Same path structure

**Cons:**
- ❌ **Complex logic** - Need to detect ID vs slug, handle both cases
- ❌ **Potential bugs** - What if slug is numeric? What if ID is string?
- ❌ **Auth confusion** - Admin route but public access needed?
- ❌ **Breaking risk** - Modifying existing working route
- ❌ **Type safety issues** - TypeScript params type becomes ambiguous

**Risk Level:** 🔴 **HIGH** - Modifying working code, complex logic, potential for bugs

---

### Approach 3: Add Query Parameter to Existing GET Route

**Structure:**
```
app/(admin)/api/stories/route.ts
```

**Modification:** Add `?slug=test-story` parameter

**URL:** `/api/stories?slug=test-story`

**Pros:**
- ✅ **Uses existing route** - No new route needed
- ✅ **Simple** - Just add query parameter handling

**Cons:**
- ❌ **Not RESTful** - Mixing list and detail endpoints
- ❌ **Confusing** - GET `/api/stories` returns list, but with slug param returns single?
- ❌ **Auth required** - This is an admin route, needs authentication
- ❌ **Inconsistent** - Different pattern from ID-based lookup

**Risk Level:** 🟡 **MEDIUM** - Works but not ideal design, auth issues

---

### Approach 4: Create `/api/stories/slug/[slug]` Route

**Structure:**
```
app/
  api/
    stories/
      slug/
        [slug]/
          route.ts
```

**URL:** `/api/stories/slug/test-story`

**Pros:**
- ✅ **Clear intent** - Explicitly shows it's slug-based
- ✅ **No conflict** - Different path from `[id]` route
- ✅ **RESTful** - Still under `/api/stories` namespace

**Cons:**
- ❌ **Route conflict potential** - Next.js might confuse `/stories/slug/[slug]` with `/stories/[id]`
- ❌ **Longer URL** - More verbose than needed
- ❌ **Still in admin route group?** - Need to decide if public or admin

**Risk Level:** 🟡 **MEDIUM** - Could work but route matching might be tricky

---

### Approach 5: Create `/api/stories/by-slug/[slug]` Route

**Structure:**
```
app/
  api/
    stories/
      by-slug/
        [slug]/
          route.ts
```

**URL:** `/api/stories/by-slug/test-story`

**Pros:**
- ✅ **Very clear** - Explicitly different from ID route
- ✅ **No conflict** - Completely different path segment
- ✅ **Self-documenting** - URL explains what it does

**Cons:**
- ❌ **Longer URL** - More verbose
- ❌ **Still need to decide** - Public or admin route group?

**Risk Level:** 🟢 **LOW** - Safe, clear, but verbose

---

## Recommendation: **Approach 1** (`/api/public/stories/[slug]`)

**Why:**
1. **Safest** - Zero chance of breaking existing routes
2. **Clear separation** - Public routes are explicitly separate from admin
3. **No auth needed** - Public route, no authentication complexity
4. **Easy to test** - Can test independently without affecting admin
5. **Future-proof** - Easy to add more public routes under `/api/public/`

**Implementation:**
- Create `app/api/public/stories/[slug]/route.ts`
- Public route (no `requireAuth`)
- Fetch by slug, return story + images
- Test thoroughly before creating page component

---

## Story Detail Page Design Requirements

Based on your specifications:

1. **Full bleed featured image** at the top
2. **Overlay** with:
   - Story title
   - Year
   - Location  
   - Narrative text
3. **Additional images** below with captions under each

**Layout:**
```
┌─────────────────────────────┐
│   Full Bleed Featured Image │
│   ┌─────────────────────┐   │
│   │ Title               │   │
│   │ Year • Location     │   │
│   │                     │   │
│   │ Narrative text...   │   │
│   └─────────────────────┘   │
├─────────────────────────────┤
│   Image 1                   │
│   Caption 1                 │
├─────────────────────────────┤
│   Image 2                   │
│   Caption 2                 │
└─────────────────────────────┘
```

