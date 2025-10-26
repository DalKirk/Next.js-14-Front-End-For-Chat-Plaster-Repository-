import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownRendererProps {
  content: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  return (
    <div style={{ 
      width: '100%',
      color: '#e4e4e7',
      fontSize: '16px',
      lineHeight: '1.6'
    }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h2: ({ children }) => (
            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: '600',
              marginTop: '1.5rem',
              marginBottom: '0.75rem',
              color: '#ffffff',
              borderBottom: '1px solid #3f3f46',
              paddingBottom: '0.5rem'
            }}>
              {children}
            </h2>
          ),
          ul: ({ children }) => (
            <ul style={{
              listStyleType: 'disc',
              marginLeft: '1.5rem',
              marginTop: '0.75rem',
              marginBottom: '0.75rem',
              paddingLeft: '0.5rem'
            }}>
              {children}
            </ul>
          ),
          li: ({ children }) => (
            <li style={{
              marginBottom: '0.5rem',
              lineHeight: '1.6',
              color: '#e4e4e7'
            }}>
              {children}
            </li>
          ),
          p: ({ children }) => (
            <p style={{
              marginTop: '0.75rem',
              marginBottom: '0.75rem',
              lineHeight: '1.6',
              color: '#e4e4e7'
            }}>
              {children}
            </p>
          ),
          strong: ({ children }) => (
            <strong style={{
              fontWeight: '600',
              color: '#ffffff'
            }}>
              {children}
            </strong>
          )
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;
