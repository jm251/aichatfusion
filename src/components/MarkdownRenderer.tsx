import { memo, ReactNode, useMemo, useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, vs } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Button } from '@/components/ui/button';
import { Copy, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

// Helper function to chunk large content to prevent rendering issues
const chunkContent = (content: string, maxChunkSize = 10000): string[] => {
  // If content is small enough, return as single chunk
  if (content.length <= maxChunkSize) {
    return [content];
  }
  
  const chunks: string[] = [];
  // Try to split at paragraph boundaries first
  const paragraphs = content.split(/\n\n+/);
  
  let currentChunk = '';
  for (const paragraph of paragraphs) {
    // If adding this paragraph exceeds chunk size and we already have content,
    // finish the current chunk and start a new one
    if (currentChunk.length + paragraph.length > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk);
      currentChunk = paragraph;
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
    }
  }
  
  if (currentChunk) {
    chunks.push(currentChunk);
  }
  
  return chunks;
};

interface CodeBlockProps {
  language: string;
  value: string;
  isDark?: boolean;
}

function CodeBlock({ language, value, isDark = false }: CodeBlockProps) {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = async () => {
    try {
      if (!navigator.clipboard?.writeText) {
        return;
      }
      await navigator.clipboard.writeText(value);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 1800);
    } catch (e) {
      console.error(e);
    }
  };

  const cleanLanguage = language?.toLowerCase().replace(/^language-/, '') || 'text';
  const lineCount = value.split('\n').length;
  const large = lineCount > 80 || value.length > 8000;

  return (
    <div
      className={cn(
        "code-block-wrapper relative group my-4 w-full max-w-full",
        large && "code-block-large"
      )}
      data-code-block
    >
      <div
        className={cn(
          "flex items-center justify-between px-3 py-1.5 text-[11px] font-medium rounded-t-md border",
          isDark
            ? "bg-slate-900 text-slate-200 border-slate-600"
            : "bg-gray-50 text-gray-800 border-gray-300"
        )}
      >
        <span className="capitalize truncate pr-2">{cleanLanguage}</span>
        <Button
          onClick={handleCopy}
          size="sm"
          variant="ghost"
          className={cn(
            "h-5 w-5 p-0 rounded opacity-70 hover:opacity-100 transition",
            isDark ? "hover:bg-slate-700" : "hover:bg-slate-200"
          )}
          title={isCopied ? "Copied!" : "Copy code"}
        >
          {isCopied ? (
            <CheckCircle className="w-3 h-3 text-green-500" />
          ) : (
            <Copy className="w-3 h-3" />
          )}
        </Button>
      </div>

      <div
        className={cn(
          "code-scroll border border-t-0 rounded-b-md",
          large && "max-h-[560px] overflow-y-auto"
        )}
      >
        <SyntaxHighlighter
          language={cleanLanguage}
          style={isDark ? vscDarkPlus : vs}
          customStyle={{
            margin: 0,
            background: isDark ? '#0f172a' : '#ffffff',
            padding: '0.75rem 0.875rem',
            fontSize: '0.8125rem',
            lineHeight: 1.5,
            width: '100%',
            maxWidth: '100%',
            overflowX: 'auto',
            overflowY: 'visible',
            boxSizing: 'border-box'
          }}
          wrapLines
          wrapLongLines={false}
          showLineNumbers={lineCount > 4}
          lineNumberStyle={{
            color: isDark ? '#64748b' : '#94a3b8',
            fontSize: '0.65rem',
            lineHeight: '1.5',
            minWidth: '2.4em',
            paddingRight: '0.5em',
            userSelect: 'none'
          }}
          lineProps={() => ({
            style: {
              display: 'block',
              width: '100%',
              position: 'relative'
            }
          })}
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
        ? "bg-slate-800 text-slate-100 border-slate-600" 
        : "bg-gray-100 text-gray-900 border-gray-300"
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
  // Break very large content into manageable chunks to prevent rendering issues
  const contentChunks = useMemo(() => chunkContent(content), [content]);
  
  // Enhanced markdown parsing with better code block detection
  const parseMarkdown = (text: string) => {
    const parts: Array<{ type: 'text' | 'code' | 'inline-code'; content: string; language?: string }> = [];
    
    // First, handle code blocks (```language\ncode\n```
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

  const renderInline = (text: string): ReactNode[] => {
    const tokens: Array<{ type: 'text' | 'bold' | 'italic' | 'code'; value: string }> = [];
    let i = 0;

    const pushText = (value: string) => {
      if (value) tokens.push({ type: 'text', value });
    };

    while (i < text.length) {
      if (text[i] === '`') {
        const end = text.indexOf('`', i + 1);
        if (end !== -1) {
          tokens.push({ type: 'code', value: text.slice(i + 1, end) });
          i = end + 1;
          continue;
        }
      }

      if (text.startsWith('**', i) || text.startsWith('__', i)) {
        const marker = text.slice(i, i + 2);
        const end = text.indexOf(marker, i + 2);
        if (end !== -1) {
          tokens.push({ type: 'bold', value: text.slice(i + 2, end) });
          i = end + 2;
          continue;
        }
      }

      if (text[i] === '*' || text[i] === '_') {
        const marker = text[i];
        const end = text.indexOf(marker, i + 1);
        if (end !== -1) {
          tokens.push({ type: 'italic', value: text.slice(i + 1, end) });
          i = end + 1;
          continue;
        }
      }

      const nextSpecial = text.slice(i + 1).search(/[`*_]/);
      if (nextSpecial === -1) {
        pushText(text.slice(i));
        break;
      }
      pushText(text.slice(i, i + nextSpecial + 1));
      i += nextSpecial + 1;
    }

    return tokens.map((token, index) => {
      if (token.type === 'bold') {
        return <strong key={`bold-${index}`}>{token.value}</strong>;
      }
      if (token.type === 'italic') {
        return <em key={`italic-${index}`}>{token.value}</em>;
      }
      if (token.type === 'code') {
        return <InlineCode key={`code-${index}`} isDark={isDark}>{token.value}</InlineCode>;
      }
      return <span key={`text-${index}`}>{token.value}</span>;
    });
  };

  const renderList = (items: ReactNode[], ordered: boolean, key: string) => {
    if (ordered) {
      return <ol key={key} className="ml-4 list-decimal list-inside space-y-1">{items}</ol>;
    }
    return <ul key={key} className="ml-4 list-disc list-inside space-y-1">{items}</ul>;
  };

  // Format text content (handle line breaks, basic markdown)
  const formatText = (text: string) => {
    const lines = text.split('\n');
    const nodes: ReactNode[] = [];
    let listItems: ReactNode[] = [];
    let listOrdered: boolean | null = null;

    const flushList = (keySuffix: string) => {
      if (listItems.length === 0 || listOrdered === null) return;
      nodes.push(renderList(listItems, listOrdered, `list-${keySuffix}`));
      listItems = [];
      listOrdered = null;
    };

    lines.forEach((line, i) => {
      // Headers
      if (line.startsWith('### ')) {
        flushList(`${i}-h3`);
        nodes.push(
          <h3 key={`h3-${i}`} className="text-lg font-semibold mt-4 mb-2 first:mt-0">
            {line.slice(4)}
          </h3>
        );
        return;
      }
      if (line.startsWith('## ')) {
        flushList(`${i}-h2`);
        nodes.push(
          <h2 key={`h2-${i}`} className="text-xl font-semibold mt-4 mb-2 first:mt-0">
            {line.slice(3)}
          </h2>
        );
        return;
      }
      if (line.startsWith('# ')) {
        flushList(`${i}-h1`);
        nodes.push(
          <h1 key={`h1-${i}`} className="text-2xl font-bold mt-4 mb-2 first:mt-0">
            {line.slice(2)}
          </h1>
        );
        return;
      }

      // Bulleted list
      if (line.match(/^\s*[-*+]\s+/)) {
        if (listOrdered === null) listOrdered = false;
        if (listOrdered === true) {
          flushList(`${i}-ul`);
          listOrdered = false;
        }
        listItems.push(
          <li key={`ul-${i}`}>{renderInline(line.replace(/^\s*[-*+]\s+/, ''))}</li>
        );
        return;
      }

      // Numbered list
      if (line.match(/^\s*\d+\.\s+/)) {
        if (listOrdered === null) listOrdered = true;
        if (listOrdered === false) {
          flushList(`${i}-ol`);
          listOrdered = true;
        }
        listItems.push(
          <li key={`ol-${i}`}>{renderInline(line.replace(/^\s*\d+\.\s+/, ''))}</li>
        );
        return;
      }

      // Empty line
      if (!line.trim()) {
        flushList(`${i}-br`);
        nodes.push(<br key={`br-${i}`} />);
        return;
      }

      flushList(`${i}-p`);
      nodes.push(
        <p key={`p-${i}`} className="leading-relaxed">
          {renderInline(line)}
        </p>
      );
    });

    flushList('end');
    return nodes;
  };

  return (
    <div className={cn(
      "prose prose-sm max-w-none w-full overflow-visible", 
      "break-words",
      className
    )}>
      {contentChunks.map((chunk, chunkIndex) => (
        <div key={`chunk-${chunkIndex}`} className="markdown-chunk overflow-visible w-full">
          {parseMarkdown(chunk).map((part, index) => {
            if (part.type === 'code') {
              return (
                <CodeBlock
                  key={`${chunkIndex}-code-${index}`}
                  language={part.language || 'text'}
                  value={part.content}
                  isDark={isDark}
                />
              );
            } else {
              return (
                <div key={`${chunkIndex}-text-${index}`} className="leading-relaxed w-full overflow-visible">
                  <div className="space-y-2">
                    {formatText(part.content)}
                  </div>
                </div>
              );
            }
          })}
        </div>
      ))}
    </div>
  );
});
