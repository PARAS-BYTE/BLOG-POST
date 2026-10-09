import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, Check } from 'lucide-react';

/**
 * CodeBlock Component
 * macOS/Linear-style window header with terminal dots, language tag, and 1-click Copy button
 */
function CodeBlock({ className, children }) {
  const [copied, setCopied] = useState(false);
  const codeText = String(children || '').replace(/\n$/, '');
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : '';

  const handleCopy = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(codeText);
      } else {
        const input = document.createElement('textarea');
        input.value = codeText;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code snippet:', err);
    }
  };

  return (
    <div className="my-6 rounded-2xl overflow-hidden bg-[#0d1117] border border-slate-800/80 shadow-md">
      {/* Terminal Title Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#161b22] border-b border-slate-800 text-xs font-mono">
        <div className="flex items-center gap-2">
          {/* macOS window control dots */}
          <div className="flex items-center gap-1.5 mr-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]/80 inline-block"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]/80 inline-block"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f]/80 inline-block"></span>
          </div>
          <span className="font-semibold uppercase tracking-wider text-slate-400 text-[11px]">
            {language || 'code'}
          </span>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer text-xs font-sans"
          title="Copy code snippet to clipboard"
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

      <pre className="p-4 sm:p-5 overflow-x-auto text-[13.5px] sm:text-sm text-slate-100 font-mono leading-relaxed">
        <code>{children}</code>
      </pre>
    </div>
  );
}

/**
 * MarkdownRenderer
 * Formats Markdown content into clean, editorial-grade, and responsive HTML elements.
 * Optimized for readability, typography hierarchy, and technical content.
 */
export default function MarkdownRenderer({ content, className = '' }) {
  if (!content) return null;

  return (
    <div className={`markdown-content article-prose ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Headings with clean proportional scaling and anchor feel
          h1: ({ children }) => (
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 mt-10 mb-5 tracking-tight first:mt-0 leading-tight">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 mt-9 mb-4 tracking-tight pb-2.5 border-b border-slate-100 first:mt-0 leading-snug">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg sm:text-xl font-bold text-slate-800 mt-7 mb-3 tracking-tight first:mt-0 leading-snug">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-base sm:text-lg font-semibold text-slate-800 mt-6 mb-2">
              {children}
            </h4>
          ),
          h5: ({ children }) => (
            <h5 className="text-sm sm:text-base font-semibold text-slate-800 mt-5 mb-1.5">
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
            <p className="text-slate-700 leading-relaxed mb-6 text-base sm:text-[17px] font-normal last:mb-0">
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

          // Lists with clear visual hierarchy
          ul: ({ children }) => (
            <ul className="list-disc pl-6 space-y-2.5 mb-6 text-slate-700 text-base sm:text-[17px]">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-6 space-y-2.5 mb-6 text-slate-700 text-base sm:text-[17px]">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="leading-relaxed pl-1">{children}</li>
          ),

          // Editorial Blockquotes
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-blue-600 bg-gradient-to-r from-blue-50/70 via-indigo-50/30 to-transparent rounded-r-2xl px-5 sm:px-6 py-4 my-6 text-slate-700 italic text-base sm:text-lg shadow-2xs leading-relaxed">
              {children}
            </blockquote>
          ),

          // Horizontal rule
          hr: () => <hr className="my-10 border-slate-200" />,

          // Links
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline underline-offset-4 decoration-blue-300 hover:decoration-blue-600 font-medium transition-colors"
            >
              {children}
            </a>
          ),

          // Markdown Image Embeds with elegant styling and responsive frame
          img: ({ src, alt }) => (
            <figure className="my-8">
              <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 shadow-sm">
                <img
                  src={src}
                  alt={alt || 'Article visual'}
                  className="w-full h-auto object-cover max-h-[500px]"
                  loading="lazy"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              </div>
              {alt && (
                <figcaption className="text-center text-xs text-slate-500 mt-2 italic">
                  {alt}
                </figcaption>
              )}
            </figure>
          ),

          // Code blocks & Inline code
          pre: ({ children }) => <>{children}</>,
          code: ({ className: codeClassName, children, ...props }) => {
            const isInline = !codeClassName && !String(children).includes('\n');
            if (isInline) {
              return (
                <code
                  className="bg-slate-100 text-blue-700 px-1.5 py-0.5 rounded-md text-[0.88em] font-mono border border-slate-200 font-semibold"
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

          // Markdown Tables with responsive wrapper
          table: ({ children }) => (
            <div className="overflow-x-auto my-7 rounded-2xl border border-slate-200 shadow-2xs">
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
            <th className="px-4 py-3.5 text-left font-semibold text-slate-900 text-xs sm:text-sm uppercase tracking-wider bg-slate-50">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-4 py-3.5 text-slate-700 align-top text-xs sm:text-sm leading-relaxed">
              {children}
            </td>
          )
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
