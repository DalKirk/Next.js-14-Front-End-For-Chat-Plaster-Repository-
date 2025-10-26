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
              customStyle={{
                margin: '1rem 0',
                borderRadius: '8px',
                border: '1px solid rgba(147, 51, 234, 0.3)',
                boxShadow: '0 0 15px rgba(147, 51, 234, 0.2)'
              }}
            >
              {String(children).replace(/\n$/, '')}
            </SyntaxHighlighter>
          ) : (
            <code 
              style={{
                backgroundColor: 'rgba(39, 39, 42, 0.9)',
                color: '#22d3ee',
                padding: '2px 6px',
                borderRadius: '4px',
                fontFamily: 'monospace',
                border: '1px solid rgba(34, 211, 238, 0.3)',
                boxShadow: '0 0 8px rgba(34, 211, 238, 0.2)'
              }} 
              {...props}
            >
              {children}
            </code>
          );
        },
        // Style headers with neon
        h1({ children, ...props }: any) {
          return (
            <h1 
              style={{
                fontSize: '2rem',
                fontWeight: '700',
                marginTop: '2rem',
                marginBottom: '1rem',
                color: '#22d3ee',
                textShadow: '0 0 10px rgba(34, 211, 238, 0.5)',
                fontFamily: 'var(--font-orbitron), Orbitron, sans-serif'
              }}
              {...props}
            >
              {children}
            </h1>
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
                color: '#d946ef',
                textShadow: '0 0 10px rgba(217, 70, 239, 0.5)',
                fontFamily: 'var(--font-orbitron), Orbitron, sans-serif'
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
                color: '#9333ea',
                textShadow: '0 0 8px rgba(147, 51, 234, 0.5)',
                fontFamily: 'var(--font-orbitron), Orbitron, sans-serif'
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
                marginLeft: '1.5rem',
                marginTop: '0.75rem',
                marginBottom: '0.75rem',
                listStyleType: 'disc',
                color: 'rgba(255, 255, 255, 0.9)'
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
                marginLeft: '1.5rem',
                marginTop: '0.75rem',
                marginBottom: '0.75rem',
                listStyleType: 'decimal',
                color: 'rgba(255, 255, 255, 0.9)'
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
                paddingLeft: '0.25rem'
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
                color: 'rgba(255, 255, 255, 0.9)'
              }}
              {...props}
            >
              {children}
            </p>
          );
        },
        // Style links with cyan neon
        a({ children, href, ...props }: any) {
          return (
            <a 
              href={href} 
              target="_blank" 
              rel="noopener noreferrer"
              style={{
                color: '#22d3ee',
                textDecoration: 'underline',
                transition: 'color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#06b6d4'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#22d3ee'}
              {...props}
            >
              {children}
            </a>
          );
        },
        // Style blockquotes with fuchsia accent
        blockquote({ children, ...props }: any) {
          return (
            <blockquote 
              style={{
                borderLeft: '4px solid #d946ef',
                paddingLeft: '1rem',
                fontStyle: 'italic',
                color: 'rgba(255, 255, 255, 0.8)',
                marginTop: '0.75rem',
                marginBottom: '0.75rem',
                backgroundColor: 'rgba(217, 70, 239, 0.05)',
                padding: '0.75rem 1rem',
                borderRadius: '0 8px 8px 0'
              }}
              {...props}
            >
              {children}
            </blockquote>
          );
        },
        // Style tables
        table({ children, ...props }: any) {
          return (
            <div style={{ overflowX: 'auto', marginTop: '1rem', marginBottom: '1rem' }}>
              <table 
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  border: '1px solid rgba(147, 51, 234, 0.3)'
                }}
                {...props}
              >
                {children}
              </table>
            </div>
          );
        },
        th({ children, ...props }: any) {
          return (
            <th 
              style={{
                padding: '0.75rem',
                backgroundColor: 'rgba(147, 51, 234, 0.2)',
                color: '#d946ef',
                fontWeight: '600',
                textAlign: 'left',
                border: '1px solid rgba(147, 51, 234, 0.3)'
              }}
              {...props}
            >
              {children}
            </th>
          );
        },
        td({ children, ...props }: any) {
          return (
            <td 
              style={{
                padding: '0.75rem',
                border: '1px solid rgba(147, 51, 234, 0.2)',
                color: 'rgba(255, 255, 255, 0.9)'
              }}
              {...props}
            >
              {children}
            </td>
          );
        }
      }}
    >
      {content}
    </ReactMarkdown>
  );
};

export default MarkdownRenderer;
