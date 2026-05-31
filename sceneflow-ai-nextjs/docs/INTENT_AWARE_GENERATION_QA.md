# Intent-Aware Generation QA Checklist

Manual regression matrix for content intent routing across Blueprint, Series, Script, and Audience Resonance.

## Scenarios

| Scenario | Genre | Expected output |
|----------|-------|-----------------|
| K-12 curriculum module | `education` | Host/instructor, learning objectives, segment beats; no invented antagonist or fictional plot |
| Living Wall documentary | `documentary` | Real subjects, thesis, narrative over facts; no fictional protagonist |
| SaaS product demo | `product-demo` | Problem → solution → proof → CTA; not three-act drama |
| Corporate L&D safety | `training` | Compliance/module structure; scenarios not screenplay fiction |
| Drama short | `drama` | Full character arc, protagonist/antagonist, three-act beats (unchanged) |

## Blueprint generation

1. Open Create Blueprint dialog, select each genre above.
2. Confirm intent badge shows under Format / Genre (e.g. "Informational / Non-Fiction").
3. Generate blueprint; verify `protagonist`/`antagonist` fields use semantic mapping (host/challenge, not drama characters) for non-fiction/commercial.
4. Confirm creative direction chips filter by intent (no "Add More Conflict" for commercial-only paths unless fiction).

## Audience Resonance

1. Run AR analysis on each scenario above.
2. Non-fiction/commercial: verify radar categories differ from fiction (e.g. Takeaway Value, Value Proposition).
3. Confirm AR does **not** deduct for "missing antagonist" or "character ghost" on education/documentary.
4. Apply a guided revise recommendation; confirm content is **not** converted into fictional narrative.

## Series

1. Create series with format `educational`, `documentary`, or `narrative`.
2. Generate storyline; verify bible mapping matches format.
3. Add episodes via episodes/add; verify batch prompt uses format-aware language (not "TV series story arcs" for educational).

## Script generation

1. Start Production from each blueprint type.
2. Verify progress messages match format (e.g. "Developing learning segments" for education).
3. Confirm script uses appropriate narration mode and does not force screenplay subtext on instructional content.

## Metadata persistence

1. After blueprint generation, confirm `project.metadata.contentIntent` is set.
2. Series episode start copies `contentIntent` to spawned project metadata.
