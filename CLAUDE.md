# SRMS — project instructions for Claude

## Design work (MANDATORY workflow)

Whenever asked to design or restyle ANYTHING (pages, components, dashboards, emails, banners, slides), do NOT design from your defaults. First consult the design libraries installed in `.claude/skills/`:

1. **Query the databases before choosing a direction:**
   - `ui-ux-pro-max` — run `python .claude/skills/ui-ux-pro-max/scripts/search.py "<query>" --design-system` for style/palette/font/pattern recommendations (67 styles, 161 palettes, 57 font pairings).
   - `ux-ui-architect` — 138 named design systems with full specs in `design-systems/library/<name>/DESIGN.md`; taste guides in `taste/`. Do the Brief Inference step (industry, audience, one mood adjective, layout family) before generating anything.
   - `design-aesthetics` — aesthetic-family DESIGN.md prompts (editorial, warm, brutalist, data-dense…). Pick ONE family and commit fully.
   - Also available: `claude-design`, `ui-ux-design-pro`, `frontend-design`, `theme-factory`, `web-artifacts-builder`.
2. **Commit to one deliberate, named direction** from these libraries and state which one and why it fits this product.
3. **The libraries propose, the brief disposes** — recommendations must pass the anti-generic rules below.

## Anti-generic design rules (always apply)

Every design decision must be motivated by THIS product: a school records management system bought by headteachers and school administrators in Ghana, often viewed on mid-range Android phones on slow connections. "It looks modern" is not a reason.

Never: uppercase pill/eyebrow badges above headlines; one accent-colored word inside a headline; tilted/floating fake app mockups with macOS traffic-light dots; purple/violet/indigo palettes; gradients, glow shadows, glassmorphism, blur blobs, dot-grid textures; everything-in-threes layouts; scroll-triggered fade-ins and count-up numbers; copy words like seamless/effortless/powerful/all-in-one; "Get Started" CTAs; invented testimonials, fake user counts, fake star ratings, or hardcoded mock data presented as live.

Always: light theme, one accent color justified from the product's world; CTAs naming real actions ("See a sample report card", "Request a quote", a phone number); real content and honest labeling ("Sample data") on any illustrative UI; specifics over adjectives; readable on a 360px phone; credibility through real details (real contact info, real client schools) — the Skuuni lesson.

## Environment notes

- Python 3.12 is installed (may need PATH refresh in fresh shells: `python` via py launcher or full path).
- After committing to main, sync the staging branch too.
