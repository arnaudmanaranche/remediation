# Integrate knip and jscpd for dead/duplicate detection

We use knip for dead component detection and jscpd for duplicate code detection, rather than building these capabilities from scratch.

Both tools are mature, fast, and well-maintained. Reimplementing their functionality would take months and produce an inferior result. This lets us focus remediation's effort on what's unique: token resolution, React-specific transforms, and design system drift detection. The tradeoff is two additional dependencies, but both are lightweight and purpose-built.
