import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import type { ComponentPropsWithoutRef } from 'react';

interface Props {
  content: string;
}

export function MarkdownRenderer({ content }: Props) {
  return (
    <ReactMarkdown
      components={{
        code({ className, children, ...rest }: ComponentPropsWithoutRef<'code'>) {
          const match = /language-(\w+)/.exec(className || '');
          const code = String(children).replace(/\n$/, '');
          if (match) {
            return (
              <SyntaxHighlighter style={oneDark} language={match[1]} PreTag="div">
                {code}
              </SyntaxHighlighter>
            );
          }
          return <code className={`bg-gray-800 px-1 rounded text-sm ${className || ''}`} {...rest}>{children}</code>;
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
