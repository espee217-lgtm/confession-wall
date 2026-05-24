Pass 6.4 - Lazy Loading / Async Image Decoding

This patch adds safe loading="lazy" and decoding="async" attributes to non-critical or repeated images.
It does not change layout, asset paths, CSS, backend, auth, payments, shop logic, admin logic, routes, or database code.

Goal:
- Reduce scroll jank from images decoding synchronously while scrolling.
- Delay below-the-fold image loading where safe.
- Keep above-the-fold visuals mostly unchanged.

Check after applying:
- Home
- Trending
- Search/feed pages
- Confession detail page image attachments/comments
- User profile post images
- Shop/settings avatar previews
- Login/register
- Choice/Reena entry page
- Policy pages
