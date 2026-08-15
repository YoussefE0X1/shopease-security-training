interface SafeHtmlProps {
  html: string;
  className?: string;
}

// Renders untrusted HTML as plain text — React escapes everything, so stored
// review/description payloads can never execute in the browser.
export default function SafeHtml({ html, className }: SafeHtmlProps) {
  return <p className={className}>{html}</p>;
}
