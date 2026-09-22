# Remediation

A CLI tool that scans React source code and detects design system inconsistencies, offering suggestions and automated fixes.

## Language

**Remediation**:
The CLI tool itself. Scans React source code for design system violations.
_Avoid_: react-doctor, design-system-linter

**Rule**:
A check that detects a specific category of inconsistency in the codebase (e.g., hardcoded colors, missing tokens).
_Avoid_: lint, check, detector

**Codemod**:
An automated code modification that fixes a violation detected by a rule.
_Avoid_: transform, patch, fixer

**Token**:
A named design primitive (color, spacing, typography, radius, shadow) defined in the design system.
_Avoid_: style, value, constant

**Design System**:
The set of tokens, components, and conventions that a project is expected to follow.
_Avoid_: UI library, theme

**Primitive**:
A generated React component (`Box`, `Text`) whose visual props are typed to token
names, making off-system values (e.g. `padding="17px"`) a TypeScript error.
_Avoid_: base component, building block, atom

**Compiler**:
The `primitives` command step that turns detected tokens into the constrained
Primitive API — the mechanism that makes drifting UI hard to write, not just hard
to miss.
_Avoid_: generator, codegen, scaffold

**Component**:
A generated React component in the `components` output (e.g. `Button`, `Card`)
whose style-slot props are typed to token names, compiled from a detected real
component rather than styled from scratch. Reuses the Primitive layer's types
and resolver. Component-agnostic: no catalog — every detected component is
re-emitted as itself.
_Avoid_: widget, module

**User**:
A front-end developer running remediation on their React project.
_Avoid_: consumer, client

**Dead Component**:
A React component that is never imported or used anywhere in the codebase.
_Avoid_: unused component, orphan component

**Duplicate Component**:
Two or more components that share the same code structure and props.
_Avoid_: similar component, overlapping component
