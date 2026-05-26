# Guidebook / Notifications overlap fix

This patch restores the behavior where the Guidebook launcher does not interfere while the notification dropdown is open.

## Changed file

- `client/src/components/GuidebookPopup.css`

## Why this works

`NotificationBell` in `client/src/App.js` already adds this class to `<body>` whenever notifications are open:

```css
body.cw-notifications-open
```

The bug happened because the fixed Guidebook launcher was still visible/clickable above the notifications area. This patch uses the existing body state and hides Guidebook launchers only while notifications are open.

It is not a z-index fight. It disables the interfering Guidebook launcher state while the notification inbox is active.

## Apply

From project root:

```powershell
Expand-Archive -Force ".\guidebook_notification_interference_fix.zip" "."
```

Then restart React if needed:

```powershell
cd .\client
npm start
```

Hard refresh the browser after applying.
