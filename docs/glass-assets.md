# Full glass pieces

Generated using the built-in image_gen tool, with transparent backgrounds. Each PNG contains its entire glass interior, reflections and bevel. Do not rebuild the bevel with SVG or paste rectangular material crops inside the piece.

Input 1: the individual silhouette from the dashboard's shared geometry at 1400px width. Input 2: a smoky glass material reference used during generation; it is not required at runtime.

Assets: income.png, bookings.png, leader.png, peak.png, chart.png, profile.png, packages.png, hours.png.

## Generation prompt

Use case: style-transfer. Create a production transparent PNG of exactly ONE smoked dark glass shard. Image 1 is the EXACT silhouette guide: preserve its polygon outline, proportions, orientation, asymmetric edges and framing precisely. Do not simplify into a rectangle, do not introduce a new outline. Image 2 is the glass material reference (atlas): reproduce its photographic crystalline fractured silver bevel, subtle irregular chips and faceted reflections, near-black neutral charcoal smoky glass, no blue tint. Render the ENTIRE piece as a single continuous high-quality image: seamless glass interior and integrated outer bevel on every edge. Fine irregular bright highlights concentrated on chipped corners, thin glass edges not a thick metal rim. Smooth broad subtle reflections; central 75% dark and calm for text. No internal rectangular clipping, no rectangular pasted textures, no panels within panels, no flat vector look, no repeated decorative triangles. No text, symbols, charts, orange light, or other objects. Orthographic straight-on, no perspective. Keep exterior transparent alpha, opaque smoky charcoal interior. Maintain the guide's small exterior margin, the whole silhouette visible. Return only the single shard.

Each call appends the individual asset identifier. PNG positioning including transparent margins is recorded in `Frontend/src/components/ui/glass-image-layout.ts`.
