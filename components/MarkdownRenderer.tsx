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
  return (
    <div className="markdown-content" style={{ 
      width: '100%',
      color: '#e8e8ea',
      fontSize: '17px',
      lineHeight: '1.7'
    }}>
      <style>{`
        /* Robust, custom list markers to prevent marker/text separation */
        .markdown-content ul,
        .markdown-content ol {
          list-style: none; /* remove browser markers */
          margin-top: 0.75rem;
          margin-bottom: 0.75rem;
          padding-left: 0; /* we will space using ::before */
        }

        .markdown-content ol { counter-reset: md-ol-counter; }

        .markdown-content li {
          margin-bottom: 0.5rem;
          color: #e8e8ea;
          display: flex;               /* keep marker and text on same line */
          align-items: baseline;
        }

        .markdown-content li::before {
          flex: 0 0 1.5rem;            /* fixed space for marker */
          text-align: right;
          margin-right: 0.5rem;
          color: #e8e8ea;
        }

        .markdown-content ul li::before { content: '•'; }
        .markdown-content ol li { counter-increment: md-ol-counter; }
        .markdown-content ol li::before { content: counter(md-ol-counter) '.'; }

        /* Inline paragraphs specifically inside list items */
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
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;
