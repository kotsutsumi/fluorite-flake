# {{projectName}} - Expo Fullstack Admin

This is a fullstack monorepo project with Expo mobile app, Next.js admin panel, and GraphQL backend.

## 🏗️ Architecture

```
{{projectName}}/
├── apps/
│   ├── backend/         # GraphQL API (Apollo Server + Prisma)
│   ├── mobile/          # Expo App (Apollo Client)
│   └── admin/           # Next.js Admin Panel (Better Auth)
└── packages/
    └── shared/          # Shared libraries and types
```

## 🚀 Quick Start

1. **Install dependencies**
   ```bash
   pnpm install
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Set up database**
   ```bash
   pnpm setup
   ```

4. **Start development servers**
   ```bash
   pnpm dev
   ```

## 📱 Applications

### Mobile App (Expo)
- **Port**: Expo Dev Server (default: 8081)
- **Framework**: React Native with Expo
- **State Management**: Apollo Client
- **Navigation**: Expo Router

### Admin Panel (Next.js)
- **Port**: http://localhost:3000
- **Framework**: Next.js 14 with App Router
- **Authentication**: Better Auth
- **Styling**: Tailwind CSS + shadcn/ui

### Backend API (GraphQL)
- **Port**: http://localhost:4000
- **Framework**: Apollo Server
- **Database**: Prisma + SQLite (dev) / PostgreSQL (prod)
- **Authentication**: JWT with Better Auth integration

## 🛠️ Development Commands

```bash
# Development
pnpm dev                 # Start all applications
pnpm build              # Build all applications
pnpm test               # Run all tests
pnpm lint               # Lint all code
pnpm format             # Format all code

# Database
pnpm db:generate        # Generate Prisma client
pnpm db:push            # Push schema to database
pnpm db:seed            # Seed database with sample data

# Individual apps
pnpm --filter backend dev      # Backend only
pnpm --filter admin dev        # Admin panel only
pnpm --filter mobile dev       # Mobile app only
```

## 📊 Features

### Mobile App
- ✅ User authentication
- ✅ Post listing and creation
- ✅ User profile management
- ✅ Real-time updates

### Admin Panel
- ✅ User management
- ✅ Post management
- ✅ Organization management
- ✅ Role-based access control
- ✅ Analytics dashboard

### Backend API
- ✅ GraphQL API with type-safe resolvers
- ✅ Prisma ORM with type-safe database access
- ✅ JWT authentication
- ✅ Role-based authorization
- ✅ Real-time subscriptions

## 🔧 Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure:

- `DATABASE_URL`: Database connection string
- `BETTER_AUTH_SECRET`: Secret for Better Auth
- `GRAPHQL_SERVER_URL`: GraphQL server endpoint
- `EXPO_PUBLIC_API_URL`: API URL for Expo app

### Database Schema

The project uses Prisma for database management. The schema includes:

- **User**: Authentication and profile data
- **Post**: Content management
- **Organization**: Multi-tenant support
- **Role**: Permission management

## 📱 Mobile Development

### Running on Device
```bash
cd apps/mobile
pnpm start
# Scan QR code with Expo Go app
```

### Building for Production
```bash
cd apps/mobile
pnpm build:ios     # iOS build
pnpm build:android # Android build
```

## 🌐 Deployment

### Backend
```bash
cd apps/backend
pnpm build
pnpm start
```

### Admin Panel
```bash
cd apps/admin
pnpm build
pnpm start
```

### Mobile App
```bash
cd apps/mobile
eas build --platform all
eas submit --platform all
```

## 🧪 Testing

```bash
# Run all tests
pnpm test

# Test coverage
pnpm test:coverage

# E2E tests
pnpm test:e2e
```

## 📚 Tech Stack

### Frontend
- **React Native**: Mobile framework
- **Expo**: Development platform
- **Next.js**: Web framework
- **TypeScript**: Type safety
- **Tailwind CSS**: Styling
- **shadcn/ui**: UI components

### Backend
- **Apollo Server**: GraphQL server
- **Prisma**: Database ORM
- **Better Auth**: Authentication
- **Node.js**: Runtime environment

### DevOps
- **pnpm**: Package manager
- **Turbo**: Monorepo build system
- **Biome**: Linting and formatting
- **Vitest**: Testing framework

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

// EOF