'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const TestMarkdown = () => {
  const testContent = `## Consistently Democratic (Blue States):

- California
- New York
- Illinois
- Massachusetts
- Maryland

## Leaning Democratic:

- Colorado
- Virginia
- Minnesota`;

  return (
    <div style={{ padding: '40px', backgroundColor: '#18181b', minHeight: '100vh' }}>
      <h1 style={{ color: 'white' }}>Markdown Test</h1>
      
      <div style={{ backgroundColor: '#27272a', padding: '20px', borderRadius: '8px', marginTop: '20px' }}>
        <h3 style={{ color: 'white' }}>Raw Text:</h3>
        <pre style={{ color: '#a1a1aa', whiteSpace: 'pre-wrap' }}>{testContent}</pre>
      </div>

      <div style={{ backgroundColor: '#27272a', padding: '20px', borderRadius: '8px', marginTop: '20px' }}>
        <h3 style={{ color: 'white' }}>Rendered Markdown:</h3>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h2: ({ children }) => (
              <h2 style={{
                fontSize: '1.5rem',
                fontWeight: '600',
                marginTop: '1.5rem',
                marginBottom: '0.75rem',
                color: '#ffffff'
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
                paddingLeft: '0.5rem',
                color: '#e4e4e7'
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
            )
          }}
        >
          {testContent}
        </ReactMarkdown>
      </div>
    </div>
  );
};

export default TestMarkdown;
