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
      // Links: [text](url)
      if (text[i] === '[') {
        const closeBracket = text.indexOf(']', i + 1);
        if (closeBracket !== -1 && text[closeBracket + 1] === '(') {
          const closeParen = text.indexOf(')', closeBracket + 2);
          if (closeParen !== -1) {
            if (current) {
              parts.push(current);
              current = '';
            }
            const linkText = text.slice(i + 1, closeBracket);
            const linkUrl = text.slice(closeBracket + 2, closeParen);
            console.log('Parsed markdown link:', { linkText, linkUrl });
            parts.push(
              <a 
                key={i} 
                href={linkUrl} 
                className="md-link"
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  console.log('Link clicked:', linkUrl);
                  e.stopPropagation();
                }}
              >
                {linkText}
              </a>
            );
            i = closeParen + 1;
            continue;
          }
        }
      }

      // Auto-detect URLs
      if (text[i] === 'h' && text.slice(i, i + 4) === 'http') {
        const urlEnd = text.search(/\s|$/, i);
        const actualEnd = urlEnd === -1 ? text.length : urlEnd;
        if (current) {
          parts.push(current);
          current = '';
        }
        const url = text.slice(i, actualEnd);
        console.log('Auto-detected URL:', url);
        parts.push(
          <a 
            key={i} 
            href={url} 
            className="md-link"
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              console.log('Auto-link clicked:', url);
              e.stopPropagation();
            }}
          >
            {url}
          </a>
        );
        i = actualEnd;
        continue;
      }

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
          max-width: 100% !important;
          color: #e4e4e7 !important;
          font-size: 16px !important;
          line-height: 1.6 !important;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif !important;
          word-wrap: break-word !important;
          word-break: break-word !important;
          overflow-wrap: break-word !important;
          pointer-events: auto !important;
          user-select: auto !important;
        }
        
        .md-renderer * {
          box-sizing: border-box !important;
          pointer-events: auto !important;
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
          padding-left: 3rem !important;
          margin-left: 0.5rem !important;
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
          padding-left: 0.5rem !important;
          margin-left: 0 !important;
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
          word-wrap: break-word !important;
          word-break: break-word !important;
          overflow-wrap: break-word !important;
          max-width: 100% !important;
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
        
        .md-link {
          all: unset !important;
          color: #00ffff !important;
          text-decoration: none !important;
          cursor: pointer !important;
          transition: all 0.3s ease !important;
          display: inline !important;
          font-family: inherit !important;
          font-size: inherit !important;
          line-height: inherit !important;
          pointer-events: auto !important;
          user-select: auto !important;
          background: linear-gradient(135deg, #00ffff, #0080ff) !important;
          background-clip: text !important;
          -webkit-background-clip: text !important;
          -webkit-text-fill-color: transparent !important;
          text-shadow: 0 0 10px rgba(0, 255, 255, 0.5) !important;
          padding: 2px 4px !important;
          border-radius: 4px !important;
          font-weight: 600 !important;
          position: relative !important;
        }
        
        .md-link::before {
          content: '' !important;
          position: absolute !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
          background: linear-gradient(135deg, rgba(0, 255, 255, 0.2), rgba(0, 128, 255, 0.2)) !important;
          border-radius: 4px !important;
          z-index: -1 !important;
          transition: all 0.3s ease !important;
        }
        
        .md-link:hover {
          text-shadow: 0 0 20px rgba(0, 255, 255, 0.8), 0 0 30px rgba(0, 128, 255, 0.6) !important;
          transform: translateY(-1px) !important;
        }
        
        .md-link:hover::before {
          background: linear-gradient(135deg, rgba(0, 255, 255, 0.4), rgba(0, 128, 255, 0.4)) !important;
          box-shadow: 0 0 15px rgba(0, 255, 255, 0.3) !important;
        }
        
        .md-link:active, .md-link:focus {
          text-shadow: 0 0 25px rgba(0, 255, 255, 1), 0 0 40px rgba(0, 128, 255, 0.8) !important;
          outline: none !important;
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
          max-width: 100% !important;
          box-sizing: border-box !important;
        }
        
        .md-code-block {
          font-family: monospace !important;
          font-size: 0.875rem !important;
          color: #e4e4e7 !important;
          display: block !important;
          white-space: pre-wrap !important;
          word-wrap: break-word !important;
          word-break: break-all !important;
          overflow-wrap: break-word !important;
          max-width: 100% !important;
        }
      `}</style>
      <div className="md-renderer break-words overflow-wrap-anywhere max-w-full">
        {renderMarkdown(content)}
      </div>
    </>
  );
};

export default MarkdownRenderer;
