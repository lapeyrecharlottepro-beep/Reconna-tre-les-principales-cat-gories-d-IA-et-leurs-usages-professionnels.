# REVIEW — ANEORAS « Le fil d'or »

Creative calls
- Storyline built: "Le fil d'or" (the brand's gold curve + four-point star carries all 11 scenes). Not built: "Une journée dans l'organisation" (needs real footage), "Typographie cinétique pure".
- Palette and type from the client's brand guide (#05254E / #B71932 / #D6A13B, Montserrat), which supersedes the colours in the brief (#1E354D / #933231).
- Logo: vector redraw from the brand guide image (no file available in the container). Replace with the official SVG in compositions/signature.html.
- No voiceover / music: HeyGen (voice, music catalogue) is unreachable from this environment. The script runs as subtitles (variable `subtitles`), timed for a French VO at ~2.4 words/s.

Measured
- `hyperframes check`: ok, 0 errors, 0 warnings (layout infos only: intentional off-canvas world/doors).
- SFX peaks measured with `hyperframes audio` and aligned to picture; one clipping file (impact-bass-2) removed. Sound was measured, not heard.
- Review sheets: every scene start/middle, every seam (±0.2 s).

Fixed during review
- t=70.0–70.4 · doors covered the opening of scene 9 (initial state ordering) → fromTo on each door.
- t=64–70 · education milestone labels overlapped each other and the title → path lowered, labels placed per node.
- t=0 · empty thumbnail → first title line on screen at frame 0.

Weakest shot
- Scene 5 (route): four stops at the same cadence read a little like a list. With more time: one continuous camera move with shorter stops.

Kept on purpose
- Subtitle plates are near-invisible over navy grounds (navy plate on navy): text stays white and readable.
