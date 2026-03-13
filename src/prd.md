# AI Chat Assistant - Enhanced Multi-AI Strategy - Product Requirements Document

## Core Purpose & Success
- **Mission Statement**: An intelligent AI chat application that leverages multiple specialized AI services with smart routing and automatic fallback for the optimal user experience.
- **Success Indicators**: 
  - Ultra-fast responses for interactive scenarios via Groq
  - Comprehensive multi-AI perspectives for complex queries
  - GPT-4o-mini integration for reliable, free-tier OpenAI access
  - Access to free powerful models via OpenRouter
  - Advanced model capabilities via GitHub Models
  - Natural conversational AI via Cohere
  - Seamless fallback during service outages
  - Perfect code syntax highlighting and easy copying
- **Experience Qualities**: Lightning-Fast, Comprehensive, Reliable, Free-Tier Friendly

## Project Classification & Approach
- **Complexity Level**: Complex Application (advanced multi-AI routing, intelligent strategy selection)
- **Primary User Activity**: Interacting (sophisticated AI conversations with specialized service routing)

## Essential Features

### Enhanced Multi-AI Strategy System
- **Groq Integration ⚡**: Ultra-fast responses (3-second timeout) for real-time interactions
- **Gemini Integration 🧐**: Advanced reasoning for complex analysis and creative writing
- **OpenAI Integration 🤖**: GPT-4o-mini for reliable, fast responses with free tier access
- **OpenRouter Integration 🔗**: Access to multiple powerful AI models through a single API
- **GitHub Models Integration 🚀**: Cutting-edge models including DeepSeek, Grok, Llama, and Mistral
- **Cohere Integration 💬**: Natural conversational AI with Command-R models
- **Gemini Image Generation 🎨**: Create and edit images using Gemini 2.5 Flash Image Preview model with Nano Banana capabilities

### Intelligent Response Strategies
- **Fast Sequential Mode**: Groq (3s timeout) → Gemini → OpenAI → Cohere → GitHub → OpenRouter
- **Comprehensive Parallel Mode**: All services respond, AI judges best response
- **Smart Response Analysis**: AI-powered evaluation of multiple responses for quality
- **Automatic Service Selection**: Context-aware routing to optimal AI service

### Enhanced Code & Syntax Features
- **Professional Syntax Highlighting**: JetBrains Mono font with VS Code themes
- **One-Click Code Copying**: Instant clipboard access for all code blocks
- **Language Detection**: Automatic syntax highlighting for 100+ languages
- **Mobile-Optimized**: Perfect code readability on all devices
- **Copy Response Feature**: Easy copying of entire AI responses

### Image Generation Features (NEW)
- **Nano Banana Integration 🍌**: Advanced image editing inspired by Google's Nano Banana model
- **Gemini 2.5 Flash Image 🎨**: State-of-the-art image generation and editing
- **Image Upload Support**: Select and upload images for editing
- **Multi-turn Editing**: Iterative image refinement with context preservation
- **Virtual Try-On**: Apply clothing and accessories to uploaded photos
- **Interior Design**: Transform room images with AI-powered suggestions
- **Photo Blending**: Combine multiple images naturally

### Advanced API Management
- **Multi-Key Rotation**: Support for unlimited keys per service with automatic cycling
- **Environment-Based Configuration**: API keys are loaded from environment variables at startup
- **Intelligent Fallback Logic**: Smart retry mechanisms with exponential backoff
- **Service Health Monitoring**: Real-time status tracking for all AI services
- **Performance Tracking**: Response time monitoring and optimization
- **Settings Interface**: Visual configuration interface that guides users to proper setup

**Note**: The current implementation requires environment variables (.env.local) for API keys. The settings dialog provides configuration guidance and validation but requires app restart for changes to take effect.

## Design Direction

### Visual Tone & Identity
- **Emotional Response**: Confident professionalism with cutting-edge innovation
- **Design Personality**: Sleek, futuristic, highly functional
- **Visual Metaphors**: Multi-layered intelligence network, specialized expertise
- **Simplicity Spectrum**: Clean minimalism with powerful functionality

### Enhanced Color Strategy
- **Color Scheme Type**: Service-specific color coding with harmonious palette
- **Service Colors**:
  - Groq ⚡: Orange (oklch(0.65 0.15 30)) - Speed and energy
  - Gemini 🧐: Emerald (oklch(0.55 0.15 150)) - Intelligence and reasoning
  - OpenAI 🤖: Teal (oklch(0.55 0.15 180)) - Reliability and innovation
  - OpenRouter 🔗: Purple (oklch(0.55 0.15 300)) - Flexibility and fallback
  - GitHub Models 🚀: Indigo (oklch(0.55 0.15 270)) - Advanced capabilities
  - Cohere 💬: Sky Blue (oklch(0.60 0.12 210)) - Conversation and dialogue
  - Gemini Image 🎨: Violet (oklch(0.55 0.15 280)) - Creative image generation
- **Code Highlighting**: Dark theme for code blocks with VS Code color scheme
- **Accessibility**: WCAG AA compliant contrast ratios throughout

### Typography System
- **Primary Font**: Inter - exceptional readability for chat interface
- **Code Font**: JetBrains Mono - professional monospace for code display
- **Font Hierarchy**: Clear distinction between services, code, and content
- **Mobile Optimization**: Responsive font scaling for all devices

### Advanced UI Components
- **Service-Coded Bubbles**: Distinct gradients and icons for each AI service
- **Strategy Selector**: Fast vs Comprehensive mode toggle
- **Enhanced Code Blocks**: Professional header with language and copy button
- **Service Status Bar**: Real-time availability indicators
- **Response Analytics**: Quality metrics and timing information

## Technical Implementation

### Multi-AI Architecture
- **Parallel Processing**: Concurrent API calls for comprehensive responses
- **Response Judging**: AI-powered evaluation of multiple responses
- **Timeout Management**: Service-specific timeout handling (3s for Groq)
- **Quality Assessment**: Common theme detection across responses

### Enhanced API Integration
- **Groq API**: llama-3.1-70b-versatile for ultra-fast responses
- **Gemini API**: gemini-1.5-pro-latest for complex reasoning
- **OpenAI API**: gpt-4o-mini for reliable, fast responses with free tier access
- **OpenRouter API**: Multiple advanced models for reliable fallback and specialized capabilities
- **GitHub Models API**: DeepSeek (R1, V3), Grok (3, 3-mini), Llama 4 Scout, Mistral Codestral, Microsoft MAI-DS-R1, OpenAI GPT-4.1
- **Cohere API**: command-r and command-r-plus for natural conversational AI
- **Gemini Image API**: gemini-2.5-flash-image-preview for advanced image generation and editing
- **Error Handling**: Graceful degradation with intelligent retry logic

### Code Enhancement Features
- **Syntax Highlighting**: React Syntax Highlighter with Prism.js
- **Copy Functionality**: Navigator clipboard API with visual feedback
- **Language Detection**: Automatic identification of code languages
- **Theme Integration**: Dark/light theme support for code blocks

### Latency Optimization (NEW):
  - Fast Mode starts at Groq and falls back deterministically to Gemini, OpenAI, Cohere, GitHub Models, then OpenRouter.
  - OpenAI GPT-4o-mini positioned in fallback chain for optimal reliability.
  - Parallel Mode post-processing sorts responses by ascending response time so the UI can surface fastest answers first.
  - Maintains per-service live status updates while reordering only the final aggregated list.

## User Experience Flow

### Fast Mode Experience
1. **User Input**: Types message with Fast Mode selected
2. **Primary First Response**: Groq starts first (3s timeout), then fallback continues in deterministic order.
3. **Fallback Order**: Gemini → OpenAI → Cohere → GitHub → OpenRouter
4. **Single Response**: Fastest successful response returned early

### Comprehensive Mode Experience
1. **User Input**: Types message with Multi-AI mode selected
2. **Parallel Processing**: All available services respond simultaneously
3. **AI Analysis**: Intelligent evaluation of all responses
4. **Multi-Perspective**: All responses displayed with service identification
5. **Quality Metrics**: Response timing and confidence indicators

### Code Interaction Flow
1. **Code Detection**: Automatic syntax highlighting applied
2. **Professional Display**: Clean header with language identification
3. **Easy Copying**: One-click copy with visual confirmation
4. **Mobile Friendly**: Optimized scrolling and readability

## Success Metrics
- **Response Speed**: Sub-5-second responses in Fast Mode
- **Median First Token / First Answer Time (NEW)**: Reduced via speculative concurrency (target <2s with warm keys)
- **Service Reliability**: 99%+ uptime through intelligent fallbacks
- **Code Experience**: Perfect syntax highlighting and copying functionality
- **User Satisfaction**: Seamless multi-AI experience with clear service benefits

## Innovation Features
- **AI Response Judge**: Meta-AI evaluation of response quality
- **Context-Aware Routing**: Automatic service selection based on query type
- **Performance Analytics**: Real-time monitoring of service response times
- **Enhanced Developer Experience**: Professional code handling and copying
- **Conversational Excellence**: Natural dialogue flow with Cohere integration
- **OpenAI Integration**: Free-tier GPT-4o-mini for additional reliability
