# Technology Stack

## Core Framework
- **React 19** with TypeScript for type-safe component development
- **Vite 6** as the build tool and development server
- **SWC** for fast compilation via @vitejs/plugin-react-swc

## Styling & UI
- **Tailwind CSS 4** with custom design system using CSS variables
- **Radix UI** components for accessible, unstyled primitives
- **Shadcn/ui** component library (New York style) for consistent UI patterns
- **Lucide React** for iconography
- **Framer Motion** for animations and transitions

## State Management & Data
- **React hooks** (useState, useEffect) for local state
- **Firebase** for authentication and chat history persistence
- **Vector Store** for knowledge base functionality
- **React Hook Form** with Zod validation for form handling

## AI Integration
- Multiple AI service integrations: Groq, Google Gemini, OpenAI, OpenRouter, GitHub Models, Cohere, xAI
- Smart routing and fallback mechanisms
- Rate limiting with multi-key rotation
- Consensus generation from multiple models

## Development Tools
- **ESLint** with TypeScript rules for code quality
- **TypeScript 5.7** with strict configuration
- **Error Boundaries** for graceful error handling
- **React Error Boundary** library

## Common Commands

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production  
npm run preview      # Preview production build
npm run lint         # Run ESLint

# Utilities
npm run optimize     # Vite dependency optimization
npm run kill         # Kill process on port 5000 (Unix only)
```

## Environment Configuration
- Use `.env.local` for environment variables (never commit)
- Support for backend mode (recommended) or frontend-only mode
- Multi-key configuration with numbered variants (KEY1, KEY2, etc.)
- Firebase configuration for chat persistence

## Code Quality Standards
- Strict TypeScript with null checks enabled
- ESLint with React hooks and refresh plugins
- Component-based architecture with clear separation of concerns
- Error boundaries for resilient user experience
