/**
 * Utility functions for Markdown handling
 */

/**
 * Strips markdown formatting syntax to provide clean plain text for card previews and excerpts.
 * Removes headers, bold/italic markers, links, code blocks, bullet markers, etc.
 * 
 * @param {string} markdown - Raw markdown string
 * @returns {string} - Clean plain text
 */
export function stripMarkdown(markdown) {
  if (!markdown || typeof markdown !== 'string') return '';

  let text = markdown;

  // Remove code blocks
  text = text.replace(/```[\s\S]*?```/g, '');
  
  // Remove inline code
  text = text.replace(/`([^`]+)`/g, '$1');

  // Remove images
  text = text.replace(/!\[([^\]]*)\]\([^)]*\)/g, '');

  // Convert links [text](url) -> text
  text = text.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');

  // Remove headers (#, ##, ###, etc.)
  text = text.replace(/^#{1,6}\s+/gm, '');

  // Remove bold and italic markers (**, *, __, _)
  text = text.replace(/(\*\*|__)(.*?)\1/g, '$2');
  text = text.replace(/(\*|_)(.*?)\1/g, '$2');

  // Remove strikethrough (~~text~~)
  text = text.replace(/~~(.*?)~~/g, '$1');

  // Remove blockquotes (> )
  text = text.replace(/^\s*>\s+/gm, '');

  // Remove unordered list markers (*, -, +)
  text = text.replace(/^\s*[-*+]\s+/gm, '');

  // Remove ordered list markers (1., 2., etc.)
  text = text.replace(/^\s*\d+\.\s+/gm, '');

  // Remove horizontal rules
  text = text.replace(/^[-*_]{3,}\s*$/gm, '');

  // Clean up extra whitespace and newlines
  text = text.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();

  return text;
}
