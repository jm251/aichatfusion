# Project Structure

## Root Directory Organization

```
├── src/                    # Source code
├── public/                 # Static assets
├── dist/                   # Build output (generated)
├── node_modules/           # Dependencies (generated)
├── .kiro/                  # Kiro configuration and steering
├── .github/                # GitHub workflows and templates
├── .vscode/                # VS Code settings
└── Configuration files     # Package.json, tsconfig, etc.
```

## Source Code Structure (`src/`)

### Core Application
- `App.tsx` - Main application component with chat logic and state management
- `main.tsx` - Application entry point with providers and error boundaries
- `ErrorFallback.tsx` - Global error boundary component

### Components (`src/components/`)
- **Chat Components**: `ChatHeader`, `ChatHistory`, `ChatSidebar`, `MessageBubble`, `MessageInput`
- **Feature Components**: `KnowledgeUpload`, `ImageGeneration`, `ModelSelectionDialog`
- **UI Components**: `ui/` folder contains Shadcn/ui components
- **Utility Components**: `MarkdownRenderer`, `ThemeWrapper`, `SettingsDialog`

### Services & Logic (`src/lib/`)
- `ai-service.ts` - Core AI integration and routing logic
- `firebase-service.ts` - Chat persistence and authentication
- `api-config.ts` - API configuration and key management
- `vector-store.ts` - Knowledge base functionality
- `types.ts` - TypeScript type definitions
- `utils.ts` - Utility functions

### Styling (`src/styles/`)
- `theme.css` - CSS custom properties and design system
- `force-colors.css` - Accessibility color overrides
- `google-theme.css` - Service-specific theming
- `main.css` - Global styles and Tailwind imports
- `index.css` - Additional global styles

### Hooks (`src/hooks/`)
- `use-mobile.ts` - Mobile detection hook
- Custom hooks for reusable logic

## Configuration Files

### Build & Development
- `vite.config.ts` - Vite configuration with React and Tailwind plugins
- `tsconfig.json` - TypeScript configuration with strict settings
- `tailwind.config.js` - Tailwind CSS configuration with custom theme
- `components.json` - Shadcn/ui configuration

### Environment & Deployment
- `.env.example` - Environment variable template
- `.env.local` - Local environment variables (gitignored)
- `netlify.toml` - Netlify deployment configuration
- `package.json` - Dependencies and scripts

## Naming Conventions

### Files & Folders
- **Components**: PascalCase (e.g., `ChatHeader.tsx`, `MessageBubble.tsx`)
- **Services**: kebab-case (e.g., `ai-service.ts`, `firebase-service.ts`)
- **Hooks**: kebab-case with `use-` prefix (e.g., `use-mobile.ts`)
- **Types**: kebab-case (e.g., `types.ts`)

### Code Conventions
- **React Components**: PascalCase function components
- **Variables & Functions**: camelCase
- **Constants**: UPPER_SNAKE_CASE
- **CSS Classes**: Tailwind utility classes, custom classes in kebab-case
- **Environment Variables**: UPPER_SNAKE_CASE with `VITE_` prefix

## Import Patterns

### Path Aliases
- `@/` maps to `src/` directory
- `@/components` for component imports
- `@/lib` for service and utility imports
- `@/hooks` for custom hooks

### Import Order
1. React and external libraries
2. Internal components (using `@/` alias)
3. Types and interfaces
4. Relative imports (if any)

## Component Architecture

### Component Structure
- Keep components focused and single-responsibility
- Use composition over inheritance
- Implement proper TypeScript interfaces for props
- Include error boundaries for resilient UX

### State Management
- Local state with `useState` for component-specific data
- Lift state up when shared between components
- Use Firebase for persistent data (chat history)
- Context providers for theme and global settings

### Styling Approach
- Tailwind utility classes for styling
- CSS custom properties for theming
- Responsive design with mobile-first approach
- Service-specific color coding for AI responses