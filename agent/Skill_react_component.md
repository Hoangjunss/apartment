# Skill: React Component Generation

## Purpose
Generate production-ready React components for the Dashboard Design System. Covers UI primitives (stateless), feature components (with data), and layout shells.

---

## Component Categories

### UI Primitive
Stateless, presentational. Takes props, renders UI.
```tsx
// Pattern
export function Badge({ variant, children }: BadgeProps) {
  const styles = {
    success: "bg-[#10b981]/10 text-[#10b981] border-[#10b981]/20",
    warning: "bg-[#f59e0b]/10 text-[#f59e0b] border-[#f59e0b]/20",
    danger:  "bg-[#ef4444]/10 text-[#ef4444] border-[#ef4444]/20",
    default: "bg-white/5 text-white/70 border-white/10",
  }
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-md border text-xs font-medium", styles[variant])}>
      {children}
    </span>
  )
}
```

### Feature Component
Owns data fetching via React Query + interactivity.
```tsx
"use client"
// Pattern
export function UserList() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["users"],
    queryFn: fetchUsers,
  })

  if (isLoading) return <UserListSkeleton />
  if (error)     return <ErrorState error={error} onRetry={refetch} />
  if (!data?.length) return <EmptyState message="No users found" />

  return <DataTable columns={userColumns} data={data} />
}
```

### Layout Shell
Defines page structure, accepts children for content slots.
```tsx
// Pattern
export function DashboardShell({ children, header, actions }: DashboardShellProps) {
  return (
    <div className="space-y-6">
      <PageHeader>{header}{actions}</PageHeader>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {children}
      </div>
    </div>
  )
}
```

---

## Skeleton Generation Rules

Skeletons must **mirror the real component's layout**:
```tsx
function UserCardSkeleton() {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-3">
      <Skeleton className="h-4 w-32 rounded" />       {/* Name */}
      <Skeleton className="h-3 w-48 rounded" />       {/* Email */}
      <div className="flex gap-2 mt-4">
        <Skeleton className="h-6 w-16 rounded-full" /> {/* Badge */}
        <Skeleton className="h-6 w-20 rounded-full" /> {/* Badge */}
      </div>
    </div>
  )
}
```

## Error State Pattern

```tsx
function ErrorState({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 py-12 text-center">
      <div className="rounded-full bg-[#ef4444]/10 p-3">
        <AlertCircleIcon className="h-6 w-6 text-[#ef4444]" />
      </div>
      <div>
        <p className="text-sm font-medium text-[#fafafa]">Something went wrong</p>
        <p className="text-xs text-white/50 mt-1">{error.message}</p>
      </div>
      <button
        onClick={onRetry}
        className="text-xs text-[#0C5CAB] hover:text-[#0a4a8a] underline underline-offset-2"
      >
        Try again
      </button>
    </div>
  )
}
```

## Empty State Pattern

```tsx
function EmptyState({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <InboxIcon className="h-10 w-10 text-white/20" />
      <p className="text-sm text-white/50">{message}</p>
      {action}
    </div>
  )
}
```

---

## Checklist Before Completing
- [ ] TypeScript interface for all props
- [ ] JSDoc comment on component
- [ ] Loading / Error / Empty states handled
- [ ] All interactive elements accessible (keyboard, aria)
- [ ] `className` prop accepted and merged with `cn()`
- [ ] Named export + default export