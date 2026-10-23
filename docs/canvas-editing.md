# Canvas editing

Select any STICKY to reveal its resize corner. Width and height change independently, from 120 × 80 to 4000 × 4000 BOARD units. Text size stays unchanged. Content wraps and scrolls; on touch, a quick swipe scrolls overflowing text while holding still before dragging moves the STICKY. Collections have a minimum height of 150, with extra space enforced if necessary for member centers and the reserved header plus gap.

Image frames are non-destructive viewports. The first frame resize freezes the displayed image dimensions; later frame expansion reveals hidden pixels at the same scale. Edit STICKY provides image dimensions, proportional scaling and horizontal/vertical offsets. Framing never rewrites the original image. These settings apply to Placard, Raw and finished drawings and are included in backups/sync.

Collection layout is Arranged by default, or Free canvas through Edit STICKY. Members never enter the reserved header. In Free canvas, their centers remain within the Collection content area while their sides or bottom may extend outside. A member too tall for the available area increases the parent height enough to satisfy both constraints. Membership stays while moving/resizing; use Remove from Collection to detach. Existing notes stay stored but are no longer shown in the Collection editor.

Collection stacking contexts keep descendants above their own background. Member layer commands reorder siblings only. The protected header is above descendants. Top-level Collection layering moves its entire group relative to other top-level STICKies. Parent movement carries descendants, and deleting a Collection detaches its immediate members without deleting them.

Collection and nested BOARD titles default to centered and support left/right alignment. Note content keeps its normal alignment.

The pencil button starts Edit Canvas. Drawing uses a transparent viewport overlay with screen-relative brush widths, pen, color, eraser and stroke undo/redo. Existing STICKies stay visible and stationary. Finish crops to nontransparent pixels and saves a PNG Raw Image STICKY at the corresponding BOARD coordinates. Cancel/Escape or an empty Finish adds nothing. Finished drawings are raster Image STICKies; separate stroke editing is not retained. A drawing larger than the supported PNG limit stays in the editor with a message. Cloud applies wait until drawing finishes.

Regression coverage: tests/canvas-editing.cjs and tests/sticky-interactions.cjs. Both native shells use the same assets. Real Android/Windows device checks remain necessary for device-specific rendering and stylus behavior.
