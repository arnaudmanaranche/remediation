# Token bypass detection

We detect when a hardcoded value exists in the code but a token is already defined for it in the design system.

This is the highest-value rule: it catches real drift between the design system and the implementation. Auto-detection reads token files (`tokens/`, `theme/`, etc.) and extracts mappings. Users can override with `remediation.config.js` tokens.

The rule scans all JSX/TSX files and matches hex values against known tokens. This is more useful than generic "hardcoded color" detection because it proves the token exists but isn't used.
