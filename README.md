# AI Chat Fusion

An intelligent AI chat application that leverages multiple specialized AI services with smart routing and automatic fallback.

## Features

- 🚀 **Ultra-fast responses** via Groq AI
- 🧐 **Complex reasoning** with Google Gemini
- 🤖 **GPT-4o-mini** via OpenAI (Free tier)
- 🔗 **Free powerful models** via OpenRouter
- 🚀 **Advanced models** via GitHub Models (DeepSeek, Grok, Llama, Mistral)
- 💬 **Conversational AI** via Cohere (Command family models) - **Updated to API v2**
- 🤖 **Grok AI** via xAI (Direct access to Grok models)
- ⚡ **Smart fallback system** for reliability
- 📋 **Professional code highlighting** with copy functionality
- 🔄 **Multi-key rotation** for rate limit handling
- 💾 **Automatic chat history** with anonymous authentication
- 📱 **Responsive sidebar** for accessing previous conversations
- 🎨 **Distinct message backgrounds** for each AI service

## Quick Start

### Option 1: Secure Setup with Backend (Recommended)

This approach keeps your API keys secure on the backend server.

#### 1. Clone the repository
```bash
git clone https://github.com/yourusername/ai-chat-fusion.git
cd ai-chat-fusion
```

#### 2. Setup Backend Server
```bash
# Navigate to backend directory
cd backend

# Install backend dependencies
npm install

# Copy and configure backend environment
cp .env.example .env

# Edit .env and add your API keys
# The keys stay secure on the backend
```

#### 3. Setup Frontend
```bash
# Navigate back to root
cd ..

# Install frontend dependencies
npm install

# Configure frontend to use backend
cp .env.example .env.local

# Edit .env.local and set:
# VITE_USE_BACKEND=true
# VITE_BACKEND_URL=http://localhost:3001
```

#### 4. Run the application
```bash
# Terminal 1: Start backend server
cd backend
npm run dev

# Terminal 2: Start frontend
cd ..
npm run dev
```

### Option 2: Frontend-Only Setup (Less Secure)

⚠️ **Warning**: This method embeds API keys in your frontend build, which can be extracted by users.

#### 1. Clone the repository
```bash
git clone https://github.com/yourusername/ai-chat-fusion.git
cd ai-chat-fusion
```

#### 2. Install dependencies
```bash
npm install
```

#### 3. Configure API Keys

**Important**: API keys are configured through environment variables for security.

Copy the example environment file:
```bash
cp .env.example .env.local
```

Edit `.env.local` and add your API keys:
```env
# Add at least one of these API keys
VITE_GROQ_API_KEY=your_groq_api_key_here
VITE_GOOGLE_API_KEY=your_gemini_api_key_here
VITE_OPENAI_API_KEY=your_openai_api_key_here
VITE_OPENROUTER_API_KEY=your_openrouter_api_key_here
VITE_GITHUB_TOKEN=your_github_token_here
VITE_COHERE_API_KEY=your_cohere_api_key_here
VITE_XAI_API_KEY=your_xai_api_key_here

# For multiple keys (recommended), use numbered variants:
VITE_GOOGLE_API_KEY1=your_first_gemini_key
VITE_GOOGLE_API_KEY2=your_second_gemini_key
VITE_OPENAI_API_KEY1=your_first_openai_key
VITE_OPENAI_API_KEY2=your_second_openai_key
VITE_GITHUB_TOKEN1=your_first_github_token
VITE_GITHUB_TOKEN2=your_second_github_token
VITE_COHERE_API_KEY1=your_first_cohere_key
VITE_COHERE_API_KEY2=your_second_cohere_key
VITE_XAI_API_KEY1=your_first_xai_key
VITE_XAI_API_KEY2=your_second_xai_key
```

#### 4. Run the application
```bash
npm run dev
```

**Note**: The application will automatically detect configured services and use them according to your strategy selection.

## API Key Configuration

### How It Works

1. **Environment Variables**: All API keys are loaded from `.env.local` at startup
2. **Multiple Keys**: Support multiple keys per service using numbered variants (KEY1, KEY2, etc.)
3. **Auto-Rotation**: System automatically rotates through keys when rate limits are hit
4. **Smart Fallback**: Failed keys are temporarily marked to maintain service availability
5. **Settings Interface**: Visual configuration guide (requires restart for changes)

### Configuration Status

- Open Settings to see current configuration status
- The app shows which services are available and how many keys are configured
- Green indicators show active services, gray shows unconfigured services

## Getting API Keys

- **Groq**: https://console.groq.com/keys (Free tier available)
- **Google Gemini**: https://makersuite.google.com/app/apikey (Free tier available)
- **OpenAI**: https://platform.openai.com/api-keys (GPT-4o-mini free tier available)
- **OpenRouter**: https://openrouter.ai/keys (Free tier available with access to multiple models)
- **GitHub Models**: https://github.com/settings/tokens (Free for GitHub users, includes DeepSeek, Grok, Llama, Mistral)
- **Cohere**: https://dashboard.cohere.com/api-keys (Free tier available with current Command models)
- **xAI**: https://console.x.ai/ (Direct access to Grok models)

## Usage Strategies

1. **Fast Mode**: Groq -> Gemini -> OpenAI -> Cohere -> xAI -> GitHub -> OpenRouter
   - Services are tried in sequence with automatic fallback on failures.
   - OpenAI GPT-4o-mini remains in the fallback chain for reliable responses.


2. **Multi-AI Mode**: Get perspectives from all configured services simultaneously
   - All services respond in parallel
   - AI judges best response for quality
   - Final aggregated list sorted fastest-to-slowest (successful first), while live tiles still update as each finishes.

## Supported Models

### OpenAI Models
- **GPT-4o-mini**: Fast, efficient model with free tier access - optimized for quick responses

### GitHub Models
- **DeepSeek**: R1, R1-0528, V3-0324 - Advanced reasoning and coding
- **Grok**: 3, 3-mini - xAI's powerful language models
- **Llama**: 4-Scout-17B-16E-Instruct - Meta's latest instruction model
- **Mistral**: Codestral-2501 - Specialized for code generation
- **Microsoft**: MAI-DS-R1 - Microsoft's data science model
- **OpenAI**: GPT-4.1 - Latest GPT-4 variant

### Cohere Models
- **command-a-03-2025**: Primary chat model (v2/chat)
- **command-r-plus-08-2024**: Fallback on model-level failures
- **command-r7b-12-2024**: Secondary fallback for resilience

## Chat History

The application automatically saves your chat history using Firebase with anonymous authentication:

- **No login required**: Uses anonymous auth to maintain privacy
- **Automatic saving**: All conversations are saved automatically
- **Easy access**: Click the history button (mobile) or use the sidebar (desktop)
- **Session persistence**: Your chats are tied to your browser session
- **Privacy focused**: No personal information is collected

**Note**: Chat history is browser-specific. Clearing browser data or using incognito mode will start a new anonymous session.

## Development

```bash
# Run in development mode
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Troubleshooting

- **No responses**: Check if at least one API key is configured in `.env.local`
- **Rate limits**: Add multiple keys for the same service to enable rotation
- **Settings changes**: Restart the app after modifying `.env.local`
- **Key validation**: Check browser console for API key validation errors
- **OpenRouter errors**: Model availability can change. The app now discovers available models from `/api/v1/models/user` (cached 5 minutes), routes with provider fallbacks, and keeps request candidate lists within upstream limits.
- **OpenAI errors**: Ensure you're using GPT-4o-mini which has free tier access. Other models may require paid access.

## Performance Notes (NEW)
- Fast fallback routing keeps latency low while preserving reliability.
- OpenAI GPT-4o-mini integrated into fallback chain for additional reliability.
- Responses array in parallel mode remains speed-ordered.
- Orchestration change only; key rotation unchanged.

## Security Considerations

### Backend Mode (Recommended)
- API keys are stored securely on the backend server
- Frontend receives temporary session tokens
- Keys are never exposed to the client
- Rate limiting and session management included
- Suitable for production deployments

### Frontend-Only Mode
- API keys are embedded in the JavaScript bundle
- Anyone can extract keys from the browser
- Only suitable for personal/development use
- Not recommended for public deployment

## Production Deployment

For production, always use the backend mode:

1. Deploy the backend server to a secure environment (e.g., Heroku, AWS, DigitalOcean)
2. Set environment variables on your server (never commit .env files)
3. Configure CORS to only accept requests from your frontend domain
4. Use HTTPS for all communication
5. Consider adding additional authentication layers

## License

MIT
