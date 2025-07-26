import { memo } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, vs } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Button } from '@/components/ui/button';
import { Copy, CheckCircle } from '@phosphor-icons/react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface CodeBlockProps {
  language: string;
  value: string;
  isDark?: boolean;
}

function CodeBlock({ language, value, isDark = false }: CodeBlockProps) {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy code:', error);
    }
  };

  // Clean up the language identifier
  const cleanLanguage = language?.toLowerCase().replace(/^language-/, '') || 'text';

  return (
    <div className="relative group my-4">
      {/* Header with language and copy button */}
      <div className={cn(
        "flex items-center justify-between px-4 py-2 text-xs font-medium rounded-t-lg border",
        isDark 
          ? "bg-slate-800 text-slate-300 border-slate-700" 
          : "bg-slate-100 text-slate-700 border-slate-200"
      )}>
        <span className="capitalize">{cleanLanguage}</span>
        <Button
          onClick={handleCopy}
          size="sm"
          variant="ghost"
          className={cn(
            "h-6 w-6 p-0 rounded opacity-60 hover:opacity-100 transition-opacity",
            isDark ? "hover:bg-slate-700" : "hover:bg-slate-200"
          )}
          title={isCopied ? "Copied!" : "Copy code"}
        >
          {isCopied ? (
            <CheckCircle className="w-3 h-3 text-green-500" weight="fill" />
          ) : (
            <Copy className="w-3 h-3" />
          )}
        </Button>
      </div>

      {/* Code content */}
      <div className="overflow-hidden rounded-b-lg border border-t-0 border-slate-200">
        <SyntaxHighlighter
          language={cleanLanguage}
          style={isDark ? vscDarkPlus : vs}
          customStyle={{
            margin: 0,
            padding: '1rem',
            fontSize: '0.875rem',
            lineHeight: '1.5',
            background: isDark ? '#1e293b' : '#f8fafc',
          }}
          showLineNumbers={value.split('\n').length > 5}
          lineNumberStyle={{
            color: isDark ? '#64748b' : '#94a3b8',
            fontSize: '0.75rem',
          }}
        >
          {value}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}

interface InlineCodeProps {
  children: string;
  isDark?: boolean;
}

function InlineCode({ children, isDark = false }: InlineCodeProps) {
  return (
    <code className={cn(
      "px-1.5 py-0.5 text-sm font-mono rounded border",
      isDark 
        ? "bg-slate-800 text-slate-200 border-slate-700" 
        : "bg-slate-100 text-slate-800 border-slate-200"
    )}>
      {children}
    </code>
  );
}

interface MarkdownRendererProps {
  content: string;
  isDark?: boolean;
  className?: string;
}

export const MarkdownRenderer = memo(function MarkdownRenderer({ 
  content, 
  isDark = false, 
  className 
}: MarkdownRendererProps) {
  // Enhanced markdown parsing with better code block detection
  const parseMarkdown = (text: string) => {
    const parts: Array<{ type: 'text' | 'code' | 'inline-code'; content: string; language?: string }> = [];
    
    // First, handle code blocks (```language\ncode\n```)
    const codeBlockRegex = /```(\w+)?\s*\n?([\s\S]*?)```/g;
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(text)) !== null) {
      // Add text before code block
      if (match.index > lastIndex) {
        const beforeText = text.slice(lastIndex, match.index);
        if (beforeText.trim()) {
          parts.push({ type: 'text', content: beforeText });
        }
      }

      // Add code block
      const language = match[1] || 'text';
      const code = match[2].trim();
      parts.push({ type: 'code', content: code, language });
      
      lastIndex = codeBlockRegex.lastIndex;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      const remainingText = text.slice(lastIndex);
      if (remainingText.trim()) {
        parts.push({ type: 'text', content: remainingText });
      }
    }

    // If no code blocks found, return the original text
    if (parts.length === 0) {
      parts.push({ type: 'text', content: text });
    }

    return parts;
  };

  // Handle inline code in text parts
  const renderTextWithInlineCode = (text: string) => {
    const inlineCodeRegex = /`([^`]+)`/g;
    const parts: Array<{ type: 'text' | 'inline-code'; content: string }> = [];
    let lastIndex = 0;
    let match;

    while ((match = inlineCodeRegex.exec(text)) !== null) {
      // Add text before inline code
      if (match.index > lastIndex) {
        const beforeText = text.slice(lastIndex, match.index);
        if (beforeText) {
          parts.push({ type: 'text', content: beforeText });
        }
      }

      // Add inline code
      parts.push({ type: 'inline-code', content: match[1] });
      lastIndex = inlineCodeRegex.lastIndex;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      const remainingText = text.slice(lastIndex);
      if (remainingText) {
        parts.push({ type: 'text', content: remainingText });
      }
    }

    return parts.length > 0 ? parts : [{ type: 'text', content: text }];
  };

  // Format text content (handle line breaks, basic markdown)
  const formatText = (text: string) => {
    return text
      .split('\n')
      .map((line, i) => {
        // Handle headers
        if (line.startsWith('### ')) {
          return (
            <h3 key={i} className="text-lg font-semibold mt-4 mb-2 first:mt-0">
              {line.slice(4)}
            </h3>
          );
        }
        if (line.startsWith('## ')) {
          return (
            <h2 key={i} className="text-xl font-semibold mt-4 mb-2 first:mt-0">
              {line.slice(3)}
            </h2>
          );
        }
        if (line.startsWith('# ')) {
          return (
            <h1 key={i} className="text-2xl font-bold mt-4 mb-2 first:mt-0">
              {line.slice(2)}
            </h1>
          );
        }

        // Handle list items
        if (line.match(/^\s*[-*+]\s+/)) {
          return (
            <li key={i} className="ml-4 list-disc list-inside">
              {line.replace(/^\s*[-*+]\s+/, '')}
            </li>
          );
        }

        // Handle numbered lists
        if (line.match(/^\s*\d+\.\s+/)) {
          return (
            <li key={i} className="ml-4 list-decimal list-inside">
              {line.replace(/^\s*\d+\.\s+/, '')}
            </li>
          );
        }

        // Handle bold and italic
        let formattedLine = line
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.*?)\*/g, '<em>$1</em>')
          .replace(/__(.*?)__/g, '<strong>$1</strong>')
          .replace(/_(.*?)_/g, '<em>$1</em>');

        // Empty lines create spacing
        if (!line.trim()) {
          return <br key={i} />;
        }

        return (
          <span 
            key={i} 
            dangerouslySetInnerHTML={{ __html: formattedLine }}
            className="block"
          />
        );
      });
  };

  const parts = parseMarkdown(content);

  return (
    <div className={cn("prose prose-sm max-w-none", className)}>
      {parts.map((part, index) => {
        if (part.type === 'code') {
          return (
            <CodeBlock
              key={index}
              language={part.language || 'text'}
              value={part.content}
              isDark={isDark}
            />
          );
        } else {
          // Handle text with potential inline code
          const textParts = renderTextWithInlineCode(part.content);
          
          return (
            <div key={index} className="leading-relaxed">
              {textParts.map((textPart, textIndex) => {
                if (textPart.type === 'inline-code') {
                  return (
                    <InlineCode
                      key={textIndex}
                      isDark={isDark}
                    >
                      {textPart.content}
                    </InlineCode>
                  );
                } else {
                  return (
                    <span key={textIndex}>
                      {formatText(textPart.content)}
                    </span>
                  );
                }
              })}
            </div>
          );
        }
      })}
    </div>
  );
});