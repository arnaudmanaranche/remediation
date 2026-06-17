# Component drift detection

We detect components that should be merged by analyzing file names and code structure.

Drift is the real UI debt: `ButtonPrimary`, `ButtonCTA`, `PrimaryButton` all solving the same problem. The rule groups components by base name (stripping common suffixes like Button, Card, Modal) and by JSX structure similarity.

This catches the pattern where devs create new components instead of extending existing ones. The output shows merge candidates with file paths and suggestions.
