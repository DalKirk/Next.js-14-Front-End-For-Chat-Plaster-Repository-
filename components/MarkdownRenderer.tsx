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
          ul: ({ node, ...props }) => (
            <ul style={{ 
              listStyleType: 'disc',
              paddingLeft: '1.5rem',
              margin: '0.75rem 0'
            }} {...props} />
          ),
          ol: ({ node, ...props }) => (
            <ol style={{ 
              listStyleType: 'decimal',
              paddingLeft: '1.5rem',
              margin: '0.75rem 0'
            }} {...props} />
          ),
          li: ({ node, children, ...props }) => (
            <li style={{ 
              marginBottom: '0.375rem',
              color: '#e4e4e7'
            }} {...props}>
              {/* Strip any paragraph wrappers from children */}
              {React.Children.map(children, child => {
                if (React.isValidElement(child) && child.type === 'p') {
                  return child.props.children;
                }
                return child;
              })}
            </li>
          ),
          p: ({ node, ...props }) => (
            <p style={{ 
              margin: '0.75rem 0',
              color: '#e4e4e7'
            }} {...props} />
          ),
          strong: ({ node, ...props }) => (
            <strong style={{ 
              fontWeight: '600',
              color: '#ffffff'
            }} {...props} />
          ),
          code: ({ node, className, ...props }) => {
            const inline = !className?.includes('language-');
            return inline ? (
              <code style={{
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                color: '#fbbf24',
                padding: '0.125rem 0.375rem',
                borderRadius: '0.25rem',
                fontSize: '0.875em',
                fontFamily: 'monospace'
              }} {...props} />
            ) : (
              <code className={className} style={{ 
                color: '#e4e4e7',
                fontFamily: 'monospace'
              }} {...props} />
            );
          },
          pre: ({ node, ...props }) => (
            <pre style={{
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
              padding: '1rem',
              borderRadius: '0.5rem',
              overflowX: 'auto',
              margin: '1rem 0',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }} {...props} />
          )
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;
