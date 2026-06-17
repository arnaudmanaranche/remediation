# Convention + override for design system detection

Remediation auto-detects the design system by looking for `tokens/` or `@scope/design-tokens` in the project. Users can override this with a `remediation.config.js` file.

Convention-first means zero config for standard projects. The override handles non-standard layouts without forcing everyone into a config file. If nothing is found, remediation prints a clear error explaining how to configure it.
