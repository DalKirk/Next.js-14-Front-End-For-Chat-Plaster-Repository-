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

      if (!trimmed) {
        i++;
        continue;
      }

      // Headers
      if (trimmed.startsWith('## ')) {
        elements.push(
          <h2 key={i} className="md-h2">
            {renderInline(trimmed.slice(3))}
          </h2>
        );
        i++;
        continue;
      }

      if (trimmed.startsWith('# ')) {
        elements.push(
          <h1 key={i} className="md-h1">
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
            <li key={i} className="md-li">
              {renderInline(itemText)}
            </li>
          );
          i++;
        }
        elements.push(
          <ul key={`ul-${i}`} className="md-ul">
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
            <li key={i} className="md-li-ordered">
              {renderInline(itemText)}
            </li>
          );
          i++;
        }
        elements.push(
          <ol key={`ol-${i}`} className="md-ol">
            {listItems}
          </ol>
        );
        continue;
      }

      // Code blocks
      if (trimmed.startsWith('```')) {
        const codeLines: string[] = [];
        i++;
        while (i < lines.length && !lines[i].trim().startsWith('```')) {
          codeLines.push(lines[i]);
          i++;
        }
        i++;
        elements.push(
          <pre key={`pre-${i}`} className="md-pre">
            <code className="md-code-block">{codeLines.join('\n')}</code>
          </pre>
        );
        continue;
      }

      // Regular paragraph
      elements.push(
        <p key={i} className="md-p">
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
      if (text[i] === '*' && text[i + 1] === '*') {
        if (current) {
          parts.push(current);
          current = '';
        }
        const end = text.indexOf('**', i + 2);
        if (end !== -1) {
          parts.push(<strong key={i} className="md-strong">{text.slice(i + 2, end)}</strong>);
          i = end + 2;
          continue;
        }
      }

      if (text[i] === '`') {
        if (current) {
          parts.push(current);
          current = '';
        }
        const end = text.indexOf('`', i + 1);
        if (end !== -1) {
          parts.push(<code key={i} className="md-code">{text.slice(i + 1, end)}</code>);
          i = end + 1;
          continue;
        }
      }

      current += text[i];
      i++;
    }

    if (current) parts.push(current);
    return parts.length > 0 ? parts : text;
  };

  return (
    <>
      <style>{`
        /* Isolate from parent styles */
        .md-renderer {
          all: initial;
          display: block !important;
          width: 100% !important;
          color: #e4e4e7 !important;
          font-size: 16px !important;
          line-height: 1.6 !important;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif !important;
        }
        
        .md-renderer * {
          box-sizing: border-box !important;
        }
        
        .md-ul {
          all: initial !important;
          display: block !important;
          list-style-type: disc !important;
          margin: 0.75rem 0 !important;
          padding-left: 1.5rem !important;
          color: #e4e4e7 !important;
          font-family: inherit !important;
        }
        
        .md-ol {
          all: initial !important;
          display: block !important;
          list-style-type: decimal !important;
          margin: 0.75rem 0 !important;
          padding-left: 1.5rem !important;
          color: #e4e4e7 !important;
          font-family: inherit !important;
        }
        
        .md-li, .md-li-ordered {
          display: list-item !important;
          list-style-position: outside !important;
          margin-bottom: 0.375rem !important;
          color: #e4e4e7 !important;
          line-height: 1.6 !important;
          font-family: inherit !important;
          font-size: 16px !important;
          padding-left: 0.25rem !important;
        }
        
        .md-li {
          list-style-type: disc !important;
        }
        
        .md-li-ordered {
          list-style-type: decimal !important;
        }
        
        .md-p {
          all: initial !important;
          display: block !important;
          margin: 0.75rem 0 !important;
          color: #e4e4e7 !important;
          line-height: 1.6 !important;
          font-family: inherit !important;
          font-size: 16px !important;
        }
        
        .md-h1 {
          all: initial !important;
          display: block !important;
          font-size: 1.75rem !important;
          font-weight: 700 !important;
          margin-top: 1.5rem !important;
          margin-bottom: 1rem !important;
          color: #ffffff !important;
          font-family: inherit !important;
        }
        
        .md-h2 {
          all: initial !important;
          display: block !important;
          font-size: 1.5rem !important;
          font-weight: 600 !important;
          margin-top: 1.5rem !important;
          margin-bottom: 0.75rem !important;
          color: #ffffff !important;
          font-family: inherit !important;
        }
        
        .md-strong {
          font-weight: 600 !important;
          color: #ffffff !important;
        }
        
        .md-code {
          background-color: rgba(255, 255, 255, 0.1) !important;
          color: #fbbf24 !important;
          padding: 0.125rem 0.375rem !important;
          border-radius: 0.25rem !important;
          font-size: 0.875em !important;
          font-family: monospace !important;
        }
        
        .md-pre {
          all: initial !important;
          display: block !important;
          background-color: rgba(0, 0, 0, 0.3) !important;
          padding: 1rem !important;
          border-radius: 0.5rem !important;
          overflow-x: auto !important;
          margin: 1rem 0 !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          font-family: monospace !important;
        }
        
        .md-code-block {
          font-family: monospace !important;
          font-size: 0.875rem !important;
          color: #e4e4e7 !important;
          display: block !important;
        }
      `}</style>
      <div className="md-renderer">
        {renderMarkdown(content)}
      </div>
    </>
  );
};

export default MarkdownRenderer;
