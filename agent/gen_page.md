---
name: gen-page
description: Generate a full Next.js App Router page (admin or user-facing) with layout, data fetching, SEO metadata, loading.tsx, error.tsx, and all design system tokens applied.
---

# Command: gen-page

## Usage
```
/gen-page <route-path> [--role=admin|user] [--data=<entity>]
```

## Examples
```
/gen-page dashboard/users --role=admin --data=users
/gen-page profile --role=user
/gen-page dashboard/analytics --role=admin --data=metrics
```

## What AI Will Do

### File Structure Generated
```
app/
└── (dashboard)/
    └── <route-path>/
        ├── page.tsx          ← Server Component, data fetch, metadata
        ├── loading.tsx       ← Skeleton layout matching page structure  
        ├── error.tsx         ← Error UI with retry + back navigation
        └── _components/      ← Page-scoped components
            └── *.tsx
```

### Page Anatomy (Admin)
```
<DashboardShell>
  <PageHeader title breadcrumb actions />
  <StatsRow />          ← KPI cards if --data provided
  <ContentArea>
    <MainPanel />       ← Primary content (table, form, chart)
    <SidePanel />       ← Optional: filters, activity feed
  </ContentArea>
</DashboardShell>
```

### Page Anatomy (User)
```
<UserLayout>
  <PageHeader title />
  <ContentCard>
    {/* Page-specific content */}
  </ContentCard>
</UserLayout>
```

### Data Fetching Pattern
```tsx
// Server Component — fetch on server
const data = await fetchEntity(params)

// Pass to Client Component for interactivity
<EntityTable initialData={data} />
```

### Required Files
- `page.tsx`: `export const metadata`, async Server Component
- `loading.tsx`: mirrors page skeleton (same grid, shimmer)
- `error.tsx`: `"use client"`, `useEffect` to log error, retry button

## Constraints
- MUST export `metadata` from `page.tsx`
- MUST have `loading.tsx` — never ship a page without it
- MUST have `error.tsx` with a `reset()` call
- Role `admin` gets sidebar layout; role `user` gets centered card layout