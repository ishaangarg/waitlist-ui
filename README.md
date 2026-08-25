# @ishaangarg94/waitlist-ui

Phone-number waitlist form. Unstyled, zero dependencies, one fetch.

```bash
npm i @ishaangarg94/waitlist-ui
```

```tsx
import { Waitlist } from '@ishaangarg94/waitlist-ui';

<Waitlist
  project="delivery-assistant"
  classNames={{ input: 'rounded-full border px-4 py-3', button: 'btn-primary' }}
/>
```

## Endpoint resolution

1. the `endpoint` prop
2. `NEXT_PUBLIC_WAITLIST_ENDPOINT`
3. `/api/signup` on the same origin

A site that hosts the collector itself needs none of them. A site posting to
someone else's collector sets the env var, and that collector must list the
site's origin in its `ALLOWED_ORIGINS`.

## Styling

No CSS ships with this package. Style via `classNames`
(`root · form · field · input · button · message · success`) or the
`data-waitlist="…"` attributes on the same elements.

## Props

| prop | default | |
| --- | --- | --- |
| `project` | — | required; which waitlist the signup belongs to |
| `endpoint` | see above | collector URL |
| `country` | `IN` | fallback region for numbers typed without `+` |
| `metadata` | `{}` | merged with auto-collected UTM params, path, referrer |
| `onSuccess` / `onError` | — | callbacks |

## Server

The collector lives in the site that hosts `/api/signup`. It validates to E.164,
rate-limits by hashed IP, and dedupes on a deterministic Firestore document ID.
