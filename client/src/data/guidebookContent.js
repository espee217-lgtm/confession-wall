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
    title: "Planting a confession",
    summary:
      "A confession is your anonymous post on the wall. Use it to vent, confess, ask, joke, or say what you cannot say elsewhere.",
    steps: [
      {
        badge: "Step 1",
        title: "Find the Confess button",
        text:
          "Open the confession form from the top Confess button or from the flower-hand entry point on the Home scene.",
        images: [
          img("Confession2.webp", "Desktop Confess button from the navigation area."),
          img("Confession1.webp", "Flower-hand Confess entry point on the Home scene."),
        ],
      },
      {
        badge: "Step 2",
        title: "Write what you need to say",
        text:
          "The large box is where your confession goes. Keep it simple, make it detailed, or let it be messy and honest.",
        images: [
          img("Confession3.webp", "Plant a confession popup with the main writing box and posting controls."),
        ],
      },
      {
        badge: "Step 3",
        title: "Shape the post before it blooms",
        text:
          "Mood, image, content warning, card theme, and anonymous poll are optional tools. Use only what helps the confession make sense.",
        notes: [
          "Mood shows the feeling behind the confession.",
          "Content warnings help sensitive readers choose carefully.",
          "Card themes change the visual style of your confession.",
          "Polls let people answer anonymously.",
        ],
      },
      {
        badge: "Step 4",
        title: "Bloom it onto the wall",
        text:
          "Press Bloom to post anonymously. Other users can water it, burn it, comfort it, comment, report it, or save it as a Pressed Leaf.",
      },
    ],
  },
  {
    id: "react",
    label: "Realms",
    eyebrow: "Water the plant, burn the roots",
    title: "How realms work",
    summary:
      "Every confession has a place on the wall. Watering the plant means support and growth. Fire means burn, intensity, or disagreement. The balance between both decides where the post lives.",
    points: [
      "🌱 Water > Fire → Grove: supported posts grow into the Thriving Grove.",
      "🌱 Water = Fire → Budding: new or balanced posts wait in Budding, including 0 = 0.",
      "🔥 Fire > Water → Scorched: posts with more Fire fall into the Scorched Lands.",
      "Comfort Cards are support notes, not realm votes. They help people feel heard without changing the Water/Fire balance directly.",
    ],
    steps: [
      {
        badge: "Step 1",
        title: "Use Water and Fire",
        text:
          "The plant icon is Water. On Confession Wall, watering a post means you are helping it grow. Fire is the darker reaction for burn, intensity, or disagreement.",
        images: [
          img("Reactions_ui.webp", "Water and Fire reaction UI with the flourishing status bar."),
        ],
      },
      {
        badge: "Grove",
        title: "More Water sends it upward",
        text:
          "When a confession has more Water than Fire, it moves toward Grove. Grove is where supported, nourished, or positively received posts live.",
        images: [
          img("Groove_desktop.webp", "Grove page showing posts with more Water than Fire."),
        ],
      },
      {
        badge: "Budding",
        title: "Balanced posts wait in Budding",
        text:
          "Budding is for new or equal posts. If Water and Fire are tied, even 0 Water and 0 Fire, the confession stays here while its fate is still open.",
        images: [
          img("budding_desktop.webp", "Budding page showing new or balanced posts."),
        ],
      },
      {
        badge: "Scorched",
        title: "More Fire sends it downward",
        text:
          "If a confession receives more Fire than Water, it falls into Scorched. This realm holds posts that were burned more than watered.",
        images: [
          img("scorched_desktop.webp", "Scorched page showing posts with more Fire than Water."),
        ],
      },
      {
        badge: "Support",
        title: "Comfort Cards are separate support notes",
        text:
          "Comfort Cards are quick messages like “I hear you” or “You are not alone.” They appear as golden side notes around a confession so people can support without writing a full comment.",
        images: [
          img("comfortcards.webp", "Comfort cards and golden side notes around a confession."),
        ],
      },
    ],
  },
  {
    id: "echoes",
    label: "Echoes",
    eyebrow: "Talk back gently",
    title: "Echo Roots, replies, saves, and alerts",
    summary:
      "After a confession is planted, people can answer gently, reply under comments, save posts for later, and follow updates from the bell.",
    points: [
      "Echo Roots are comments under a confession.",
      "Replies grow under a specific Echo Root, not the whole post.",
      "Pressed Leaves are bookmarks for posts you want to revisit.",
      "The bell keeps activity, replies, rewards, reports, and updates in one place.",
    ],
    steps: [
      {
        badge: "Echo Root",
        title: "Leave a comment under a confession",
        text:
          "Open a confession and write in the comment bar. Press Bloom to leave an Echo Root under that post.",
        images: [
          img("makingcomment.webp", "Comment input and Echo Roots under a confession."),
        ],
      },
      {
        badge: "Reply",
        title: "Click a comment to reply directly",
        text:
          "When you click an existing comment, its own reply view opens. Your reply stays under that comment as a smaller echo thread.",
        images: [
          img("replyingacomment.webp", "Reply view opened from an existing comment."),
        ],
      },
      {
        badge: "Pressed Leaves",
        title: "Save posts you want to revisit",
        text:
          "Pressed Leaves are bookmarks. Use them on posts you care about, then open your profile and choose View Pressed Leaves to find them again.",
        images: [
          img("Pressed_leaves_profile.webp", "View Pressed Leaves button from the profile area."),
        ],
      },
      {
        badge: "Bell",
        title: "Stay updated from notifications",
        text:
          "The notification bell shows updates from activity, replies, rewards, report outcomes, and other important wall events.",
        images: [
          img("notification_button.webp", "Notification bell and notification inbox preview."),
        ],
      },
    ],
  },
  {
    id: "seeds",
    label: "Seeds & Shop",
    eyebrow: "Earn, spend, and unlock",
    title: "How Seeds and the Shop work",
    summary:
      "Seeds are the wall currency. Earn them through activity and quests, spend them on cosmetics, or buy Seed packs when you want faster unlocks.",
    points: [
      "The Seed counter shows your current balance.",
      "Daily Quests are the free way to earn Seeds without paying real money.",
      "The Shop uses Seeds for profile frames, badges, display titles, post themes, and effects.",
      "Guests can preview the Shop, but login is required to buy, equip, or purchase Seeds.",
    ],
    steps: [
      {
        badge: "Balance",
        title: "Find your Shop button and Seed counter",
        text:
          "The shop bag opens the cosmetic store. The plant counter beside it shows how many Seeds you currently have available to spend.",
        images: [
          img("shop_button_With_Seed_counter.webp", "Shop button and Seed counter in the top navbar."),
        ],
      },
      {
        badge: "Shop",
        title: "Spend Seeds on cosmetics",
        text:
          "Open the Shop to preview and unlock cosmetic drops. Frames, badges, titles, post themes, and visual effects are bought with Seeds, then equipped to style your profile and posts.",
        images: [
          img("shop_desktop.webp", "Shop page with featured cosmetic drops, profile frames, badges, titles, and post themes."),
        ],
        notes: [
          "Profile Frames decorate your avatar.",
          "Badges and titles show near your name.",
          "Post themes change how your confessions appear.",
        ],
      },
      {
        badge: "Free Seeds",
        title: "Earn Seeds from Daily Quests",
        text:
          "Daily Quests reward normal activity like visiting, posting, and commenting. This is the free path for building your Seed balance over time.",
        images: [
          img("daily_quest_desktop.webp", "Daily Quest panel with current streak, best streak, task progress, and Seed rewards."),
        ],
      },
      {
        badge: "Top-up",
        title: "Buy Seeds only when you want faster unlocks",
        text:
          "The Buy Seeds page is for paid Seed packs. Prices can be shown by region, and packs help unlock cosmetics faster. Purchases require login and payment confirmation.",
        images: [
          img("buy_seeds_desktop.webp", "Buy Seeds page with regional pricing and paid Seed packs."),
        ],
      },
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
