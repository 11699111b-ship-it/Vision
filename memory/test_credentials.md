# Test Credentials

## App: Superhero HQ
- **Type**: Pure frontend app, no authentication required
- **No user accounts** — localStorage only
- **Hero Name**: Anurag (Boss Anurag)
- **localStorage key**: `superhero_hq_v2`
- **Welcome flag key**: `hq_entered` (set to '1' after clicking ENTER HQ)

## Testing Notes
- Clear localStorage (`localStorage.clear()`) to reset to Welcome Screen state
- App starts at Welcome Screen only on first visit (or after clearing localStorage)
- After clicking ENTER HQ, the app remembers and skips welcome screen on refresh

## No Backend Credentials Needed
This is a pure frontend application with no backend, database, or authentication.
