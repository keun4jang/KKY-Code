"use client"

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'

export function MarkdownMessage({ content }: { content: string }) {
  return (
    <div className="prose prose-sm max-w-none dark:prose-invert">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code(props) {
            const { children, className } = props
            const match = /language-(\w+)/.exec(className || '')
            const codeText = String(children).replace(/\n$/, '')

            if (match) {
              return (
                <div className="relative group">
                  <button
                    onClick={() => navigator.clipboard.writeText(codeText)}
                    className="absolute right-2 top-2 text-xs bg-gray-700 text-white rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition"
                  >
                    복사
                  </button>
                  <SyntaxHighlighter language={match[1]} style={oneDark}>
                    {codeText}
                  </SyntaxHighlighter>
                </div>
              )
            }
            return <code className={className}>{children}</code>
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
