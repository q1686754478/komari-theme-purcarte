import createDOMPurify from "dompurify";

/** Localized hints allow basic formatting, never links, styles or active content. */
export function LocaleHtml({ html }: { html: string }) {
  const sanitized = createDOMPurify(window).sanitize(html, {
    ALLOWED_TAGS: ["p", "br", "strong", "b", "em", "i", "h2", "ul", "ol", "li"],
    ALLOWED_ATTR: [],
    ALLOW_DATA_ATTR: false,
    ALLOW_ARIA_ATTR: false,
  });
  return <div dangerouslySetInnerHTML={{ __html: sanitized }} />;
}
