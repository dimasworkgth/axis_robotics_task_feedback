# AXIS Task Feedback Board V8

Netlify-native public feedback board for AXIS tasks. It can be tested in GitHub Codespaces and deployed to Netlify without a VPS.

## What changed in V8

- Uses the correct horizontal AXIS Robotics logo supplied by the user.
- Public UI is separated from admin. The public site has no admin button.
- Tasks are split into two sections:
  - **Today Tasks**: live AXIS tasks collected within the current 24-hour window.
  - **7D Tasks**: saved tasks after 24 hours or after the task disappears from the live AXIS API.
- Feedback form and feedback preview remain separated.
- Footer credit: Built by NPCCRYPTO, linked to Telegram DM.
- Refined 2026-style dark UI with calmer contrast, better spacing, and stronger visual hierarchy.

## How task collection works

1. Click **Sync New Tasks**.
2. The function reads live tasks from the AXIS API.
3. Every task identity is saved into a local/Netlify catalog.
4. If a task later disappears from the AXIS API, it stays in the board as a saved task.
5. Today Tasks move to 7D Tasks after 24 hours.

AXIS usually publishes tasks around 7 PM WIB. If a task appears early/randomly, the board still collects it and keeps it in Today Tasks for 24 hours before moving it to 7D Tasks.

## Test in Codespaces

```bash
cp .env.example .env
npm run dev
```

Open port `8888` from the Codespaces **PORTS** tab.

## Real AXIS API mode

Edit `.env`:

```env
USE_LOCAL_STORAGE=1
USE_MOCK_AXIS=0
AXIS_API_URL=https://hub.axisrobotics.ai/api/tasks
AXIS_COOKIE=
MAX_AXIS_PAGES=6
ADMIN_KEY=change-this-admin-key
BLOCK_DUPLICATE_BY_IP=0
```

Restart:

```bash
CTRL + C
npm run dev
```

Then click **Sync New Tasks**.

## Demo mode

If you want dummy data only:

```env
USE_MOCK_AXIS=0
```

or open:

```txt
/?demo=1
```

## Reset Codespaces test data

```bash
rm -rf .local-feedback
```

Also clear browser localStorage if the browser still remembers that you already submitted feedback.

## Deploy to Netlify

Build settings:

```txt
Build command: npm run build
Publish directory: public
Functions directory: netlify/functions
```

Environment variables:

```env
USE_LOCAL_STORAGE=0
USE_MOCK_AXIS=0
AXIS_API_URL=https://hub.axisrobotics.ai/api/tasks
AXIS_COOKIE=
MAX_AXIS_PAGES=6
ADMIN_KEY=change-this-admin-key
BLOCK_DUPLICATE_BY_IP=0
```

## Public pages

```txt
/                 Task board
/task.html?id=... Task room and submit feedback
/feedback.html?id=... Full feedback list for one task
```

## Admin pair

Admin is intentionally not part of the public web. See `admin-pair-seed/README.md` for the next project plan.


## V9 demo purge

V9 defaults to the real AXIS API mode (`USE_MOCK_AXIS=0`). Demo data only appears when you open `/?demo=1` or manually set `USE_MOCK_AXIS=1`. When the real API sync runs, old demo tasks with IDs like `axis-demo-*` are automatically removed from the saved catalog.
