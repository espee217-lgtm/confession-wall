export const SEO_ORIGIN = "https://confession-wall-325.pages.dev";

const DEFAULT_TITLE =
  "Confession Wall - Anonymous Confessions in a Forest Grove";
const DEFAULT_DESCRIPTION =
  "Share anonymous confessions, explore trending stories, and react with the Confession Wall community across Grove, Budding, and Scorched realms.";
const DEFAULT_IMAGE = `${SEO_ORIGIN}/forest.webp`;
const THEME_COLOR = "#0b1f12";

const hasDocument = () =>
  typeof document !== "undefined" && Boolean(document.head);

const getOrCreateMeta = (attribute, value) => {
  if (!hasDocument()) return null;

  const existing = Array.from(document.head.querySelectorAll("meta")).find(
    (tag) => tag.getAttribute(attribute) === value
  );

  if (existing) return existing;

  const tag = document.createElement("meta");
  tag.setAttribute(attribute, value);
  document.head.appendChild(tag);
  return tag;
};

const setMetaName = (name, content) => {
  const tag = getOrCreateMeta("name", name);
  if (tag) tag.setAttribute("content", content || "");
};

const setMetaProperty = (property, content) => {
  const tag = getOrCreateMeta("property", property);
  if (tag) tag.setAttribute("content", content || "");
};

const setCanonical = (href) => {
  if (!hasDocument()) return;

  let tag = document.head.querySelector('link[rel="canonical"]');
  if (!tag) {
    tag = document.createElement("link");
    tag.setAttribute("rel", "canonical");
    document.head.appendChild(tag);
  }

  tag.setAttribute("href", href);
};

export const buildCanonicalUrl = (pathname = "/") => {
  const cleanPath = String(pathname || "/").split("?")[0].split("#")[0];
  const normalizedPath =
    cleanPath === "/" ? "/" : `/${cleanPath.replace(/^\/+|\/+$/g, "")}`;

  return `${SEO_ORIGIN}${normalizedPath}`;
};

export const applySeo = ({
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  pathname = "/",
  canonical,
  robots = "index,follow",
  image = DEFAULT_IMAGE,
  type = "website",
} = {}) => {
  if (!hasDocument()) return;

  const canonicalUrl = canonical || buildCanonicalUrl(pathname);

  document.title = title;

  setMetaName("description", description);
  setMetaName("robots", robots);
  setMetaName("theme-color", THEME_COLOR);

  setCanonical(canonicalUrl);

  setMetaProperty("og:type", type);
  setMetaProperty("og:site_name", "Confession Wall");
  setMetaProperty("og:title", title);
  setMetaProperty("og:description", description);
  setMetaProperty("og:url", canonicalUrl);
  setMetaProperty("og:image", image);

  setMetaName("twitter:card", "summary_large_image");
  setMetaName("twitter:title", title);
  setMetaName("twitter:description", description);
  setMetaName("twitter:image", image);
};

export const defaultSeo = {
  title: DEFAULT_TITLE,
  description: DEFAULT_DESCRIPTION,
  image: DEFAULT_IMAGE,
};
