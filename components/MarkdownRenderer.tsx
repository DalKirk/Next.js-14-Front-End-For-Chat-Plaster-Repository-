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
          margin: 0.75rem 0;
        }
        
        .markdown-content ol {
          list-style-type: decimal;
          padding-left: 1.5rem;
          margin: 0.75rem 0;
        }
        
        .markdown-content li {
          margin-bottom: 0.375rem;
          color: #e4e4e7;
          line-height: 1.6;
        }
        
        .markdown-content li > p {
          display: inline;
          margin: 0;
        }
        
        .markdown-content h1 {
          font-size: 1.75rem;
          font-weight: 700;
          margin-top: 1.5rem;
          margin-bottom: 1rem;
          color: #ffffff;
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
        
        .markdown-content h3 {
          font-size: 1.25rem;
          font-weight: 600;
          margin-top: 1.25rem;
          margin-bottom: 0.5rem;
          color: #ffffff;
        }
        
        .markdown-content p {
          margin: 0.75rem 0;
          color: #e4e4e7;
          line-height: 1.6;
        }
        
        .markdown-content strong {
          font-weight: 600;
          color: #ffffff;
        }
        
        .markdown-content em {
          font-style: italic;
          color: #e4e4e7;
        }
        
        .markdown-content a {
          color: #60a5fa;
          text-decoration: underline;
        }
        
        .markdown-content a:hover {
          color: #93c5fd;
        }
        
        .markdown-content code {
          background-color: rgba(255, 255, 255, 0.1);
          color: #fbbf24;
          padding: 0.125rem 0.375rem;
          border-radius: 0.25rem;
          font-size: 0.875em;
          font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
        }
        
        .markdown-content pre {
          background-color: rgba(0, 0, 0, 0.3);
          padding: 1rem;
          border-radius: 0.5rem;
          overflow-x: auto;
          margin: 1rem 0;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .markdown-content pre code {
          background: none;
          color: #e4e4e7;
          padding: 0;
          font-size: 0.875rem;
        }
        
        .markdown-content blockquote {
          border-left: 3px solid #60a5fa;
          padding-left: 1rem;
          margin: 1rem 0;
          color: #d1d5db;
          font-style: italic;
        }
        
        .markdown-content hr {
          border: none;
          border-top: 1px solid #3f3f46;
          margin: 1.5rem 0;
        }
        
        .markdown-content table {
          border-collapse: collapse;
          width: 100%;
          margin: 1rem 0;
        }
        
        .markdown-content th,
        .markdown-content td {
          border: 1px solid #3f3f46;
          padding: 0.5rem;
          text-align: left;
        }
        
        .markdown-content th {
          background-color: rgba(255, 255, 255, 0.05);
          font-weight: 600;
          color: #ffffff;
        }
      `}</style>
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]}
        components={{
          // Remove wrapper from list item paragraphs
          p: ({children}) => {
            return <p>{children}</p>;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;
