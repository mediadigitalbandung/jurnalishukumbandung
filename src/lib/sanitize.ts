// Input sanitization utilities
import sanitize from "sanitize-html";

const ALLOWED_TAGS = [
  "h1", "h2", "h3", "h4", "h5", "h6",
  "p", "br", "hr",
  "strong", "b", "em", "i", "u", "s", "del",
  "a", "img",
  "ul", "ol", "li",
  "blockquote", "pre", "code",
  "table", "thead", "tbody", "tr", "th", "td",
  "div", "span",
  "figure", "figcaption",
  "iframe", // for YouTube embeds
];

const ALLOWED_ATTR: Record<string, sanitize.AllowedAttribute[]> = {
  a: ["href", "target", "rel", "title"],
  img: ["src", "alt", "title", "width", "height", "class"],
  iframe: ["src", "width", "height", "allowfullscreen", "frameborder", "data-youtube-video"],
  div: ["class", "id", "style"],
  span: ["class", "id", "style"],
  td: ["style", "class"],
  th: ["style", "class"],
  table: ["class", "style"],
  "*": ["class", "id"],
};

export function sanitizeHtml(html: string): string {
  return sanitize(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTR,
    allowedIframeHostnames: ["www.youtube.com", "youtube.com", "www.youtube-nocookie.com"],
  });
}

// Ad HTML — stricter whitelist to block <script>, event handlers, and dangerous tags.
// Allows images, iframes, links, and basic layout div/span for banner ads.
const AD_ALLOWED_TAGS = [
  "a", "img", "iframe", "picture", "source",
  "div", "span", "p", "br",
  "ins", // AdSense / ad network tags
];

const AD_ALLOWED_ATTR: Record<string, sanitize.AllowedAttribute[]> = {
  a: ["href", "target", "rel", "title", "class", "style"],
  img: ["src", "alt", "title", "width", "height", "class", "style", "loading", "srcset"],
  iframe: ["src", "width", "height", "frameborder", "scrolling", "allow", "allowfullscreen", "title", "class", "style"],
  source: ["src", "srcset", "type", "media"],
  picture: ["class", "style"],
  div: ["class", "id", "style", "data-ad-client", "data-ad-slot", "data-ad-format", "data-full-width-responsive"],
  span: ["class", "id", "style"],
  p: ["class", "style"],
  ins: ["class", "style", "data-ad-client", "data-ad-slot", "data-ad-format", "data-full-width-responsive"],
};

export function sanitizeAdHtml(html: string): string {
  return sanitize(html, {
    allowedTags: AD_ALLOWED_TAGS,
    allowedAttributes: AD_ALLOWED_ATTR,
    // Trusted ad network domains only — no arbitrary iframes
    allowedIframeHostnames: [
      "googleads.g.doubleclick.net",
      "www.googletagservices.com",
      "pagead2.googlesyndication.com",
      "tpc.googlesyndication.com",
      "www.youtube.com",
      "www.youtube-nocookie.com",
    ],
    // Block any javascript: URLs
    allowedSchemes: ["http", "https", "mailto", "tel", "data"],
    allowedSchemesAppliedToAttributes: ["href", "src", "srcset"],
  });
}

// Sanitize plain text input (no HTML allowed)
export function sanitizeText(text: string): string {
  return text
    .replace(/[<>]/g, "") // Remove angle brackets
    .trim();
}

// Validate and sanitize email
export function sanitizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

// Sanitize slug
export function sanitizeSlug(slug: string): string {
  return slug
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100);
}
