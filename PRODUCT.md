# Product

## Register

brand

## Users

Frontend developers and tech leads evaluating whether to adopt the tool. They land on the site mid-evaluation — they've already heard about the tool, they want to see it work, understand what it catches, and know if it'll fit their stack. Speed of comprehension matters more than persuasion. They are skeptical of marketing; they read code examples before headlines.

The docs surface is secondary: users already convinced who come back for configuration details, rule references, or CI setup.

## Product Purpose

remediation is a CLI that scans React codebases for design system drift — hardcoded values that bypass tokens, near-duplicate components, token-bypass patterns. It outputs a 0–100 health score and a full violation list. It fits into CI with exit code 1 on errors.

Success: a developer runs `npx remediation scan`, sees violations they recognize, understands the rules in under two minutes, and adds it to their project.

## Brand Personality

Precise · Opinionated · Unobtrusive.

The tool does its job and gets out of the way. It doesn't perform or explain itself. It finds problems; you fix them. The site should feel like the output of the tool itself — clear, structured, no ceremony.

## Anti-references

- **Over-engineered dev tool (Vercel/Stripe aesthetic):** no glassmorphism, no dark blur-card gradients, no hero animations that exist to impress rather than explain, no "designed by designers" flourishes.
- **Fluffy SaaS (Notion/Linear vibes):** no pastel gradients, no friendly rounded illustration blobs, no lifestyle screenshots or emoji-first copy.
- **Documentation dump:** not just a dry reference site — the landing page needs a point of view and must demonstrate the product, not describe it.

## Design Principles

1. **Practice what you preach.** A design system linter should have impeccable visual hygiene. No sloppy spacing, no arbitrary color values, no inconsistent sizing. The site is a proof of concept.
2. **Show, don't tell.** The terminal demo is the hero. Copy exists to frame what the user is looking at, not to sell them on a concept.
3. **No ceremony.** Like a well-written linter rule, every UI element does exactly one job. If removing it doesn't hurt, remove it.
4. **Earned restraint.** Minimal is a deliberate choice, not a default. The palette and typography are quiet because the product is the content — not because quiet is safe.
5. **CLI-native.** Mono for code. The site's visual language comes from the output format of the tool itself.

## Accessibility & Inclusion

WCAG AA minimum. All body text ≥4.5:1 against background. Reduced-motion: terminal animations should degrade gracefully (content visible without animation). Keyboard navigation required for FAQ accordion and docs sidebar.
