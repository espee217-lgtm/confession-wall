export const GUIDEBOOK_VERSION = "1.0.0";

const img = (file, alt) => ({
  src: `/guidebook/desktop/${file}`,
  alt,
});

export const GUIDEBOOK_SECTIONS = [
  {
    id: "start",
    label: "Start",
    eyebrow: "Begin here",
    title: "Welcome to Confession Wall",
    summary:
      "A forest-themed anonymous wall where people can confess, react, comment, save posts, earn Seeds, join events, and support each other without showing their real identity.",
    images: [
      img("home_overview.webp", "Desktop home overview with the Confession Wall forest, realms, weekly event card, and side confession boards."),
    ],
    points: [
      "Use the top realm paths to explore Trending, Grove, Budding, and Scorched.",
      "Search helps you find confessions by words, moods, and themes.",
      "Guests can browse the wall and preview the Shop. Login is needed to post, comment, save, equip, or buy.",
    ],
  },
  {
    id: "confess",
    label: "Confess",
    eyebrow: "Plant a secret",
    title: "Post an anonymous confession",
    summary:
      "Tap Confess when something is heavy on your heart. Write your confession, choose a mood, add optional extras, then bloom it onto the wall.",
    images: [
      img("Confession2.webp", "Desktop Confess button from the navigation area."),
      img("Confession1.webp", "Desktop scene Confess entry point on the home forest."),
      img("Confession3.webp", "Plant a confession popup with mood chips, content warning, card theme, image upload, poll, and bloom button."),
    ],
    points: [
      "Mood chips help people understand the feeling behind your post.",
      "Images, polls, content warnings, and card themes are optional.",
      "Use content warnings for sensitive topics so readers can choose carefully.",
    ],
  },
  {
    id: "react",
    label: "Realms",
    eyebrow: "Water, burn, grow",
    title: "Reactions decide where posts live",
    summary:
      "Water means support. Burn means disagreement, intensity, or a darker reaction. Each post moves between realms based on the balance of Water and Fire.",
    images: [
      img("Reactions_ui.webp", "Water and Burn reaction UI with the flourishing status bar."),
      img("Groove_desktop.webp", "Grove page showing posts with more Water than Fire."),
      img("budding_desktop.webp", "Budding page showing new or balanced posts."),
      img("scorched_desktop.webp", "Scorched page showing posts with more Fire than Water."),
      img("comfortcards.webp", "Comfort cards and golden side notes around a confession."),
    ],
    points: [
      "Water > Fire sends a confession toward Grove.",
      "Water = Fire keeps it in Budding, including brand-new 0 = 0 posts.",
      "Fire > Water sends it into Scorched.",
      "Comfort Cards are quick support notes like “I hear you” or “You are not alone.”",
    ],
  },
  {
    id: "echoes",
    label: "Echoes",
    eyebrow: "Talk back gently",
    title: "Comment, reply, save, and stay updated",
    summary:
      "Open a confession to leave an Echo Root. Click an existing comment to reply under it. Save posts as Pressed Leaves and check notifications from the bell.",
    images: [
      img("makingcomment.webp", "Comment input and Echo Roots under a confession."),
      img("replyingacomment.webp", "Reply view opened from an existing comment."),
      img("Pressed_leaves_profile.webp", "View Pressed Leaves button from the profile area."),
      img("notification_button.webp", "Notification bell and notification inbox preview."),
    ],
    points: [
      "Comments are called Echo Roots because they grow under a confession.",
      "Click a comment to open its reply view and echo back directly.",
      "Pressed Leaves bookmark posts you want to revisit later.",
      "The notification bell shows updates from activity, reports, rewards, and replies.",
    ],
  },
  {
    id: "seeds",
    label: "Seeds & Shop",
    eyebrow: "Earn and unlock",
    title: "Seeds power cosmetics and profile style",
    summary:
      "Seeds are the site currency. Earn them through activity and quests, or buy packs later if you want faster cosmetic unlocks.",
    images: [
      img("shop_button_With_Seed_counter.webp", "Shop button and Seed counter in the top navbar."),
      img("shop_desktop.webp", "Shop page with featured cosmetic drops, frames, badges, titles, and post themes."),
      img("buy_seeds_desktop.webp", "Buy Seeds page with paid Seed packs and regional pricing."),
      img("daily_quest_desktop.webp", "Daily Quest panel with streak and Seed rewards."),
    ],
    points: [
      "The Shop button opens cosmetic previews and Seed purchases.",
      "The Seed counter shows your current balance.",
      "Spend Seeds on profile frames, badges, display titles, post themes, and effects.",
      "Daily Quests are the free way to earn Seeds without paying real money.",
    ],
  },
  {
    id: "events",
    label: "Events & Safety",
    eyebrow: "Community systems",
    title: "Weekly events, reports, and safer walls",
    summary:
      "Events give the wall a game-like rhythm. Reports help the community stay safer without turning Confession Wall into therapy or formal counseling.",
    images: [
      img("event_button.webp", "Weekly Forest Event card on the home page."),
      img("EventPage.webp", "Weekly Forest Event page with cycle rules, leaderboard, and rewards."),
      img("report.webp", "Report button on a post or comment."),
    ],
    points: [
      "Open the Weekly Forest Event card to see the current cycle, leaderboard, and rewards.",
      "Some events reward the most watered or most burned posts during the event window.",
      "Use Report when a post or comment breaks the rules.",
      "Confession Wall is for anonymous venting and community support, not a replacement for professional help.",
    ],
  },
];
