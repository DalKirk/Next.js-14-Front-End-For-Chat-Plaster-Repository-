import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownRendererProps {
  content: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  return (
    <div className="markdown-wrapper" style={{ 
      width: '100%',
      color: '#e4e4e7',
      fontSize: '16px',
      lineHeight: '1.6'
    }}>
      <style>{`
        .markdown-wrapper ul {
          list-style-type: disc !important;
          padding-left: 1.5rem !important;
          margin: 0.75rem 0 !important;
        }
        
        .markdown-wrapper ol {
          list-style-type: decimal !important;
          padding-left: 1.5rem !important;
          margin: 0.75rem 0 !important;
        }
        
        .markdown-wrapper li {
          display: list-item !important;
          margin-bottom: 0.375rem !important;
          color: #e4e4e7 !important;
        }
        
        /* CRITICAL: Force paragraphs inside list items to be inline */
        .markdown-wrapper li p {
          display: inline !important;
          margin: 0 !important;
          padding: 0 !important;
        }
        
        /* Force any nested elements to stay inline */
        .markdown-wrapper li > * {
          display: inline !important;
        }
        
        /* But keep the li itself as list-item */
        .markdown-wrapper li {
          display: list-item !important;
        }
        
        .markdown-wrapper > p,
        .markdown-wrapper > div > p {
          margin: 0.75rem 0 !important;
          color: #e4e4e7 !important;
          display: block !important;
        }
        
        .markdown-wrapper strong {
          font-weight: 600;
          color: #ffffff;
        }
        
        .markdown-wrapper code {
          background-color: rgba(255, 255, 255, 0.1);
          color: #fbbf24;
          padding: 0.125rem 0.375rem;
          border-radius: 0.25rem;
          font-size: 0.875em;
          font-family: monospace;
        }
        
        .markdown-wrapper pre {
          background-color: rgba(0, 0, 0, 0.3);
          padding: 1rem;
          border-radius: 0.5rem;
          overflow-x: auto;
          margin: 1rem 0;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .markdown-wrapper pre code {
          background: none;
          color: #e4e4e7;
          padding: 0;
        }

        .markdown-wrapper h2 {
          font-size: 1.5rem;
          font-weight: 600;
          margin-top: 1.5rem;
          margin-bottom: 0.75rem;
          color: #ffffff;
        }
      `}</style>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;
