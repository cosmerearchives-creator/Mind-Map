# Link preview cards

Explicit canvas Paste of a web URL creates a link item in that Board's Library. Existing editor paste remains normal text/rich-text paste. Manual link saves and newly pasted Milanote link cards also request metadata. Preview title, site, thumbnail and icon are saved with the card; original URL remains the navigation target. No web page is embedded or executed. Video badges open the external video page.

Windows and Android retrieve HTTPS page metadata through the origin-restricted native clipboard bridge. HTTP preview retrieval attempts HTTPS; the original clickable URL is preserved. Page HTML is limited to its first 512 KiB; image bodies to 2 MiB. Redirects are bounded and revalidated; credentials, unusual ports and private/local network addresses are rejected. Retrieval uses no app/website authentication cookies. HTML is parsed inertly, text is escaped, and only locally stored image bytes are rendered. Unavailable metadata preserves a usable URL card. Saving an offline fallback link again can retry retrieval; reopening a saved preview does not fetch it again.

Tests: link-previews-ui.cjs (inert HTML, title/image/icon/video, Library placement, persistence, no reload fetch, offline fallback); native Windows address checks in updater tests. Physical Android behavior and metadata on all third-party websites remain unverified.
