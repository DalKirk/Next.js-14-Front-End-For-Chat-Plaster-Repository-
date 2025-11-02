import React from 'react';

interface MarkdownRendererProps {
  content: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  const renderMarkdown = (text: string) => {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();

      // Empty line
      if (!trimmed) {
        i++;
        continue;
      }

      // Headers
      if (trimmed.startsWith('## ')) {
        elements.push(
          <h2 key={i} style={{ 
            fontSize: '1.5rem', 
            fontWeight: 600, 
            marginTop: '1.5rem', 
            marginBottom: '0.75rem', 
            color: '#ffffff',
            display: 'block'
          }}>
            {renderInline(trimmed.slice(3))}
          </h2>
        );
        i++;
        continue;
      }

      if (trimmed.startsWith('# ')) {
        elements.push(
          <h1 key={i} style={{ 
            fontSize: '1.75rem', 
            fontWeight: 700, 
            marginTop: '1.5rem', 
            marginBottom: '1rem', 
            color: '#ffffff',
            display: 'block'
          }}>
            {renderInline(trimmed.slice(2))}
          </h1>
        );
        i++;
        continue;
      }

      // Unordered list
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        const listItems: React.ReactNode[] = [];
        while (i < lines.length && (lines[i].trim().startsWith('- ') || lines[i].trim().startsWith('* '))) {
          const itemText = lines[i].trim().slice(2);
          listItems.push(
            <li key={i} style={{ 
              marginBottom: '0.375rem', 
              color: '#e4e4e7',
              display: 'list-item',
              listStyleType: 'disc',
              listStylePosition: 'outside',
              marginLeft: '0',
              paddingLeft: '0'
            }}>
              {renderInline(itemText)}
            </li>
          );
          i++;
        }
        elements.push(
          <ul key={`ul-${i}`} style={{ 
            listStyleType: 'disc', 
            paddingLeft: '1.5rem', 
            margin: '0.75rem 0',
            display: 'block',
            listStylePosition: 'outside'
          }}>
            {listItems}
          </ul>
        );
        continue;
      }

      // Ordered list
      if (trimmed.match(/^\d+\.\s/)) {
        const listItems: React.ReactNode[] = [];
        while (i < lines.length && lines[i].trim().match(/^\d+\.\s/)) {
          const itemText = lines[i].trim().replace(/^\d+\.\s/, '');
          listItems.push(
            <li key={i} style={{ 
              marginBottom: '0.375rem', 
              color: '#e4e4e7',
              display: 'list-item',
              listStyleType: 'decimal',
              listStylePosition: 'outside',
              marginLeft: '0',
              paddingLeft: '0'
            }}>
              {renderInline(itemText)}
            </li>
          );
          i++;
        }
        elements.push(
          <ol key={`ol-${i}`} style={{ 
            listStyleType: 'decimal', 
            paddingLeft: '1.5rem', 
            margin: '0.75rem 0',
            display: 'block',
            listStylePosition: 'outside'
          }}>
            {listItems}
          </ol>
        );
        continue;
      }

      // Code blocks
      if (trimmed.startsWith('```')) {
        const codeLines: string[] = [];
        i++; // Skip opening ```
        while (i < lines.length && !lines[i].trim().startsWith('```')) {
          codeLines.push(lines[i]);
          i++;
        }
        i++; // Skip closing ```
        elements.push(
          <pre key={`pre-${i}`} style={{
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            padding: '1rem',
            borderRadius: '0.5rem',
            overflowX: 'auto',
            margin: '1rem 0',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'block'
          }}>
            <code style={{ 
              fontFamily: 'monospace', 
              fontSize: '0.875rem',
              color: '#e4e4e7',
              display: 'block'
            }}>
              {codeLines.join('\n')}
            </code>
          </pre>
        );
        continue;
      }

      // Regular paragraph
      elements.push(
        <p key={i} style={{ 
          margin: '0.75rem 0', 
          color: '#e4e4e7',
          display: 'block',
          lineHeight: '1.6'
        }}>
          {renderInline(trimmed)}
        </p>
      );
      i++;
    }

    return elements;
  };

  const renderInline = (text: string): React.ReactNode => {
    const parts: React.ReactNode[] = [];
    let current = '';
    let i = 0;

    while (i < text.length) {
      // Bold **text**
      if (text[i] === '*' && text[i + 1] === '*') {
        if (current) {
          parts.push(current);
          current = '';
        }
        const end = text.indexOf('**', i + 2);
        if (end !== -1) {
          parts.push(
            <strong key={i} style={{ fontWeight: 600, color: '#ffffff' }}>
              {text.slice(i + 2, end)}
            </strong>
          );
          i = end + 2;
          continue;
        }
      }

      // Inline code `text`
      if (text[i] === '`') {
        if (current) {
          parts.push(current);
          current = '';
        }
        const end = text.indexOf('`', i + 1);
        if (end !== -1) {
          parts.push(
            <code key={i} style={{
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              color: '#fbbf24',
              padding: '0.125rem 0.375rem',
              borderRadius: '0.25rem',
              fontSize: '0.875em',
              fontFamily: 'monospace'
            }}>
              {text.slice(i + 1, end)}
            </code>
          );
          i = end + 1;
          continue;
        }
      }

      current += text[i];
      i++;
    }

    if (current) {
      parts.push(current);
    }

    return parts.length > 0 ? parts : text;
  };

  return (
    <div style={{ 
      width: '100%',
      color: '#e4e4e7',
      fontSize: '16px',
      lineHeight: '1.6',
      display: 'block'
    }}>
      {renderMarkdown(content)}
    </div>
  );
};

export default MarkdownRenderer;
