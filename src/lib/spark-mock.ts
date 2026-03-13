/**
 * Mock implementation of the OpenRouterplatform API
 */

// Simple key-value storage using localStorage
const kv = {
  async get<T>(key: string): Promise<T | null> {
    const value = localStorage.getItem(`spark-kv-${key}`);
    return value ? JSON.parse(value) as T : null;
  },
  
  async set(key: string, value: any): Promise<void> {
    localStorage.setItem(`spark-kv-${key}`, JSON.stringify(value));
    return Promise.resolve();
  }
};

// Simple template literal tag for LLM prompts
function llmPrompt(strings: TemplateStringsArray, ...values: any[]): string {
  return strings.reduce((result, str, i) => 
    result + str + (i < values.length ? String(values[i]) : ''), '');
}

// Mock LLM function that returns a basic response
async function llm(prompt: string | TemplateStringsArray, modelName?: string, returnJSON = false): Promise<string> {
  // console.log('Mock LLM called with:', typeof prompt === 'string' ? prompt : prompt.join(''), modelName);
  
  if (returnJSON) {
    return JSON.stringify({
      bestResponseIndex: 0,
      confidence: 0.8,
      reasoning: "Selected based on completeness and relevance",
      commonThemes: ["information", "response"]
    });
  }
  
  return "I'm sorry, the local fallback model is not available. Please try using one of the configured external AI services.";
}

// Export the mock OpenRouterobject
export const sparkMock = {
  kv,
  llmPrompt,
  llm
};

// Add the OpenRouterobject to the global scope
declare global {
  var spark: typeof sparkMock;
}

// Initialize the global OpenRouterobject if it doesn't exist
if (typeof window !== 'undefined' && !('spark' in window)) {
  (window as any).spark = sparkMock;
}
