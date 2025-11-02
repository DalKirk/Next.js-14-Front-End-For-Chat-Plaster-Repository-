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
      color: '#e4e4e7',
      fontSize: '16px',
      lineHeight: '1.6'
    }}>
      <style>{`
        .markdown-content ul {
          list-style-type: disc;
          padding-left: 1.5rem;
          margin-top: 0.75rem;
          margin-bottom: 0.75rem;
        }
        
        .markdown-content ol {
          list-style-type: decimal;
          padding-left: 1.5rem;
          margin-top: 0.75rem;
          margin-bottom: 0.75rem;
        }
        
        .markdown-content li {
          margin-bottom: 0.5rem;
          color: #e4e4e7;
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
        
        .markdown-content > p {
          margin-top: 0.75rem;
          margin-bottom: 0.75rem;
          color: #e4e4e7;
        }
        
        .markdown-content strong {
          font-weight: 600;
          color: #ffffff;
        }
        
        .markdown-content code {
          background-color: rgba(255, 255, 255, 0.1);
          padding: 0.2rem 0.4rem;
          border-radius: 0.25rem;
          font-size: 0.9em;
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
          // CRITICAL: Replace p tags inside li with just the content
          p: ({node, children, ...props}) => {
            // Check if parent is a list item by checking if we're in a tight list context
            return <>{children}</>;
          },
          li: ({node, children, ...props}) => {
            return <li style={{ color: '#e4e4e7' }}>{children}</li>;
          }
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;
