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
                marginTop: '0.5rem',
                marginBottom: '0.5rem'
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
  );
};

export default MarkdownRenderer;
