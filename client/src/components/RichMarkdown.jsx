import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ExternalLink, MapPin } from 'lucide-react';

export default function RichMarkdown({ content }) {
  if (!content) return null;

  return (
    <div className="rich-markdown-content">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children, ...props }) => {
            const isMap = href?.includes('google.com/maps') || href?.includes('maps.google.com');
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className={isMap ? 'markdown-map-link' : 'markdown-link'}
                {...props}
              >
                {isMap && <MapPin size={13} className="inline-map-icon" />}
                <span>{children}</span>
                {!isMap && <ExternalLink size={11} className="inline-external-icon" />}
              </a>
            );
          },
          table: ({ children }) => (
            <div className="markdown-table-wrapper">
              <table className="markdown-table">{children}</table>
            </div>
          ),
          h1: ({ children }) => <h1 className="md-h1">{children}</h1>,
          h2: ({ children }) => <h2 className="md-h2">{children}</h2>,
          h3: ({ children }) => <h3 className="md-h3">{children}</h3>,
          h4: ({ children }) => <h4 className="md-h4">{children}</h4>,
          blockquote: ({ children }) => <blockquote className="md-blockquote">{children}</blockquote>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
