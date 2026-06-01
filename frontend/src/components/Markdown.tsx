import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  CommandBlock,
  CompareBlock,
  GenericCode,
  OutputBlock,
} from "./CodeBlocks";

function extractText(children: React.ReactNode): string {
  if (typeof children === "string") return children;
  if (Array.isArray(children)) return children.map(extractText).join("");
  if (children && typeof children === "object" && "props" in children) {
    return extractText(
      (children as { props: { children?: React.ReactNode } }).props.children
    );
  }
  return "";
}

const components: Components = {
  code({ className, children, ...props }) {
    const match = /language-(\w+)/.exec(className ?? "");
    const lang = match?.[1];
    const text = extractText(children).replace(/\n$/, "");

    // Inline code (sin lenguaje): se deja a los estilos prose.
    if (!lang) {
      return (
        <code className={className} {...props}>
          {children}
        </code>
      );
    }

    switch (lang) {
      case "compare":
        return <CompareBlock raw={text} />;
      case "bash":
      case "sh":
      case "shell":
        return <CommandBlock code={text} lang="bash" />;
      case "output":
      case "console":
      case "text":
        return <OutputBlock code={text} />;
      default:
        return <GenericCode code={text} lang={lang} />;
    }
  },
  // react-markdown envuelve los bloques en <pre>; al renderizar nosotros
  // nuestros propios contenedores, evitamos el <pre> exterior.
  pre({ children }) {
    return <>{children}</>;
  },
};

export function Markdown({ content }: { content: string }) {
  return (
    <div className="prose-docker max-w-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
