# Silverlight Archives — Collection image import fallback

- Recover images attached to copied Milanote Collections when the clipboard contains a sign-in-only app image URL. If that URL fails, try its equivalent public Milanote CDN path while preserving the image path and query parameters.
- Preserve exact downloaded image bytes, Collection membership and formatted notes. Tiny color placeholders are not substituted for missing originals.
- Windows and Android accept the specific CDN original-image path in addition to existing resized-image paths. Host, HTTPS, credentials, port, MIME, size and redirect safeguards remain in place.

Verified with an isolated import of the reported Collection: both original PNG images and its formatted Note imported together and survived reload. Synthetic 401-to-CDN and existing clipboard recovery regressions also passed. Physical Android importing remains unverified.
