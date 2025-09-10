# Seasons API Documentation

## Overview
The Seasons API manages Our Seasons & Board section data, following the same patterns as other MIND-X backend sections (Timeline, Awards, etc.).

## Database Model

### Season Schema
```javascript
{
  academicYear: String (required, unique, format: "YYYY/YY")
  theme: String (required, max 200 chars)
  coverImage: { url, public_id }
  badgeColor: String (hex color, default: "#606161")
  isActive: Boolean (default: true)
  order: Number (for sorting, default: 0)
  boardMembers: [BoardMemberSchema] (1-10 members, max 1 leader)
  highlights: [HighlightSchema]
  timestamps: true
}
```

### Board Member Schema (Embedded)
```javascript
{
  name: String (required, max 100 chars)
  position: String (required, max 100 chars)
  isLeader: Boolean (default: false, only one per season)
  avatar: { url, public_id }
  order: Number (for sorting)
}
```

### Highlight Schema (Embedded)
```javascript
{
  text: String (required, max 500 chars)
  order: Number (for sorting)
}
```

## API Endpoints

### Public Endpoints
- `GET /api/seasons` - Get all active seasons
- `GET /api/seasons/year/:academicYear` - Get season by academic year
- `GET /api/seasons/:id` - Get season by ID

### Admin Endpoints (Auth Required)

#### Seasons Management
- `GET /api/seasons/admin/all` - Get all seasons (including inactive)
- `POST /api/seasons/admin` - Create new season
- `PUT /api/seasons/admin/:id` - Update season
- `DELETE /api/seasons/admin/:id` - Delete season (cascades images)
- `PUT /api/seasons/admin/reorder/batch` - Reorder seasons

#### Image Management
- `POST /api/seasons/admin/:id/cover-image` - Upload cover image
- `DELETE /api/seasons/admin/:id/cover-image` - Delete cover image
- `POST /api/seasons/admin/:id/board-members/:memberId/avatar` - Upload member avatar

#### Board Members Management
- `POST /api/seasons/admin/:id/board-members` - Add board member
- `PUT /api/seasons/admin/:id/board-members/:memberId` - Update board member
- `DELETE /api/seasons/admin/:id/board-members/:memberId` - Delete board member
- `PUT /api/seasons/admin/:id/board-members/reorder` - Reorder board members
- `PUT /api/seasons/admin/:id/set-leader/:memberId` - Set member as leader

#### Highlights Management
- `POST /api/seasons/admin/:id/highlights` - Add highlight
- `PUT /api/seasons/admin/:id/highlights/:highlightId` - Update highlight
- `DELETE /api/seasons/admin/:id/highlights/:highlightId` - Delete highlight
- `PUT /api/seasons/admin/:id/highlights/reorder` - Reorder highlights

## Business Rules

1. **Academic Year Format**: Must follow "YYYY/YY" pattern (e.g., "2020/21")
2. **Unique Academic Years**: No duplicate academic years allowed
3. **Board Members**: 1-10 members per season, exactly one leader
4. **Leader Management**: Setting new leader automatically removes leader status from others
5. **Order Management**: Auto-assigned incrementally, supports manual reordering
6. **Image Management**: Cloudinary integration with automatic cleanup on deletion
7. **Cascade Deletion**: Deleting season removes all associated images

## Frontend Integration

### Service Functions
Import from `services/seasonsAPI.js`:

```javascript
// Public functions
import { getSeasons, getSeasonByYear, getSeasonById } from './services/seasonsAPI';

// Admin functions
import { 
  createSeason, updateSeason, deleteSeason,
  addBoardMember, updateBoardMember, deleteBoardMember,
  addHighlight, updateHighlight, deleteHighlight,
  uploadCoverImage, uploadMemberAvatar
} from './services/seasonsAPI';
```

### React Query Hook
```javascript
import { useSeasonsData } from './components/our-story/SeasonsSection/hooks/useSeasonsData';

const { data: seasons, isLoading, error } = useSeasonsData();
```

## Seeding

Run the seeding script to populate with sample data:

```bash
cd backend
npm run seed:seasons
```

This creates 4 sample seasons (2020/21 through 2023/24) with realistic board members and highlights.

## File Structure

```
backend/
├── models/Season.mjs                 # Database model
├── routes/seasons.mjs                # API routes & controllers
└── scripts/seedSeasons.js            # Seeding script

frontend/
├── src/services/seasonsAPI.js        # API service functions
└── src/components/our-story/SeasonsSection/
    └── hooks/useSeasonsData.js       # React Query hook
```

## Integration with Existing System

The Seasons API seamlessly integrates with the existing MIND-X backend:
- Uses same authentication middleware (`authMiddleware`)
- Follows same error handling patterns (`asyncHandler`)
- Uses same Cloudinary configuration
- Follows same route and controller patterns
- Maintains consistency with Awards and Timeline sections
