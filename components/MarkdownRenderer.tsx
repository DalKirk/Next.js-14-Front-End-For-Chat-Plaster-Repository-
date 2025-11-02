import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownRendererProps {
  content: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  return (
    <div className="markdown-content" style={{ 
      width: '100%',
      color: '#e8e8ea',
      fontSize: '17px',
      lineHeight: '1.7'
    }}>
      <style>{`
        .markdown-content ul {
          list-style-type: disc;
          list-style-position: inside; /* keep bullets inline before text */
          margin-left: 0;
          padding-left: 1.0rem;
          margin-top: 0.75rem;
          margin-bottom: 0.75rem;
        }
        
        .markdown-content ol {
          list-style-type: decimal;
          list-style-position: inside; /* keep numbers inline before text */
          margin-left: 0;
          padding-left: 1.0rem;
          margin-top: 0.75rem;
          margin-bottom: 0.75rem;
        }
        
        .markdown-content li {
          margin-bottom: 0.5rem;
          color: #e8e8ea;
        }
        
        /* Inline paragraphs specifically inside list items */
        .markdown-content li p {
          display: inline;
          margin: 0;
        }
        
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
        components={{
          li: ({ children, ...props }) => {
            // If a list item wraps its text in a single <p>, unwrap it to keep marker and text on the same line.
            const kids = Array.isArray(children) ? children : [children];
            if (kids.length > 0) {
              const first: any = kids[0];
              // Case 1: only a single <p>
              if (kids.length === 1 && first && first.type === 'p') {
                return <li {...props}>{first.props?.children}</li>;
              }
              // Case 2: starts with <p> followed by nested list or other elements
              if (first && first.type === 'p') {
                return (
                  <li {...props}>
                    {first.props?.children}
                    {kids.slice(1)}
                  </li>
                );
              }
            }
            return <li {...props}>{children}</li>;
          }
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;
