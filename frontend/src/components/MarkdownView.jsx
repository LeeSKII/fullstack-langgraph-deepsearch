import { cn } from "@/lib/utils";
import { Badge } from "./ui/badge";

const MarkdownView = {
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
    <tbody className={cn("bg-neutral-100", className)} {...props}>
      {children}
    </tbody>
  ),
  tr: ({ className, children, ...props }) => (
    <tr
      className={cn(
        "hover:bg-neutral-100 border-b border-neutral-700",
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
        "border border-neutral-600 px-3 py-2 text-left font-bold bg-neutral-200",
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
        "border border-neutral-600 px-3 py-2 bg-neutral-100 align-top",
        className
      )}
      {...props}
    >
      {children}
    </td>
  ),
};

export default MarkdownView;
