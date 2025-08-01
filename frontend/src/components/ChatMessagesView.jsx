import { ScrollArea } from "./ui/scroll-area";
import { Loader2, Copy, CopyCheck } from "lucide-react";
import { InputForm } from "@/components/InputForm";
import { Button } from "./ui/button";
import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import { Badge } from "./ui/badge";
import { ActivityTimeline } from "./ActivityTimeline"; // Assuming ActivityTimeline is in the same dir or adjust path
import remarkGfm from "remark-gfm"; //使用remark-gfm插件 渲染例如表格部分
import rehypeRaw from "rehype-raw"; //使用插件渲染markdown中的html部分

// Markdown components (from former ReportView.tsx)
const mdComponents = {
  h1: ({ className, children, ...props }) => (
    <h1 className={cn("text-2xl font-bold mt-4 mb-2", className)} {...props}>
      {children}
    </h1>
  ),
  h2: ({ className, children, ...props }) => (
    <h2 className={cn("text-xl font-bold mt-3 mb-2", className)} {...props}>
      {children}
    </h2>
  ),
  h3: ({ className, children, ...props }) => (
    <h3 className={cn("text-lg font-bold mt-3 mb-1", className)} {...props}>
      {children}
    </h3>
  ),
  p: ({ className, children, ...props }) => (
    <p className={cn("mb-3 leading-7", className)} {...props}>
      {children}
    </p>
  ),
  a: ({ className, children, href, ...props }) => (
    <Badge className="text-xs mx-0.5">
      <a
        className={cn("text-blue-400 hover:text-blue-300 text-xs", className)}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        {...props}
      >
        {children}
      </a>
    </Badge>
  ),
  ul: ({ className, children, ...props }) => (
    <ul className={cn("list-disc pl-6 mb-3", className)} {...props}>
      {children}
    </ul>
  ),
  ol: ({ className, children, ...props }) => (
    <ol className={cn("list-decimal pl-6 mb-3", className)} {...props}>
      {children}
    </ol>
  ),
  li: ({ className, children, ...props }) => (
    <li className={cn("mb-1", className)} {...props}>
      {children}
    </li>
  ),
  blockquote: ({ className, children, ...props }) => (
    <blockquote
      className={cn(
        "border-l-4 border-neutral-600 pl-4 italic my-3 text-sm",
        className
      )}
      {...props}
    >
      {children}
    </blockquote>
  ),
  code: ({ className, children, ...props }) => (
    <code
      className={cn(
        "bg-neutral-900 rounded px-1 py-0.5 font-mono text-xs",
        className
      )}
      {...props}
    >
      {children}
    </code>
  ),
  pre: ({ className, children, ...props }) => (
    <pre
      className={cn(
        "bg-neutral-900 p-3 rounded-lg overflow-x-auto font-mono text-xs my-3",
        className
      )}
      {...props}
    >
      {children}
    </pre>
  ),
  hr: ({ className, ...props }) => (
    <hr className={cn("border-neutral-600 my-4", className)} {...props} />
  ),
  table: ({ className, children, ...props }) => (
    <div className="my-3 overflow-x-auto">
      <table
        className={cn(
          "border-collapse w-full border border-neutral-600",
          className
        )}
        {...props}
      >
        {children}
      </table>
    </div>
  ),
  thead: ({ className, children, ...props }) => (
    <thead className={cn("bg-neutral-8pnpm00", className)} {...props}>
      {children}
    </thead>
  ),
  tbody: ({ className, children, ...props }) => (
    <tbody className={cn("bg-neutral-900", className)} {...props}>
      {children}
    </tbody>
  ),
  tr: ({ className, children, ...props }) => (
    <tr
      className={cn(
        "hover:bg-neutral-800 border-b border-neutral-700",
        className
      )}
      {...props}
    >
      {children}
    </tr>
  ),
  th: ({ className, children, ...props }) => (
    <th
      className={cn(
        "border border-neutral-600 px-3 py-2 text-left font-bold bg-neutral-800",
        className
      )}
      {...props}
    >
      {children}
    </th>
  ),
  td: ({ className, children, ...props }) => (
    <td
      className={cn(
        "border border-neutral-600 px-3 py-2 bg-neutral-900 align-top",
        className
      )}
      {...props}
    >
      {children}
    </td>
  ),
};

// HumanMessageBubble Component
const HumanMessageBubble = ({ message, mdComponents }) => {
  return (
    <div
      className={`text-white rounded-3xl break-words min-h-7 bg-neutral-700 max-w-[100%] sm:max-w-[90%] px-4 pt-3 rounded-br-lg`}
    >
      <ReactMarkdown
        components={mdComponents}
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
      >
        {typeof message.content === "string"
          ? message.content
          : JSON.stringify(message.content)}
      </ReactMarkdown>
    </div>
  );
};

// AiMessageBubble Component
const AiMessageBubble = ({
  message,
  mdComponents,
  handleCopy,
  copiedMessageId,
  handleRetry,
}) => {
  const [isHovering, setIsHovering] = useState(false);

  return (
    <div
      className={`relative break-words flex flex-col flex-1 pb-3`}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <ReactMarkdown
        components={mdComponents}
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
      >
        {typeof message.content === "string"
          ? message.content
          : JSON.stringify(message.content)}
      </ReactMarkdown>

      <div
        className={`absolute bottom-0 right-0 flex gap-1 ${
          message.content.length > 0 && isHovering ? "block" : "hidden"
        }`}
      >
        <Button
          variant="default"
          size={"sm"}
          className="cursor-pointer bg-neutral-700 border-neutral-600 text-neutral-300"
          onClick={() =>
            handleCopy(
              typeof message.content === "string"
                ? message.content
                : JSON.stringify(message.content),
              message.id
            )
          }
        >
          <div className="flex items-center gap-1">
            {copiedMessageId === message.id ? "Copied" : "Copy"}
            {copiedMessageId === message.id ? <CopyCheck /> : <Copy />}
          </div>
        </Button>
        <Button
          variant="default"
          size={"sm"}
          className="cursor-pointer bg-neutral-700 border-neutral-600 text-neutral-300"
          onClick={handleRetry}
        >
          <div className="flex items-center gap-1">Retry</div>
        </Button>
      </div>
    </div>
  );
};

export function ChatMessagesView({
  messages,
  streamMessage,
  isLoading,
  scrollAreaRef,
  onSubmit,
  onCancel,
  liveActivityEvents,
  onNewSearch,
  query,
  setQuery,
  onRetry,
}) {
  const [copiedMessageId, setCopiedMessageId] = useState(null);

  const handleCopy = async (text, messageId) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000); // Reset after 2 seconds
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };
  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 overflow-y-auto" ref={scrollAreaRef}>
        <div className="p-4 md:p-6 space-y-2 max-w-4xl mx-auto pt-16">
          {messages.map((message, index) => {
            const isLast = index === messages.length - 1;
            return (
              <div key={message.id || `msg-${index}`} className="space-y-3">
                <div>
                  {isLast && liveActivityEvents.length > 0 && (
                    <div className="mb-4">
                      <ActivityTimeline
                        processedEvents={liveActivityEvents}
                        isLoading={isLoading}
                      />
                    </div>
                  )}
                </div>
                <div
                  className={`flex items-start gap-3 ${
                    message.type === "user" ? "justify-end" : ""
                  }`}
                >
                  {message.type === "user" ? (
                    <HumanMessageBubble
                      message={message}
                      mdComponents={mdComponents}
                    />
                  ) : (
                    <AiMessageBubble
                      message={message}
                      mdComponents={mdComponents}
                      handleCopy={handleCopy}
                      copiedMessageId={copiedMessageId}
                      handleRetry={onRetry}
                    />
                  )}
                </div>
              </div>
            );
          })}
          {isLoading && (
            <div className="mt-2">
              <ReactMarkdown
                components={mdComponents}
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw]}
              >
                {streamMessage}
              </ReactMarkdown>
            </div>
          )}
        </div>
      </ScrollArea>
      <InputForm
        onSubmit={onSubmit}
        isLoading={isLoading}
        onCancel={onCancel}
        hasHistory={messages.length > 0}
        onNewSearch={onNewSearch}
        query={query}
        setQuery={setQuery}
      />
    </div>
  );
}
