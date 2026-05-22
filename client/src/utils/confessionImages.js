export function getConfessionImages(confession) {
  const sources = [];

  if (Array.isArray(confession?.images)) {
    sources.push(...confession.images);
  }

  if (confession?.image) {
    sources.unshift(confession.image);
  }

  return Array.from(
    new Set(
      sources
        .map((src) => (typeof src === "string" ? src.trim() : ""))
        .filter(Boolean)
    )
  );
}
