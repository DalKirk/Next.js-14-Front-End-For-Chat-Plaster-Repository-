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
              listStylePosition: 'inside',  // ← CRITICAL FIX
              marginLeft: '0',               // ← CHANGED from '1.5rem'
              marginTop: '0.75rem',
              marginBottom: '0.75rem',
              paddingLeft: '1rem'
            }}>
              {children}
            </ul>
          ),
          ol: ({ children }) => (           // ← NEW: Added ordered lists
            <ol style={{
              listStyleType: 'decimal',
              listStylePosition: 'inside',  // ← CRITICAL FIX
              marginLeft: '0',
              marginTop: '0.75rem',
              marginBottom: '0.75rem',
              paddingLeft: '1rem'
            }}>
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li style={{
              marginBottom: '0.5rem',
              lineHeight: '1.6',
              color: '#e4e4e7',
              display: 'list-item'          // ← ADDED: Ensures proper display
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
          ),
          code: ({ children }) => (         // ← NEW: Inline code styling
            <code style={{
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              padding: '0.2rem 0.4rem',
              borderRadius: '0.25rem',
              fontSize: '0.9em',
              fontFamily: 'monospace'
            }}>
              {children}
            </code>
          ),
          pre: ({ children }) => (          // ← NEW: Code block styling
            <pre style={{
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              padding: '1rem',
              borderRadius: '0.5rem',
              overflowX: 'auto',
              marginTop: '1rem',
              marginBottom: '1rem'
            }}>
              {children}
            </pre>
          )
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;
