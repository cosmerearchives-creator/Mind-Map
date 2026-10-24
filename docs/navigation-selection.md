# Canvas selection and navigation

Ctrl+A (or Command+A) selects all current-Board Stickies outside editors and dialogs. Selection includes offscreen and collapsed Collection members but does not select contents inside other Boards or items in the Board Library. Existing copy behavior includes owned nested Board data when a selected Board Sticky is copied. Existing owned-Board delete confirmation still applies. Inputs and rich-text editors retain normal text selection; other UI text cannot be highlighted.

Only selected Stickies display their connection + control. Ctrl+click Board navigation opens/activates a separate tab; normal clicks reuse the active tab. Because tabs are keyed by Board ID, a Board already open in another tab is activated rather than duplicated. The explicit + tab picker opens a separate tab. Single completed clicks navigate; drags and Shift selection do not.

Breadcrumbs show the owned ancestry, excluding the current Board already named by its tab. Shortcut navigation resolves the destination's owning path. Cycles are guarded. The sync icon exposes details through tooltip/accessible name and opens the cloud dialog. No sync status text replaces the breadcrumb path.

Windows menu auto-hide uses a native form message filter with a WebView key-event fallback. Alt reveals the native menu, Escape/actions/canvas focus hide it. Native compilation is covered by CI; physical keyboard/focus behavior requires Windows device verification.
