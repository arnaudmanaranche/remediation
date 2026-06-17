# Remediation

A CLI tool that scans React source code and detects design system inconsistencies, offering suggestions and automated fixes.

## Language

**Remediation**:
The CLI tool itself. Scans React source code for design system violations.
_Avoid_: react-doctor, design-system-linter

**Rule**:
A check that detects a specific category of inconsistency in the codebase (e.g., hardcoded colors, missing tokens).
_Avoid_: lint, check, detector

**Transform**:
An automated code modification that fixes a violation detected by a rule.
_Avoid_: codemod, patch, fixer

**Token**:
A named design primitive (color, spacing, typography, radius, shadow) defined in the design system.
_Aavoid_: style, value, constant

**Design System**:
The set of tokens, components, and conventions that a project is expected to follow.
_Avoid_: UI library, theme

**User**:
A front-end developer running remediation on their React project.
_Aavoid_: consumer, client

**Dead Component**:
A React component that is never imported or used anywhere in the codebase.
_Avoid_: unused component, orphan component

**Duplicate Component**:
Two or more components that share the same code structure and props.
_Avoid_: similar component, overlapping component
