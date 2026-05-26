# Rule: Component Anatomy

## Priority: HIGH — Follow Consistently

Every component must follow this structure for consistency, maintainability, and design system alignment.

---

## File Structure Template

```tsx
/**
 * ComponentName
 * Brief description of purpose and usage context.
 * 
 * @example
 * <ComponentName prop="value" />
 */

"use client" // Only if client-side interactivity needed

import { ... } from "react"
import { ... } from "@/components/ui/..."  // shadcn/ui first
import { ... } from "@/lib/..."            // utilities
import { ... } from "@/types/..."          // types

// ─── Types ───────────────────────────────────────────────
interface ComponentNameProps {
  /** Description of prop */
  propName: string
  /** Optional prop with default */
  variant?: "default" | "primary" | "danger"
  /** Standard React children */
  children?: React.ReactNode
  className?: string
}

// ─── Sub-components (if needed) ──────────────────────────
function ComponentNameSkeleton() {
  return <Skeleton className="h-24 w-full rounded-xl" />
}

function ComponentNameEmpty() {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-white/40">
      <Icon className="h-8 w-8" />
      <p className="text-sm">No items found</p>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────
export function ComponentName({
  propName,
  variant = "default",
  children,
  className,
}: ComponentNameProps) {
  // 1. Hooks (always at top)
  const [state, setState] = useState(...)
  
  // 2. Derived values
  const computed = useMemo(() => ..., [deps])
  
  // 3. Handlers
  function handleAction() { ... }
  
  // 4. Early returns (loading, error, empty)
  if (isLoading) return <ComponentNameSkeleton />
  if (error) return <ErrorState error={error} onRetry={refetch} />
  if (!data?.length) return <ComponentNameEmpty />
  
  // 5. Render
  return (
    <div className={cn("bg-white/5 border border-white/10 rounded-xl", className)}>
      {children}
    </div>
  )
}

export default ComponentName
```

## Naming Conventions

| Item | Convention | Example |
|------|-----------|---------|
| Component | PascalCase | `UserTable` |
| Props interface | `{Name}Props` | `UserTableProps` |
| Hooks | `use{Name}` | `useUserTable` |
| Handlers | `handle{Action}` | `handleDelete` |
| Boolean props | `is/has/can/should` | `isLoading`, `hasError` |
| Files | kebab-case | `user-table.tsx` |

## Composition Rules

1. **Single Responsibility** — one component does one thing well
2. **shadcn/ui First** — extend primitives, don't reinvent (Button, Card, Badge, Table, Dialog, etc.)
3. **cn() for className merging** — always use `cn(baseClasses, className)` to allow external overrides
4. **No magic numbers** — use Tailwind spacing scale, not arbitrary pixel values
5. **Prop forwarding** — spread `...rest` onto root element for HTML attribute support

## State Machines (Loading / Error / Empty / Data)

Every data component MUST implement all four states:

```tsx
// Pattern for any async data component
if (isLoading) return <Skeleton />
if (isError)   return <ErrorState error={error} onRetry={refetch} />
if (!data)     return <EmptyState />
return         <DataView data={data} />
```

## Do / Don't Summary

| ✅ Do | ❌ Don't |
|------|---------|
| Use TypeScript interfaces for all props | Use `any` type |
| Export named + default | Export only default |
| Add JSDoc on every component | Leave undocumented |
| Handle loading/error/empty | Only handle happy path |
| Use `cn()` for class merging | Hardcode all classes |
| Place `"use client"` only when needed | Add it by default |