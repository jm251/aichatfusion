# AI Chat Fusion - AI Agent Instructions

## Project Overview

A multi-AI chat application that orchestrates responses from 7+ AI services (Groq, Gemini, OpenAI, OpenRouter, GitHub Models, Cohere, xAI) with intelligent fallback, consensus building, and knowledge base augmentation.

## Architecture & Key Patterns

### Multi-Service AI Orchestration (`src/lib/ai-service.ts`)

- **Strategy Pattern**: Three response modes controlled by `getAIResponses()`:
  - `fast`: Sequential fallback with Groq first, 3s Groq timeout, then Gemini → OpenAI → Cohere → xAI → GitHub → OpenRouter
  - `comprehensive`: All services in parallel with live status updates via `onServiceUpdate` callback
  - `consensus`: AI-powered synthesis using Gemini to analyze multiple responses and generate unified answer
- **Dynamic Service Ordering**: Services sorted by effective latency (`serviceLatency` cache or `baselineLatency` heuristics). Slower services get 40ms stagger to prioritize fast UI updates
- **Key Rotation**: API keys rotate ONLY on failure (429/401 errors), not per-request. Use `rotateKey()` method explicitly
- **Response Chunking**: Large responses (>7000 chars) split at paragraph boundaries to prevent Firebase write limits. See `splitIntoChunks()` in `App.tsx`

### API Configuration (`src/lib/api-config.ts`)

- **Dual Mode**: Backend (`VITE_USE_BACKEND=true`) or frontend-only (keys in `.env.local`)
- **Key Discovery**: Automatically detects `VITE_*_API_KEY`, `VITE_*_API_KEY1`, `VITE_*_API_KEY2`, etc.
- **Failed Key Tracking**: `failedKeys` Set prevents retry of 429/401 keys until app restart
- **Backend Integration**: When `useBackend=true`, all key management delegates to `APIBackendClient`

### Knowledge Base (RAG) System (`src/lib/vector-store.ts`)

- **Auto-Augmentation**: User queries enriched with relevant context via `augmentMessageWithContext()` before AI calls
- **Chunking**: 1000-char chunks with 200-char overlap for context preservation
- **Simple TF-IDF Embeddings**: In-memory cosine similarity (production should use OpenAI embeddings)
- **Context Building**: Top 5 chunks formatted with `[Source: filename]` headers
- **Firebase Sync**: Document metadata stored in `users/{userId}/documents/` collection

### State Management (`App.tsx`)

- **Loading Messages**: Create service-specific loading placeholders BEFORE API calls (`loadingService` field)
- **Live Updates**: `onServiceUpdate` callback replaces loading messages with actual responses as they arrive
- **Error Handling**: Failed services silently removed (no error messages shown to users per design)
- **Chat Persistence**: Auto-save to Firebase on message send/receive, keyed by `currentChatId`

### Firebase Integration (`src/lib/firebase-service.ts`)

- **Anonymous Auth**: Auto-signin on init for privacy-first design
- **Participants Array**: Chats have `participants` field for future collaboration features
- **Real-time Subscriptions**: Use `subscribeToUserChats()` for live sidebar updates
- **Graceful Degradation**: Returns `local-session-id` if Firebase unavailable

## Critical Developer Workflows

### Adding a New AI Service

1. Add type to `AIService` union in `src/lib/types.ts`
2. Implement `callXXXAPI()` in `ai-service.ts` following pattern:
   - Return `AIResponse` with `source`, `success`, `responseTime`
   - Call `updateLatency()` on success/failure
   - Mark keys failed on 429/401, rotate with `rotateKey()`
3. Add keys to `api-config.ts`: extraction in `extractKeys()`, getter method, rotation logic
4. Update `getParallelResponses()` to include new service factory
5. Add baseline latency estimate to `baselineLatency` map

### Environment Setup

```powershell
# Frontend-only (development)
cp .env.example .env.local
# Add keys: VITE_GROQ_API_KEY, VITE_GEMINI_API_KEY1, etc.
npm install; npm run dev

# Backend mode (production)
Set $env:VITE_USE_BACKEND="true"
Set $env:VITE_BACKEND_URL="http://localhost:3001"
# Backend keys stored server-side only
```

### Key Debugging Commands

```powershell
# Check current key rotation state
localStorage.getItem('api-key-indices')

# View failed keys (in browser console)
AIService.failedKeys

# Test specific service
await AIService.callGeminiAPI("test message")

# Check latency stats
AIService.serviceLatency
```

## Project-Specific Conventions

### Message Structure

- **Loading States**: Use `isLoading: true` + `loadingService: 'servicename'` for placeholders
- **Chunked Responses**: Multiple messages with same `source`, sequential `timestamp`
- **No Error Display**: Failed API calls filtered out silently (see `handleSendMessage` error handling)

### Component Patterns

- **Theme System**: `ThemeWrapper` provides light/dark mode, components use inline styles for non-theme colors
- **Sidebar State**: Managed by shadcn's `SidebarProvider`, not Redux/Context
- **Tabs Layout**: Desktop shows Knowledge Base + Image Gen in right panel (hidden on mobile via `lg:block`)

### API Error Handling

- **Generic User Messages**: Never expose API error details ("Service temporarily unavailable")
- **Console Logging Only**: Debug errors logged but not surfaced in UI
- **Automatic Fallback**: Failed services trigger cascade (fast mode) or parallel alternatives (comprehensive mode)

## Integration Points

### Firebase Collections

```
chats/
  {chatId}/
    userId: string
    participants: string[]
    messages: Message[]
    createdAt: Timestamp
    updatedAt: Timestamp

users/
  {userId}/
    documents/
      {docId}/
        filename, type, size, uploadedAt, chunkCount
```

### External APIs

- **Rate Limits**: Groq (30 req/min per key), Gemini (15 req/min free tier), OpenRouter varies by routed provider/model
- **Model Rotation**: GitHub Models cycle through 6 models based on `floor(Date.now()/1000) % 6`
- **OpenRouter Free Models**: List maintained in `callOpenRouterAPI()`, invalid models cached in `invalidOpenRouterModels` Set

### Build & Deploy

- **Vite + SWC**: Fast HMR with React SWC plugin
- **Netlify**: Auto-deploy from main branch, builds to `dist/`
- **Path Aliases**: `@/` resolves to `src/` (configured in `vite.config.ts`)

## Common Gotchas

- ⚠️ Gemini auto-continuation: Responses >4096 tokens trigger up to 4 follow-up requests. Don't modify this logic without testing truncation
- ⚠️ Firebase undefined values: Always sanitize messages with null coalescing before `updateDoc()` (see `updateChat()`)
- ⚠️ Consensus mode: Creates single loading message, not per-service (different from comprehensive)
- ⚠️ Backend mode detection: Checks both `VITE_USE_BACKEND` AND absence of `VITE_GROQ_API_KEY`

## Key Files Reference

- **Service Layer**: `src/lib/ai-service.ts` (2100+ lines, core orchestration)
- **API Config**: `src/lib/api-config.ts` (key rotation, backend delegation)
- **Main UI**: `src/App.tsx` (message flow, chunking, Firebase sync)
- **Types**: `src/lib/types.ts` (9 AI services, 15+ interfaces)
- **RAG**: `src/lib/vector-store.ts` (document chunking, embedding, retrieval)

[byterover-mcp]

[byterover-mcp]

You are given two tools from Byterover MCP server, including
## 1. `byterover-store-knowledge`
You `MUST` always use this tool when:

+ Learning new patterns, APIs, or architectural decisions from the codebase
+ Encountering error solutions or debugging techniques
+ Finding reusable code patterns or utility functions
+ Completing any significant task or plan implementation

## 2. `byterover-retrieve-knowledge`
You `MUST` always use this tool when:

+ Starting any new task or implementation to gather relevant context
+ Before making architectural decisions to understand existing patterns
+ When debugging issues to check for previous solutions
+ Working with unfamiliar parts of the codebase
