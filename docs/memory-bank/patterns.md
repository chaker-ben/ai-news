# Patterns

> Patterns validés pour ce projet. Les utiliser avant d'en inventer de nouveaux.

## Feature Folder
```
src/features/{feature}/
├── components/
├── hooks/
├── api/
├── types/
├── __tests__/
└── index.ts
```

## API Route (Next.js App Router + Zod)
```typescript
import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'

const schema = z.object({ /* ... */ })

export async function POST(request: NextRequest) {
  try {
    const body = schema.parse(await request.json())
    return NextResponse.json({ data: result }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 })
    console.error('[API]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

## Safe Async
```typescript
type Result<T> = { data: T; error: null } | { data: null; error: Error }
async function safeAsync<T>(fn: () => Promise<T>): Promise<Result<T>> {
  try { return { data: await fn(), error: null } }
  catch (error) { return { data: null, error: error as Error } }
}
```

---
*Ajouter les nouveaux patterns ci-dessous.*
