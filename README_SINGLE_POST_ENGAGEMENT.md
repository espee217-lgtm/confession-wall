# Single Post Engagement Patch

This patch adds one script:

```txt
server/scripts/tuneSinglePostEngagement.js
```

It updates one already-inserted confession by ID.

For the target post, it adds:

- around 20-24 total comfort-card reacts
- every comment gets around 10 likes (`wateredBy`: 8-12)
- every comment gets 3-7 dislikes (`burnedBy`: 3-7)
- no same user is placed in both like and dislike arrays for the same comment
- uses your existing MongoDB users

## Use

From project root:

```powershell
Expand-Archive -Force ".\single_post_engagement_patch.zip" "."
```

Then:

```powershell
cd .\server
node .\scripts\tuneSinglePostEngagement.js --id=6a15845bdc7590568f967d81 --dry-run
node .\scripts\tuneSinglePostEngagement.js --id=6a15845bdc7590568f967d81
```

Refresh this page after running:

```txt
http://localhost:3000/confession/6a15845bdc7590568f967d81
```
