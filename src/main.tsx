import { createRoot } from "react-dom/client";
import { ErrorBoundary } from "react-error-boundary";

import App from "./App.tsx";
import { ErrorFallback } from "./ErrorFallback.tsx";
import { ThemeProvider } from "./components/theme-provider.tsx";

// Import CSS in the correct order for proper layering
import "./styles/theme.css";
import "./main.css";
import "./index.css";

import "./lib/spark-mock.ts";

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary FallbackComponent={ErrorFallback}>
    <ThemeProvider defaultTheme="system" storageKey="ai-chat-theme">
      <div id="spark-app" className="min-h-screen w-full">
        <App />
      </div>
    </ThemeProvider>
  </ErrorBoundary>
);
