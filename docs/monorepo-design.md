# Monorepo Design for Fluorite-Flake

## Architecture Overview

The monorepo structure will support mobile/desktop applications with an integrated Next.js backend that provides GraphQL API, authentication, and admin panel.

## Project Structure

```
project-root/
├── apps/
│   ├── backend/                    # Next.js API + Admin Panel
│   │   ├── app/                   # Next.js App Router
│   │   │   ├── api/              # REST API endpoints (if needed)
│   │   │   ├── graphql/          # GraphQL API endpoint
│   │   │   ├── admin/            # Admin panel pages
│   │   │   └── (auth)/           # Auth pages
│   │   ├── lib/                  # Backend utilities
│   │   │   ├── auth/             # BetterAuth setup
│   │   │   ├── graphql/          # GraphQL schema & resolvers
│   │   │   ├── db/               # Database client & models
│   │   │   └── storage/          # Storage utilities
│   │   ├── components/           # Admin UI components
│   │   └── prisma/ or drizzle/   # Database schema
│   │
│   └── frontend/                  # Mobile/Desktop App (Expo/Flutter/Tauri)
│       ├── src/                  # App source code
│       │   ├── screens/          # App screens
│       │   ├── components/       # UI components
│       │   ├── graphql/          # GraphQL client & queries
│       │   ├── auth/             # Authentication logic
│       │   └── navigation/       # Navigation setup
│       └── [platform-specific]   # Platform configs
│
├── packages/                      # Shared packages
│   ├── graphql-types/            # Generated GraphQL types
│   ├── shared-types/             # Shared TypeScript types
│   └── config/                   # Shared configurations
│
├── turbo.json or nx.json         # Monorepo build config
├── pnpm-workspace.yaml            # PNPM workspace config
└── package.json                   # Root package.json
```

## Technology Stack

### Backend (Next.js)
- **Framework**: Next.js 14+ with App Router
- **GraphQL**: Apollo Server or GraphQL Yoga
- **Authentication**: BetterAuth with session management
- **Database**: Turso or Supabase (user choice)
- **ORM**: Prisma or Drizzle (user choice)
- **Storage**: Vercel Blob or Supabase Storage (user choice)
- **Admin UI**: Shadcn/ui components with dashboard templates

### Frontend Options
1. **Expo** (React Native)
   - Expo SDK 50+
   - Apollo Client for GraphQL
   - Expo SecureStore for auth tokens
   - Expo Router for navigation

2. **Flutter**
   - Flutter 3.0+
   - graphql_flutter package
   - flutter_secure_storage for auth
   - GoRouter for navigation

3. **Tauri** (Desktop + Web)
   - Tauri 2.0+
   - Apollo Client for GraphQL
   - Tauri secure storage API
   - React Router or TanStack Router

## Features at Generation

### Backend Features
1. **GraphQL API**
   - Authentication mutations (login, logout, register)
   - User queries and mutations
   - Organization management
   - Profile management

2. **Admin Panel**
   - Dashboard with metrics
   - User management table
   - Organization management
   - Profile editing
   - Settings page

3. **Authentication System**
   - JWT-based authentication
   - Session management
   - Role-based access control
   - Multi-tenant support (organizations)

### Frontend Features
1. **Authentication Flow**
   - Login screen
   - Registration screen
   - Password reset
   - Session persistence

2. **Dashboard**
   - Welcome screen with user info
   - Basic metrics/stats
   - Quick actions menu
   - Profile section

3. **GraphQL Integration**
   - Type-safe queries/mutations
   - Authentication headers
   - Error handling
   - Offline support (optional)

## Generation Flow

### CLI Prompts Sequence

1. **Framework Selection**
   ```
   Which framework would you like to use?
   > Expo (Mobile)
   > Flutter (Mobile)
   > Tauri (Desktop)
   > Next.js (Web only)
   ```

2. **Project Structure**
   ```
   How would you like to structure your project?
   > Monorepo with backend (Recommended for mobile/desktop apps)
   > Standalone app
   ```

3. **If Monorepo Selected**
   ```
   Configure your backend (Next.js):

   Database:
   > Turso (SQLite)
   > Supabase (PostgreSQL)

   ORM:
   > Prisma
   > Drizzle

   Storage:
   > Vercel Blob
   > Supabase Storage
   > None

   Monorepo Tool:
   > Turborepo (Recommended)
   > Nx
   > PNPM Workspaces only
   ```

4. **Authentication Setup**
   ```
   Configure authentication:
   > Full auth with admin panel (Recommended)
   > Basic auth only
   > No authentication
   ```

## Implementation Plan

### Phase 1: Core Structure
1. Create monorepo generator
2. Setup workspace configuration (Turborepo/Nx/PNPM)
3. Generate backend and frontend app structures

### Phase 2: Backend Setup
1. Generate Next.js backend with GraphQL
2. Setup BetterAuth with database models
3. Create GraphQL schema and resolvers
4. Build admin panel UI

### Phase 3: Frontend Integration
1. Setup GraphQL client for each framework
2. Implement authentication flow
3. Create dashboard screens
4. Connect to backend API

### Phase 4: Shared Configuration
1. Generate shared types package
2. Setup cross-app type sharing
3. Configure build pipelines
4. Add development scripts

## Development Experience

### Local Development
```bash
# Start everything
pnpm dev

# Start specific apps
pnpm dev --filter=backend
pnpm dev --filter=frontend

# Build everything
pnpm build

# Type check
pnpm typecheck
```

### Environment Variables
```env
# Backend (.env.local)
DATABASE_URL=
NEXTAUTH_SECRET=
NEXT_PUBLIC_GRAPHQL_ENDPOINT=

# Frontend (.env)
EXPO_PUBLIC_API_URL=
EXPO_PUBLIC_GRAPHQL_ENDPOINT=
```

## Deployment Strategy

### Backend (Vercel)
- Auto-deploy from monorepo
- Environment variables configuration
- Database connection setup
- Storage configuration

### Frontend
- **Expo**: EAS Build and Submit
- **Flutter**: Platform-specific builds
- **Tauri**: GitHub Actions for releases

## Benefits

1. **Unified Development**: Single repository for entire application
2. **Type Safety**: Shared types between frontend and backend
3. **Code Reuse**: Shared utilities and configurations
4. **Consistent Auth**: Single authentication system for all platforms
5. **Rapid Development**: Start with working auth and dashboard
6. **Professional Structure**: Enterprise-ready architecture from day one