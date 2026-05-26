---
name: gen-component
description: Generate a new React component following the Dashboard Design System. Scaffolds the full file with TypeScript types, accessibility, loading/error/empty states, and design tokens applied.
---

# Command: gen-component

## Usage
```
/gen-component <ComponentName> [--type=ui|feature|layout] [--shadcn=<base>]
```

## Examples
```
/gen-component StatCard --type=ui
/gen-component UserTable --type=feature --shadcn=table
/gen-component DashboardShell --type=layout
```

## What AI Will Do
1. **Determine component type**
   - `ui` → pure presentational, no data fetching
   - `feature` → includes React Query hook, Zustand slice if needed
   - `layout` → page shell with sidebar/topbar slots

2. **Scaffold the file** at `components/<type>/<ComponentName>.tsx`:
   ```
   - JSDoc comment (purpose, props summary)
   - TypeScript interface for props
   - Component implementation
   - Named + default export
   ```

3. **Apply design tokens**
   - Surface, text, border, shadow from `rules/color-tokens.md`
   - Typography scale from `rules/typography.md`
   - 8pt spacing from `rules/responsive-grid.md`

4. **Add all states**
   - Loading: skeleton using `shadcn/ui Skeleton`
   - Error: inline error with retry CTA
   - Empty: illustrated empty state with action prompt

5. **Accessibility pass** (inline)
   - Correct semantic HTML
   - ARIA attributes
   - Focus states
   - 44px touch targets

## Output
- Single `.tsx` file, complete and ready to use
- No placeholder comments like `// TODO` or `// implement`
- Storybook story file if `--stories` flag passed

## Constraints
- MUST use shadcn/ui primitives as base (Button, Card, Badge, etc.)
- MUST NOT use inline styles
- MUST NOT use arbitrary Tailwind values that bypass the design system