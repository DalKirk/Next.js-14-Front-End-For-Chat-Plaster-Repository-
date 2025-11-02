import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownRendererProps {
  content: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  // Rehype plugin: unwrap <p> that are direct children of <li> to keep marker and text on one line
  const rehypeUnwrapListItemParagraphs = () => (tree: any) => {
    const visit = (node: any) => {
      if (node && node.type === 'element') {
        if (node.tagName === 'li' && Array.isArray(node.children)) {
          node.children = node.children.flatMap((child: any) => {
            if (child && child.type === 'element' && child.tagName === 'p') {
              return Array.isArray(child.children) ? child.children : [];
            }
            return [child];
          });
        }
        if (Array.isArray(node.children)) {
          node.children.forEach(visit);
        }
      }
    };
    visit(tree);
  };

  // Heuristic: auto-convert plain line lists into markdown bullets when no markers are present
  const autoListify = (md: string): string => {
    const normalized = md.replace(/\r\n/g, '\n');
    const lines = normalized.split('\n');
    const hasListMarkers = lines.some((l) => /^\s*([*+-]|\d+\.)\s+/.test(l));
    if (hasListMarkers) return md;

    // Count non-empty lines
    const items = lines.filter((l) => l.trim() !== '');
    if (items.length < 3) return md; // avoid converting short snippets

    // Average line length heuristic to avoid converting paragraphs
    const avgLen = items.reduce((s, l) => s + l.trim().length, 0) / items.length;
    if (avgLen > 80) return md;

    // Convert each non-empty line into a bullet, preserve empty lines as separators
    const converted = lines
      .map((l) => {
        if (l.trim() === '') return '';
        if (/^\s*[#>]/.test(l)) return l; // keep headings/quotes
        return `- ${l.trim()}`;
      })
      .join('\n');
    return converted;
  };
  return (
    <div className="markdown-content" style={{ 
      width: '100%',
      color: '#e8e8ea',
      fontSize: '17px',
      lineHeight: '1.7'
    }}>
      <style>{`
        /* Restore native markers and ensure inline alignment */
        .markdown-content ul,
        .markdown-content ol {
          list-style-position: inside;
          margin-left: 0;
          padding-left: 1rem;
          margin-top: 0.75rem;
          margin-bottom: 0.75rem;
        }

        .markdown-content li {
          margin-bottom: 0.5rem;
          color: #e8e8ea;
        }

        /* Keep text inline with marker for paragraphs directly under list items */
        .markdown-content li > p { display: inline; margin: 0; }
        /* Also handle any nested p produced by plugins */
        .markdown-content li p { display: inline; margin: 0; }
        
        .markdown-content h2 {
          font-size: 1.5rem;
          font-weight: 600;
          margin-top: 1.5rem;
          margin-bottom: 0.75rem;
          color: #ffffff;
          border-bottom: 1px solid #3f3f46;
          padding-bottom: 0.5rem;
        }
        
        .markdown-content .regular-paragraph,
        .markdown-content > p {
          margin-top: 0.75rem;
          margin-bottom: 0.75rem;
          color: #e8e8ea;
        }
        
        .markdown-content strong {
          font-weight: 600;
          color: #ffffff;
        }
        
        .markdown-content code {
          background-color: transparent; /* Remove grey highlight for inline code */
          padding: 0.1rem 0.2rem;
          border-radius: 0.25rem;
          font-size: 0.95em;
          font-family: monospace;
        }
        
        .markdown-content pre {
          background-color: rgba(255, 255, 255, 0.05);
          padding: 1rem;
          border-radius: 0.5rem;
          overflow-x: auto;
          margin-top: 1rem;
          margin-bottom: 1rem;
        }
      `}</style>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeUnwrapListItemParagraphs]}
      >
        {autoListify(content)}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;
