# MyBuddy-and-Me.com

## Overview

MyBuddy-and-Me.com is a single-page marketing website for the MyBuddy app, an AI-powered educational learning companion for children. The site introduces the app concept, showcases personalized buddy characters (dogs, dinosaurs, etc.), presents a development roadmap, and includes a contact form for interested parents and partners. The design follows kid-friendly aesthetics inspired by Duolingo, ClassDojo, and Khan Academy Kids while maintaining parent trust through clear, safe messaging.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight client-side routing)
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **UI Components**: shadcn/ui component library (Radix primitives + Tailwind)
- **Animations**: Framer Motion for page animations
- **Forms**: React Hook Form with Zod validation
- **State Management**: TanStack React Query for server state

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript with ESM modules
- **API Design**: RESTful endpoints under `/api/` prefix
- **Build Tool**: esbuild for server bundling, Vite for client

### Data Layer
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema Location**: `shared/schema.ts` (shared between client and server)
- **Validation**: Zod schemas generated from Drizzle schemas via drizzle-zod
- **Migrations**: Drizzle Kit with `db:push` command

### Project Structure
```
client/           # React frontend application
  src/
    components/ui/  # shadcn/ui components
    pages/          # Page components (home, not-found)
    hooks/          # Custom React hooks
    lib/            # Utilities and query client
server/           # Express backend
  routes.ts       # API route definitions
  storage.ts      # Database access layer
  db.ts           # Database connection
shared/           # Shared code between client/server
  schema.ts       # Drizzle schema definitions
```

### Key Design Patterns
- **Monorepo Structure**: Client and server in single repository with shared types
- **Type Safety**: End-to-end TypeScript with shared Zod schemas for validation
- **Component Library**: Pre-built accessible components via shadcn/ui
- **Storage Abstraction**: `IStorage` interface for database operations

## External Dependencies

### Database
- **PostgreSQL**: Primary database via `DATABASE_URL` environment variable
- **Connection**: pg Pool with Drizzle ORM adapter

### UI/Styling
- **Google Fonts**: Poppins (primary), DM Sans, Architects Daughter
- **Radix UI**: Accessible primitives for all interactive components
- **Tailwind CSS**: Utility-first styling with custom theme configuration

### Development Tools
- **Vite**: Development server with HMR and production builds
- **Replit Plugins**: Runtime error overlay, cartographer, dev banner (development only)

### Form Handling
- **react-hook-form**: Form state management
- **@hookform/resolvers**: Zod resolver for validation
- **zod-validation-error**: Human-readable validation error messages