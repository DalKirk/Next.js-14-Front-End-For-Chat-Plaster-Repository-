import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface MarkdownRendererProps {
  content: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  return (
    <div style={{ width: '100%' }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
        code({ node, inline, className, children, ...props }: any) {
          const match = /language-(\w+)/.exec(className || '');
          return !inline && match ? (
            <SyntaxHighlighter 
              style={vscDarkPlus} 
              language={match[1]} 
              PreTag="div"
            >
              {String(children).replace(/\n$/, '')}
            </SyntaxHighlighter>
          ) : (
            <code 
              style={{
                backgroundColor: '#27272a',
                color: '#fbbf24',
                padding: '2px 6px',
                borderRadius: '4px',
                fontFamily: 'monospace',
                fontSize: '0.9em'
              }} 
              {...props}
            >
              {children}
            </code>
          );
        },
        h2({ children, ...props }: any) {
          return (
            <h2 
              style={{
                fontSize: '1.5rem',
                fontWeight: '600',
                marginTop: '1.5rem',
                marginBottom: '0.75rem',
                color: '#ffffff',
                borderBottom: '1px solid #3f3f46',
                paddingBottom: '0.5rem'
              }}
              {...props}
            >
              {children}
            </h2>
          );
        },
        h3({ children, ...props }: any) {
          return (
            <h3 
              style={{
                fontSize: '1.25rem',
                fontWeight: '600',
                marginTop: '1.25rem',
                marginBottom: '0.5rem',
                color: '#fafafa'
              }}
              {...props}
            >
              {children}
            </h3>
          );
        },
        // Style lists with proper spacing
        ul({ children, ...props }: any) {
          return (
            <ul 
              style={{
                listStyleType: 'disc',
                marginLeft: '1.5rem',
                marginTop: '0.75rem',
                marginBottom: '0.75rem',
                paddingLeft: '0.5rem'
              }}
              {...props}
            >
              {children}
            </ul>
          );
        },
        ol({ children, ...props }: any) {
          return (
            <ol 
              style={{
                listStyleType: 'decimal',
                marginLeft: '1.5rem',
                marginTop: '0.75rem',
                marginBottom: '0.75rem',
                paddingLeft: '0.5rem'
              }}
              {...props}
            >
              {children}
            </ol>
          );
        },
        li({ children, ...props }: any) {
          return (
            <li 
              style={{
                marginBottom: '0.5rem',
                lineHeight: '1.6',
                color: '#e4e4e7'
              }}
              {...props}
            >
              {children}
            </li>
          );
        },
        // Style paragraphs
        p({ children, ...props }: any) {
          return (
            <p 
              style={{
                marginTop: '0.75rem',
                marginBottom: '0.75rem',
                lineHeight: '1.6',
                color: '#e4e4e7'
              }}
              {...props}
            >
              {children}
            </p>
          );
        },
        strong({ children, ...props }: any) {
          return (
            <strong 
              style={{
                fontWeight: '600',
                color: '#ffffff'
              }}
              {...props}
            >
              {children}
            </strong>
          );
        },
        // Style links
        a({ children, href, ...props }: any) {
          return (
            <a 
              href={href} 
              target="_blank" 
              rel="noopener noreferrer"
              style={{
                color: '#60a5fa',
                textDecoration: 'none'
              }}
              {...props}
            >
              {children}
            </a>
          );
        },
        // Style blockquotes
        blockquote({ children, ...props }: any) {
          return (
            <blockquote 
              style={{
                borderLeft: '4px solid #3f3f46',
                paddingLeft: '1rem',
                margin: '1rem 0',
                color: '#a1a1aa',
                fontStyle: 'italic'
              }}
              {...props}
            >
              {children}
            </blockquote>
          );
        }
      }}
    >
      {content}
    </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;
