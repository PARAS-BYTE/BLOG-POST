import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, Check } from 'lucide-react';

/**
 * CodeBlock Component with syntax block styling and 1-click Copy button
 */
function CodeBlock({ className, children }) {
  const [copied, setCopied] = useState(false);
  const codeText = String(children || '').replace(/\n$/, '');
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : '';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(codeText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code snippet:', err);
    }
  };

  return (
    <div className="my-5 rounded-xl overflow-hidden bg-slate-900 border border-slate-800 shadow-md">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800/90 border-b border-slate-700/60 text-xs font-mono text-slate-300">
        <span className="font-semibold uppercase tracking-wider text-slate-400">
          {language || 'code'}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-700/60 hover:bg-slate-700 text-slate-200 hover:text-white transition cursor-pointer text-xs"
          title="Copy code to clipboard"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400 font-medium">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-slate-400" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-sm text-slate-100 font-mono leading-relaxed">
        <code>{children}</code>
      </pre>
    </div>
  );
}

/**
 * MarkdownRenderer
 * Formats Markdown content into clean, modern, and accessible HTML elements.
 * Handles headings, bold/italics, lists, tables, blockquotes, links, and code blocks.
 */
export default function MarkdownRenderer({ content, className = '' }) {
  if (!content) return null;

  return (
    <div className={`markdown-content ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Headings
          h1: ({ children }) => (
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-8 mb-4 tracking-tight first:mt-0">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mt-7 mb-3 tracking-tight pb-2 border-b border-slate-100 first:mt-0">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg sm:text-xl font-bold text-slate-800 mt-6 mb-2 first:mt-0">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-base sm:text-lg font-semibold text-slate-800 mt-5 mb-2">
              {children}
            </h4>
          ),
          h5: ({ children }) => (
            <h5 className="text-sm sm:text-base font-semibold text-slate-800 mt-4 mb-1">
              {children}
            </h5>
          ),
          h6: ({ children }) => (
            <h6 className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-slate-500 mt-4 mb-1">
              {children}
            </h6>
          ),

          // Paragraphs & Inline Formatting
          p: ({ children }) => (
            <p className="text-slate-700 leading-relaxed mb-4 text-base sm:text-lg font-normal last:mb-0">
              {children}
            </p>
          ),
          strong: ({ children }) => (
            <strong className="font-bold text-slate-900">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="italic text-slate-800">{children}</em>
          ),
          del: ({ children }) => (
            <del className="line-through text-slate-400">{children}</del>
          ),

          // Lists
          ul: ({ children }) => (
            <ul className="list-disc pl-6 space-y-2 mb-5 text-slate-700 text-base sm:text-lg">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-6 space-y-2 mb-5 text-slate-700 text-base sm:text-lg">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="leading-relaxed pl-1">{children}</li>
          ),

          // Blockquotes
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-blue-500 bg-blue-50/60 rounded-r-xl px-5 py-3.5 my-5 text-slate-700 italic text-base sm:text-lg shadow-xs">
              {children}
            </blockquote>
          ),

          // Horizontal rule
          hr: () => <hr className="my-8 border-slate-200" />,

          // Links
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline font-medium transition-colors"
            >
              {children}
            </a>
          ),

          // Code blocks & Inline code
          pre: ({ children }) => <>{children}</>,
          code: ({ className: codeClassName, children, ...props }) => {
            const isInline = !codeClassName && !String(children).includes('\n');
            if (isInline) {
              return (
                <code
                  className="bg-slate-100 text-rose-600 px-1.5 py-0.5 rounded text-[0.88em] font-mono border border-slate-200"
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return (
              <CodeBlock className={codeClassName} {...props}>
                {children}
              </CodeBlock>
            );
          },

          // Tables
          table: ({ children }) => (
            <div className="overflow-x-auto my-6 rounded-xl border border-slate-200 shadow-xs">
              <table className="min-w-full divide-y divide-slate-200 text-sm sm:text-base">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-slate-50 text-slate-800 font-semibold">{children}</thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-slate-100 bg-white text-slate-700">{children}</tbody>
          ),
          th: ({ children }) => (
            <th className="px-4 py-3 text-left font-semibold text-slate-900">{children}</th>
          ),
          td: ({ children }) => (
            <td className="px-4 py-3 text-slate-700 align-top">{children}</td>
          )
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
