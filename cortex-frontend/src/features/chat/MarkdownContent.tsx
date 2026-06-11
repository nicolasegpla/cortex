import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { cleanMarkdown } from './cleanMarkdown';

interface MarkdownContentProps {
    content: string;
    role?: 'user' | 'assistant';
}

export function MarkdownContent({ content, role = 'assistant' }: MarkdownContentProps) {
    if (!content) {
        return <span>{'\u00A0'}</span>;
    }

    const cleanedContent = cleanMarkdown(content, role);

    return (
        <div className="markdown-content">
        <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
                // Override default rendering to add CSS classes
                p: ({ children }) => <p className="markdown-content__paragraph">{children}</p>,
                strong: ({ children }) => <strong className="markdown-content__strong">{children}</strong>,
                em: ({ children }) => <em className="markdown-content__em">{children}</em>,
                code: ({ className, children }) => {
                    const isInline = !className;
                    return (
                        <code className={isInline ? 'markdown-content__code-inline' : 'markdown-content__code-block'}>
                            {children}
                        </code>
                    );
                },
                pre: ({ children }) => <pre className="markdown-content__pre">{children}</pre>,
                ul: ({ children }) => <ul className="markdown-content__ul">{children}</ul>,
                ol: ({ children }) => <ol className="markdown-content__ol">{children}</ol>,
                li: ({ children }) => <li className="markdown-content__li">{children}</li>,
                table: ({ children }) => (
                    <div className="markdown-content__table-wrapper">
                        <table className="markdown-content__table">{children}</table>
                    </div>
                ),
                thead: ({ children }) => <thead className="markdown-content__thead">{children}</thead>,
                tbody: ({ children }) => <tbody className="markdown-content__tbody">{children}</tbody>,
                tr: ({ children }) => <tr className="markdown-content__tr">{children}</tr>,
                th: ({ children }) => <th className="markdown-content__th">{children}</th>,
                td: ({ children }) => <td className="markdown-content__td">{children}</td>,
                a: ({ href, children }) => (
                    <a href={href} className="markdown-content__link" target="_blank" rel="noopener noreferrer">
                        {children}
                    </a>
                ),
                blockquote: ({ children }) => <blockquote className="markdown-content__blockquote">{children}</blockquote>,
                hr: () => <hr className="markdown-content__hr" />,
            }}
        >
            {cleanedContent}
        </ReactMarkdown>
        </div>
    );
}
