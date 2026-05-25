/*
  Confession Wall starter content v3
  ------------------------------------------------------------
  Wipes/reseeds confession content while keeping user accounts and avatar assets.

  Main commands from server folder:
    node scripts/seedStarterContent.js --dry-run
    node scripts/seedStarterContent.js --wipe-content --seed

  Safe notes:
  - --wipe-content deletes confessions/posts and optional post-linked reports/notifications.
  - It does NOT delete users, seed avatars, admins, cosmetics, or accounts.
  - Seed users are fictional anonymous characters marked isSeedUser=true.
  - All starter posts/comments are original fictional content, validated for exact uniqueness.
*/

const path = require("path");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const User = require("../models/User");
const Confession = require("../models/Confession");

function tryModel(modelPath) {
  try { return require(modelPath); } catch (_) { return null; }
}
const Report = tryModel("../models/Report");
const Notification = tryModel("../models/Notification");

const args = new Set(process.argv.slice(2));
const DRY_RUN = args.has("--dry-run");
const WIPE_CONTENT = args.has("--wipe-content") || args.has("--reset");
const SHOULD_SEED = args.has("--seed") || args.has("--reset");
const FORCE = args.has("--force");
const REFRESH_AVATARS = args.has("--refresh-avatars");
const RESET_SEED_USERS = args.has("--reset-seed-users");
const SEED_BATCH = "starter-community-v3-unique-content-200";

const MOODS = ["Hopeful", "Heavy", "Angry", "Lonely", "Love", "Regret", "Funny", "Grateful", "Lost", "Healing"];
const POSTS_PER_MOOD = 20;
const TARGET_SEED_USERS = 90;

const SEED_AVATAR_PATHS = Array.from({ length: TARGET_SEED_USERS }, (_, index) =>
  `/assets/seed-avatars/seed_avatar_${String(index + 1).padStart(2, "0")}.webp`
);

function seedAvatarPath(index) {
  return SEED_AVATAR_PATHS[index % SEED_AVATAR_PATHS.length];
}

const COSMETICS = {
  badges: [
    "badge-sprout-soul",
    "badge-moon-whisper",
    "badge-forest-crown",
    "badge-petal-storm",
    "badge-ember-core",
    "badge-lone-raven",
    "badge-redline-rim",
  ],
  frames: [
    "frame-vine-glow",
    "frame-golden-leaf",
    "frame-ember-root",
    "frame-moonveil",
    "frame-thornfire",
    "frame-celestial",
    "frame-grove-butterfly",
    "frame-demon-thorn",
    "frame-lotus-aura",
    "frame-ice-monarch",
    "frame-visor-lift-racer",
    "frame-storm-hoodie",
  ],
  titles: [
    "title-forest-wanderer",
    "title-keeper-of-secrets",
    "title-grove-guardian",
    "title-whisper-grove",
    "title-ashen-voice",
    "title-eternal-bloom",
  ],
  postThemes: [
    "post-theme-moonlit-grove",
    "post-theme-golden-leaves",
    "post-theme-scorched-ember",
    "post-theme-dewdrop-card",
    "post-theme-scorched-parchment",
    "post-theme-starbound-card",
    "post-theme-moonlit-vengeance",
    "post-theme-spinning-apex-wheel",
    "post-theme-cinder-throne",
  ],
};

const SEED_PERSONAS = [
  ["quietfern", "writes softly, notices small things"],
  ["moonlistener", "late-night listener with calm replies"],
  ["softember", "warm, honest, a little wounded"],
  ["oldgrove", "older-soul energy and grounded advice"],
  ["rainwhisper", "gentle and reflective"],
  ["hollowleaf", "dry humor hiding real feelings"],
  ["nightbloom", "opens up when the world is quiet"],
  ["kindash", "kind, blunt, and protective"],
  ["smalllantern", "tries to make the dark less dark"],
  ["rootedheart", "comforting but not fake-positive"],
  ["mossandmoon", "soft-spoken and observant"],
  ["embermoth", "dramatic in a charming way"],
  ["cloudedgrove", "overthinks everything"],
  ["lilacconfessor", "romantic and regretful"],
  ["ashpetal", "scorched but still tender"],
  ["velvetroot", "calm replies and thoughtful pauses"],
  ["lowtideleaf", "quiet sadness, honest words"],
  ["sunafterrain", "hopeful without being cheesy"],
  ["bentbranch", "tired but still trying"],
  ["mistkeeper", "keeps secrets gently"],
  ["greenhush", "minimal words, strong feelings"],
  ["riverafterdark", "late-night confession energy"],
  ["lanternmoss", "soft encouragement"],
  ["bravethistle", "protective, slightly fierce"],
  ["dawnroot", "healing and practical"],
  ["faintfirefly", "tiny hope specialist"],
  ["petalbruise", "gentle pain, poetic tone"],
  ["silentacorn", "awkward but sincere"],
  ["wiltedhalo", "sad jokes and soft honesty"],
  ["meadowghost", "anonymous wanderer"],
  ["foxgloveecho", "sharp, funny, caring"],
  ["cedarquiet", "steady and nonjudgmental"],
  ["bluelotus", "calm spiritual vibe"],
  ["scorchedhoney", "sweet words with bitter edges"],
  ["mendedtwig", "healing, step by step"],
  ["wildclover", "casual and relatable"],
  ["silverbark", "short advice, deep meaning"],
  ["goldenhaze", "warm replies and reassurance"],
  ["thornsigh", "angry but self-aware"],
  ["sleepywillow", "tired, kind, and honest"],
  ["pinetrail", "walks people through feelings"],
  ["softcinder", "comfort after conflict"],
  ["rainmended", "believes people can begin again"],
  ["shyivy", "shy but emotionally direct"],
  ["wildmurmur", "reacts like a real friend"],
  ["moonbark", "gentle sarcasm"],
  ["daisydusk", "lighthearted but sincere"],
  ["rootwhisper", "safe-space energy"],
  ["emberlily", "passionate and dramatic"],
  ["quietcicada", "small observations, big feelings"],
  ["hazelafterglow", "warm, late-evening tone"],
  ["mapleache", "nostalgic and honest"],
  ["stormpetal", "intense but caring"],
  ["littlemycelium", "community-minded and sweet"],
  ["bruisedmint", "funny when sad"],
  ["murmurfern", "listens first"],
  ["candlebark", "soft support"],
  ["orangeshadow", "messy, funny, human"],
  ["greymarigold", "tender but realistic"],
  ["lostjuniper", "confused but trying"],
  ["pebbleprayer", "tiny hope in hard days"],
  ["fernbruise", "quiet pain, clean words"],
  ["softthorn", "gentle boundaries"],
  ["moonseedling", "growth after midnight"],
  ["kindlingroot", "warm words, ember heart"],
  ["lastleaflight", "hope after endings"],
  ["mistybutton", "awkward wholesome energy"],
  ["honeyash", "sweet sadness"],
  ["riverlint", "ordinary-life confessions"],
  ["velvetmoss", "premium forest vibes"],
  ["bananaquiet", "oddly funny but emotionally direct"],
  ["inkstem", "writes like a note folded twice"],
  ["chargerghost", "low battery, high feelings"],
  ["roadsidebloom", "moving forward, even slowly"],
  ["papermoon", "soft, thoughtful, and a little dramatic"],
  ["pixelwillow", "internet-brained but kind"],
  ["yellowmurmur", "sunny jokes over quiet worries"],
  ["bluepenheart", "turns feelings into small paragraphs"],
  ["softengine", "practical comfort with warm edges"],
  ["socketmoth", "charged by tiny moments of hope"],
  ["mangoleaf", "sweet, chaotic, and sincere"],
  ["midnightmarker", "late-night replies and honest thoughts"],
  ["hoodedpetal", "anonymous, gentle, and watchful"],
  ["carradiofog", "nostalgic road-trip confession energy"],
  ["pluggedclover", "tries to reconnect people softly"],
  ["bananabloom", "silly name, surprisingly tender"],
  ["pencilrain", "quiet sketches of difficult feelings"],
  ["dashboarddaisy", "small dashboard lights in dark moods"],
  ["chargingfern", "resting, recovering, trying again"],
  ["animemist", "expressive, dreamy, and anonymous"],
];

const COMFORT_TEXTS = [
  "I hear you.",
  "You are not alone.",
  "This pain matters.",
  "Sending quiet strength.",
  "May tomorrow be softer.",
  "You did not deserve that.",
  "Small steps count.",
  "Your feelings make sense.",
  "Leaving a small lantern here.",
  "Breathe, then try again.",
  "That was brave to say.",
  "Holding space for this.",
];

const TOPICS_BY_MOOD = {
  "Hopeful": [
    [
      "deleted the shortcut to a chat I kept checking",
      "empty space on my home screen",
      "my thumb still went there twice",
      "I think healing sometimes looks like making one tiny trap harder to reach"
    ],
    [
      "walked into sunlight after hiding inside for days",
      "warm dust on the balcony rail",
      "a neighbor's plant leaning over the wall",
      "outside did not fix me, but it did not reject me either"
    ],
    [
      "sent one application even though I felt underqualified",
      "the blue submit button",
      "my hands shaking after it loaded",
      "trying is still evidence that I have not given up"
    ],
    [
      "cleaned the corner beside my bed",
      "three old wrappers and one missing sock",
      "the floor showing again",
      "a small clean place can feel like proof of life"
    ],
    [
      "replied to a message I had avoided",
      "the typing dots arriving slowly",
      "no drama happening after all",
      "not every delay becomes a disaster"
    ],
    [
      "made tea instead of spiraling",
      "steam fogging my glasses",
      "cardamom stuck to the spoon",
      "care counts even when it is clumsy and small"
    ],
    [
      "opened a notebook for the first time in months",
      "one crooked date at the top",
      "a pen that kept skipping",
      "beginning badly is still beginning"
    ],
    [
      "saved a little money this week",
      "coins in a steel bowl",
      "a receipt folded like a secret",
      "tiny safety is still safety"
    ],
    [
      "said no without writing a courtroom defense",
      "one calm sentence",
      "my heartbeat acting offended",
      "boundaries did not make the world collapse"
    ],
    [
      "went to sleep before midnight once",
      "my phone face down",
      "the fan making old-house noises",
      "rest can be a decision instead of an accident"
    ],
    [
      "wore the shirt I was saving for a special day",
      "green fabric in the mirror",
      "no occasion except being alive",
      "I want to stop postponing myself"
    ],
    [
      "ate an actual breakfast",
      "burnt toast edges",
      "a banana with one brown spot",
      "feeding myself felt weirdly emotional"
    ],
    [
      "stopped comparing my timeline for one evening",
      "someone else's announcement post",
      "my own quiet room",
      "their joy does not have to be my punishment"
    ],
    [
      "told a friend I needed time",
      "a message with no extra apology",
      "the silence after sending it",
      "honesty can be kind even when it is awkward"
    ],
    [
      "looked up help without closing the tab immediately",
      "a list of names",
      "one tab left open",
      "even considering help is movement"
    ],
    [
      "made my bed after a rough week",
      "a crooked blanket",
      "one pillow dent",
      "I wanted one place to look cared for"
    ],
    [
      "laughed at something stupid after crying",
      "a terrible meme",
      "my own laugh surprising me",
      "sad days can still have windows in them"
    ],
    [
      "walked past the place that used to hurt",
      "a shutter half open",
      "my steps not slowing down",
      "maybe memory loses weight when you keep living"
    ],
    [
      "planned tomorrow without insulting today",
      "two tasks on a scrap paper",
      "one tiny star beside them",
      "future me deserves a gentle instruction"
    ],
    [
      "drank water before coffee",
      "a steel glass sweating on the table",
      "the smallest responsible choice",
      "I am learning to parent myself without hatred"
    ]
  ],
  "Heavy": [
    [
      "smiled through a call about my future",
      "the question everyone asks",
      "my throat tightening politely",
      "being calm can be expensive"
    ],
    [
      "sat in the bathroom longer than needed",
      "cold tiles under my feet",
      "someone knocking once then leaving",
      "privacy became the only room that did not ask questions"
    ],
    [
      "worked while my chest felt loud",
      "one blinking cursor",
      "a spreadsheet that meant nothing",
      "people see collapse but not the hours before it"
    ],
    [
      "watched plans happen without me",
      "heart reactions in the group chat",
      "my name never appearing",
      "sometimes exclusion is quiet enough to deny"
    ],
    [
      "missed someone who hurt me",
      "an old photo loading too fast",
      "my brain defending them again",
      "grief does not care if they deserve it"
    ],
    [
      "could not explain why I was sad",
      "a half-written note",
      "too many reasons and none",
      "language gave up before I did"
    ],
    [
      "felt invisible in a crowded room",
      "birthday lights on the wall",
      "people laughing near me",
      "loneliness can be loud"
    ],
    [
      "heard a song and folded inside",
      "the second verse",
      "a memory I did not invite",
      "some days the past has good aim"
    ],
    [
      "kept saying I was fine",
      "dry lips from smiling",
      "my automatic voice",
      "fine has become a password"
    ],
    [
      "felt guilty for resting",
      "an afternoon nap",
      "unfinished work watching me",
      "my body asked nicely and I still judged it"
    ],
    [
      "held back tears in public",
      "a shop mirror",
      "one cashier being kind",
      "kindness is dangerous when you are already full"
    ],
    [
      "got bad news and went silent",
      "a plain message",
      "the room changing shape",
      "some words split a day in two"
    ],
    [
      "woke up already exhausted",
      "morning light on the ceiling",
      "the same old fan",
      "starting the day felt like continuing a war"
    ],
    [
      "pretended noise did not bother me",
      "plates clanging in the kitchen",
      "too many voices",
      "my nerves felt skinless"
    ],
    [
      "felt ashamed of needing help",
      "a form left incomplete",
      "my pride doing nothing useful",
      "survival should not be embarrassing"
    ],
    [
      "realized nobody knows the full version",
      "different masks for different rooms",
      "my edited answers",
      "I am tired of being a summary"
    ],
    [
      "scheduled my breakdown for later",
      "public transport",
      "one hand gripping my bag",
      "control was just postponing tears"
    ],
    [
      "kept rereading a harsh message",
      "the same line glowing on my screen",
      "my stomach dropping every time",
      "words can keep happening after they are sent"
    ],
    [
      "went quiet at dinner",
      "rice going cold",
      "everyone talking around me",
      "sometimes disappearing is not dramatic enough for people to notice"
    ],
    [
      "felt tired in a way sleep does not touch",
      "the bus window",
      "my reflection looking older",
      "functioning is not the same as being okay"
    ]
  ],
  "Angry": [
    [
      "watched someone rewrite the story",
      "their innocent tone",
      "my name turned into the problem",
      "calm people can still be lying"
    ],
    [
      "got called sensitive again",
      "that tiny laugh after it",
      "my jaw locking",
      "sensitive is what people say when truth inconveniences them"
    ],
    [
      "realized I was the backup plan",
      "late replies that became sudden invitations",
      "my phone lighting up only when they were bored",
      "I am not an emergency charger for lonely people"
    ],
    [
      "heard an apology with no change",
      "the same soft words",
      "the same hard behavior",
      "sorry is cheap when actions never pay rent"
    ],
    [
      "saw them act kind in public",
      "sweetness for strangers",
      "coldness saved for me",
      "performance kindness makes me furious"
    ],
    [
      "got interrupted until I stopped talking",
      "half a sentence dying",
      "their louder opinion",
      "silence is not agreement"
    ],
    [
      "was expected to forgive on schedule",
      "everyone saying move on",
      "nobody asking what it cost",
      "peace should not mean protecting the person who broke it"
    ],
    [
      "found out they mocked me",
      "a screenshot I wish I had not seen",
      "my own words as their joke",
      "trust can die from secondhand laughter"
    ],
    [
      "did the work and lost the credit",
      "a project file with my edits",
      "their name in the praise",
      "being useful is not the same as being valued"
    ],
    [
      "was told to be mature",
      "my hands shaking",
      "their comfort getting priority",
      "maturity should not be a muzzle"
    ],
    [
      "noticed my boundary annoyed them",
      "a one-word reply",
      "the cold air after",
      "people miss the version of you they could use"
    ],
    [
      "got blamed for reacting",
      "the thing they started",
      "my voice finally rising",
      "the reaction became the crime"
    ],
    [
      "saw favoritism again",
      "same rules with a different face",
      "my stomach dropping",
      "unfairness is exhausting when it smiles"
    ],
    [
      "became everyone's emotional dustbin",
      "their bad moods",
      "my patient replies",
      "I am tired of absorbing what no one else wants to hold"
    ],
    [
      "received a compliment with teeth",
      "a sweet sentence",
      "the sting tucked inside",
      "some kindness is just poison with manners"
    ],
    [
      "waited for them to notice",
      "the obvious hurt",
      "their comfortable blindness",
      "if you cared, I would not need subtitles"
    ],
    [
      "had a secret shared",
      "too many people knowing",
      "my face staying still",
      "betrayal travels faster than shame"
    ],
    [
      "got compared again",
      "their perfect example",
      "my patience thinning",
      "I am a person, not a failed copy"
    ],
    [
      "was told to calm down after being cornered",
      "my back against the conversation",
      "their shocked face",
      "calm is easier when you are not the one bleeding"
    ],
    [
      "stopped explaining finally",
      "their confusion",
      "my silence",
      "not every exit needs a speech"
    ]
  ],
  "Lonely": [
    [
      "missed having a no-reason person",
      "a photo of the sky",
      "nobody to send it to",
      "casual closeness is what I crave"
    ],
    [
      "sat with people and still felt outside",
      "chairs in a circle",
      "inside jokes passing over me",
      "being near is not the same as belonging"
    ],
    [
      "opened three apps and closed them",
      "no new messages",
      "my own reflection in the black screen",
      "silence can feel personal even when it is not"
    ],
    [
      "ate dinner alone again",
      "one plate in the sink",
      "the TV talking too loudly",
      "company is not always about words"
    ],
    [
      "watched friends become busy adults",
      "calendars filling up",
      "promises turning vague",
      "growing up can feel like being left in slow motion"
    ],
    [
      "wanted a hug but did not ask",
      "my hands in my sleeves",
      "the room too normal",
      "needing touch feels embarrassing to admit"
    ],
    [
      "became the listener nobody checks on",
      "long voice notes from others",
      "my own drafts unsent",
      "being safe for people can become lonely"
    ],
    [
      "walked home with music too loud",
      "streetlights repeating",
      "one dog following for a minute",
      "even a stray felt like company"
    ],
    [
      "realized nobody knows my favorite snack",
      "a shop shelf",
      "my hand choosing automatically",
      "small knowledge is intimacy too"
    ],
    [
      "saw couples laughing at a signal",
      "red light on wet road",
      "my umbrella folding badly",
      "I am happy for people and still ache"
    ],
    [
      "kept a joke to myself",
      "the perfect timing",
      "no one around to hear it",
      "humor needs a witness sometimes"
    ],
    [
      "missed my old group chat",
      "dead notifications",
      "old stickers that used to mean something",
      "digital rooms can become abandoned houses"
    ],
    [
      "stayed online for no reason",
      "green dots beside names",
      "none of them for me",
      "availability is not the same as being wanted"
    ],
    [
      "felt replaceable at a party",
      "someone taking my chair",
      "no one noticing",
      "it is silly until it is not"
    ],
    [
      "wanted someone to ask twice",
      "my first 'I'm okay'",
      "the conversation moving on",
      "some people hope to be gently caught"
    ],
    [
      "spent a festival quietly",
      "distant crackers",
      "my room smelling like candle smoke",
      "celebration can make absence louder"
    ],
    [
      "looked at old photos too long",
      "faces closer than now",
      "a version of myself with easier eyes",
      "I miss people and I miss who I was with them"
    ],
    [
      "felt like a side character",
      "everyone's big updates",
      "my ordinary Wednesday",
      "not being chosen has a dull sound"
    ],
    [
      "wanted to call home but did not",
      "the contact name",
      "fear of sounding weak",
      "loneliness and pride make a terrible team"
    ],
    [
      "fell asleep with a video playing",
      "someone talking in the background",
      "the screen dimming slowly",
      "a stranger's voice became the room's heartbeat"
    ]
  ],
  "Love": [
    [
      "kept rereading one kind message",
      "a simple goodnight",
      "my stupid smile in the dark",
      "small tenderness can ruin your whole plan to stay guarded"
    ],
    [
      "noticed I was saving stories for them",
      "a funny shop sign",
      "my first thought being their name",
      "love begins as a habit before you admit it"
    ],
    [
      "missed someone I should be over",
      "their old playlist",
      "one song still too sharp",
      "healing has bad memory sometimes"
    ],
    [
      "wanted to confess but stayed quiet",
      "their typing dots",
      "my courage leaving early",
      "not all feelings arrive with a door"
    ],
    [
      "felt loved by a tiny gesture",
      "tea made the way I like",
      "no announcement around it",
      "being remembered softly is dangerous"
    ],
    [
      "got jealous and hated myself for it",
      "a comment under their photo",
      "my chest acting childish",
      "insecurity can wear love's clothes"
    ],
    [
      "realized I like their ordinary face",
      "bad lighting on a video call",
      "their sleepy laugh",
      "affection is weirdly specific"
    ],
    [
      "missed being someone's first update",
      "a day ending without their message",
      "my phone too quiet",
      "love is also routine and that is why it hurts"
    ],
    [
      "kept a gift wrapper",
      "folded paper in a drawer",
      "a memory that smells like rain",
      "some objects become tiny museums"
    ],
    [
      "wanted them happy even away from me",
      "a photo of them smiling",
      "my ache sitting quietly",
      "love can be generous and selfish in the same minute"
    ],
    [
      "felt calm beside someone",
      "two cups on one table",
      "no need to perform",
      "peace is underrated as romance"
    ],
    [
      "almost said too much",
      "a late call",
      "the silence after their laugh",
      "some truths stand at the edge and wait"
    ],
    [
      "hated how easily they affect me",
      "one delayed reply",
      "my mood rearranging itself",
      "attachment has terrible manners"
    ],
    [
      "fell for someone's kindness",
      "holding a door open",
      "remembering a small detail",
      "my standards are not high, I was just starved"
    ],
    [
      "wanted old love to apologize",
      "a blocked contact",
      "my thumb hovering",
      "closure should not require begging"
    ],
    [
      "felt embarrassed by how much I care",
      "a saved screenshot",
      "my own softness exposed",
      "liking someone makes me feel sixteen and ancient"
    ],
    [
      "chose not to text them",
      "the unsent paragraph",
      "midnight making bad suggestions",
      "self-respect can feel like loneliness at first"
    ],
    [
      "saw them with someone else",
      "a public story",
      "my stomach acting dramatic",
      "moving on is easier in quotes"
    ],
    [
      "missed platonic love",
      "a friend's old nickname",
      "no romance involved",
      "friendship breakups should have more songs"
    ],
    [
      "felt grateful for being loved quietly",
      "a packed lunch",
      "a note with bad handwriting",
      "not all love needs fireworks to be real"
    ]
  ],
  "Regret": [
    [
      "did not reply when someone needed me",
      "their message sitting unread",
      "my excuse feeling smaller now",
      "silence can become a choice you carry"
    ],
    [
      "said something cruel because I was embarrassed",
      "their face changing",
      "my pride talking first",
      "winning a moment can lose a person"
    ],
    [
      "waited too long to apologize",
      "a draft saved for weeks",
      "the moment getting stale",
      "sorry gets heavier with time"
    ],
    [
      "ignored my gut feeling",
      "one uneasy pause",
      "everyone saying it was fine",
      "my body knew before my brain admitted it"
    ],
    [
      "laughed along when I should have defended someone",
      "a joke at their expense",
      "my own fake smile",
      "cowardice can be quiet and still count"
    ],
    [
      "wasted a chance because I feared failing",
      "an application deadline",
      "the calendar moving on",
      "not trying became its own failure"
    ],
    [
      "kept choosing ego over honesty",
      "one cold reply",
      "a conversation closing",
      "being right did not feel warm"
    ],
    [
      "trusted the wrong version of someone",
      "their promises",
      "my need to believe them",
      "hope can make a fool of anyone"
    ],
    [
      "left a friendship on read until it died",
      "old memes between us",
      "no big fight",
      "neglect is a slow goodbye"
    ],
    [
      "pretended I was okay with less",
      "crumbs of attention",
      "my standards shrinking",
      "I taught someone how little they had to give"
    ],
    [
      "made fun of something I secretly loved",
      "other people laughing",
      "my younger self hiding",
      "shame steals hobbies first"
    ],
    [
      "did not ask one more question",
      "a tired voice on the phone",
      "me rushing the call",
      "ordinary goodbyes can become permanent"
    ],
    [
      "spent money to impress people",
      "a bill I regretted",
      "their compliments fading fast",
      "approval is expensive and expires quickly"
    ],
    [
      "stayed somewhere after the respect left",
      "a familiar chair",
      "my own excuses",
      "comfort can disguise a cage"
    ],
    [
      "lied to avoid conflict",
      "one harmless-sounding sentence",
      "a bigger mess later",
      "peace built on lies has termites"
    ],
    [
      "dismissed someone's pain",
      "my impatient advice",
      "their quiet after",
      "I hate when I become what hurt me"
    ],
    [
      "burned a bridge dramatically",
      "a final message",
      "my anger feeling powerful",
      "some exits leave smoke in your own lungs"
    ],
    [
      "kept postponing my health",
      "a reminder notification",
      "one more later",
      "bodies remember being ignored"
    ],
    [
      "forgot to celebrate someone",
      "their small achievement",
      "my distracted reply",
      "love should notice the little victories"
    ],
    [
      "chose comfort over courage",
      "the safer answer",
      "a chance passing by",
      "fear has taken too many decisions in my name"
    ]
  ],
  "Funny": [
    [
      "pretended to understand a song lyric for years",
      "everyone singing confidently",
      "me inventing sounds",
      "my confidence was entirely decorative"
    ],
    [
      "waved back at someone who was waving behind me",
      "my hand already committed",
      "a stranger's confused smile",
      "I spiritually left my body in public"
    ],
    [
      "accidentally liked a very old post",
      "my thumb betraying me",
      "the year 2019 staring back",
      "curiosity needs parental controls"
    ],
    [
      "panic-ordered the first thing on the menu",
      "the waiter waiting",
      "a dish I could not pronounce",
      "social pressure apparently chooses dinner"
    ],
    [
      "said 'you too' to a delivery guy after he said enjoy",
      "the bag in my hand",
      "his tiny pause",
      "my brain has customer-service autopilot"
    ],
    [
      "practiced a confident walk and tripped",
      "two seconds of main-character energy",
      "one uneven tile",
      "the universe hates rehearsed swagger"
    ],
    [
      "sent a serious message with a typo",
      "one accidental extra letter",
      "the whole emotion ruined",
      "nothing humbles grief like autocorrect"
    ],
    [
      "hid from someone then met them anyway",
      "the wrong aisle",
      "a packet of chips as cover",
      "my spy career ended in snacks"
    ],
    [
      "laughed at my own joke too early",
      "nobody else caught up",
      "me explaining it like a lecturer",
      "comedy is just loneliness with timing"
    ],
    [
      "forgot why I entered the room",
      "standing near the switchboard",
      "performing confusion",
      "my brain opened a loading screen"
    ],
    [
      "answered a call with my alarm voice",
      "a cracked hello",
      "my friend going silent",
      "sleep should come with a disclaimer"
    ],
    [
      "tried to look busy in a shop",
      "reading shampoo ingredients",
      "not understanding one word",
      "avoidance taught me chemistry"
    ],
    [
      "sent the wrong sticker to a serious chat",
      "a dancing vegetable",
      "their sad paragraph above it",
      "I may need to leave the country"
    ],
    [
      "said bye then walked the same direction",
      "three awkward steps",
      "both of us pretending not to notice",
      "goodbyes need traffic management"
    ],
    [
      "misheard a compliment as an insult",
      "my defensive thanks",
      "their confused face",
      "confidence and hearing both failed me"
    ],
    [
      "burned toast and called it rustic",
      "smoke near the fan",
      "my fake chef voice",
      "denial tastes like charcoal"
    ],
    [
      "tried to take a cool mirror selfie",
      "a towel in the background",
      "my face too serious",
      "mystery died in the bathroom"
    ],
    [
      "forgot someone's name mid-sentence",
      "a heroic pause",
      "calling them bro instead",
      "language abandoned me in battle"
    ],
    [
      "acted like I knew where I was going",
      "three wrong turns",
      "Google Maps judging me",
      "pride adds distance"
    ],
    [
      "opened the fridge for emotional support",
      "one lonely lemon",
      "me staring anyway",
      "even appliances know I am dramatic"
    ]
  ],
  "Grateful": [
    [
      "someone saved me a seat",
      "a bag moved quietly",
      "no big announcement",
      "being considered softly can fix a bad hour"
    ],
    [
      "my friend remembered my exam date",
      "one short message",
      "my chest warming too fast",
      "small memory feels like love"
    ],
    [
      "a stranger held the door when my hands were full",
      "plastic bags cutting my fingers",
      "one patient smile",
      "the world is not always sharp"
    ],
    [
      "my mother cut fruit without asking",
      "a steel plate",
      "pieces of guava with salt",
      "care often arrives as food"
    ],
    [
      "my sibling sent a dumb reel",
      "terrible audio",
      "me laughing alone",
      "some people throw ropes without knowing"
    ],
    [
      "a teacher explained twice without making me feel stupid",
      "chalk dust",
      "my notebook finally making sense",
      "patience can change a whole subject"
    ],
    [
      "my dog sat near me when I was quiet",
      "warm weight against my leg",
      "no questions",
      "sometimes comfort has paws"
    ],
    [
      "someone paid attention to my silence",
      "a careful 'you okay?'",
      "not dramatic, just kind",
      "being noticed gently is rare"
    ],
    [
      "rain started after a hot day",
      "smell of wet dust",
      "the road shining",
      "the sky also needed release"
    ],
    [
      "my roommate washed my cup",
      "a tiny ordinary kindness",
      "no lecture attached",
      "shared life is built from these things"
    ],
    [
      "a friend forgave my late reply",
      "no guilt trip",
      "just 'I get it'",
      "understanding can feel like oxygen"
    ],
    [
      "my old headphones still worked",
      "one side crackling",
      "a song surviving",
      "not everything useful has to be new"
    ],
    [
      "someone laughed at my weak joke",
      "real laughter, not pity",
      "my confidence returning",
      "being easy to enjoy is a gift"
    ],
    [
      "I had enough money for groceries",
      "a full bag",
      "one extra biscuit packet",
      "ordinary security is worth worshipping"
    ],
    [
      "my plant grew a new leaf",
      "tiny green curl",
      "me checking it like news",
      "life keeps making small announcements"
    ],
    [
      "a cousin called just to talk",
      "no favor needed",
      "twenty random minutes",
      "not being needed can feel better than being useful"
    ],
    [
      "the power came back before my phone died",
      "fan starting again",
      "everyone cheering softly",
      "tiny relief can feel cinematic"
    ],
    [
      "someone returned something I forgot",
      "my notebook at the counter",
      "their honest shrug",
      "good people exist in boring ways"
    ],
    [
      "I slept without nightmares",
      "morning arriving clean",
      "my body less guarded",
      "peace does not have to be loud"
    ],
    [
      "someone said they were proud of me",
      "one sentence",
      "me pretending it was casual",
      "approval from the right person lands differently"
    ]
  ],
  "Lost": [
    [
      "do not know what I want anymore",
      "a blank search bar",
      "too many tabs open",
      "choice can feel like fog"
    ],
    [
      "changed my mind so many times I stopped trusting it",
      "crossed-out plans",
      "a notebook full of almosts",
      "maybe confusion is also information"
    ],
    [
      "feel like I picked the wrong path",
      "a course page",
      "other people sounding certain",
      "certainty looks real from a distance"
    ],
    [
      "cannot tell if I am lazy or tired",
      "an unfinished task",
      "my body refusing",
      "shame is a bad diagnostic tool"
    ],
    [
      "miss the version of me who had direction",
      "old goals in a file",
      "my younger handwriting",
      "I used to sound so sure"
    ],
    [
      "keep waiting for a sign",
      "a silent phone",
      "clouds moving slowly",
      "maybe no sign is coming because I need to choose"
    ],
    [
      "feel behind but do not know the race",
      "everyone running somewhere",
      "me tying my shoes forever",
      "comparison invented a finish line"
    ],
    [
      "want to leave and stay at the same time",
      "a packed thought, not a bag",
      "my room looking both safe and small",
      "ambivalence is exhausting"
    ],
    [
      "do not recognize my own routine",
      "same alarm",
      "different emptiness",
      "habits can become costumes"
    ],
    [
      "started five plans and finished none",
      "sticky notes curling",
      "my motivation evaporating",
      "starting is easier than becoming"
    ],
    [
      "cannot decide who I am becoming",
      "mirror after a haircut",
      "a face almost familiar",
      "identity is under construction without warning signs"
    ],
    [
      "feel like I am disappointing invisible judges",
      "no one actually saying anything",
      "pressure anyway",
      "expectations can haunt without bodies"
    ],
    [
      "want advice but hate being told what to do",
      "a message asking for help",
      "my defensiveness ready",
      "I am complicated even to myself"
    ],
    [
      "do not know if I should go back",
      "an old opportunity",
      "a new fear",
      "returning and failing forward both scare me"
    ],
    [
      "feel stuck between two cities",
      "a train schedule",
      "one place calling, one place holding",
      "home is not always singular"
    ],
    [
      "lost interest in things I begged for",
      "a hobby kit unopened",
      "dust on excitement",
      "wanting something and living it are different"
    ],
    [
      "keep changing my personality for rooms",
      "different laughs",
      "different opinions",
      "I am tired of being adjustable"
    ],
    [
      "have no answer when people ask my plan",
      "a polite smile",
      "my brain going blank",
      "not knowing becomes a performance"
    ],
    [
      "feel like the map is written in another language",
      "forms, deadlines, advice",
      "all of it buzzing",
      "adult life has too many secret menus"
    ],
    [
      "wonder if I am starting over or giving up",
      "a deleted folder",
      "a new empty page",
      "sometimes both actions look identical"
    ]
  ],
  "Healing": [
    [
      "did not check their profile today",
      "my phone staying quiet",
      "one urge passing like weather",
      "not feeding the wound felt powerful"
    ],
    [
      "said the truth without making it prettier",
      "a plain sentence",
      "my voice shaking but present",
      "honesty can tremble and still stand"
    ],
    [
      "forgave myself for one old mistake",
      "not completely, but a little",
      "a breath I did not know I was holding",
      "mercy can arrive in drops"
    ],
    [
      "threw away something that kept hurting",
      "a receipt, a note, a tiny object",
      "the bin closing",
      "memory does not need every souvenir"
    ],
    [
      "went back to a place and survived it",
      "the same corner",
      "different shoes",
      "I was not as small as the memory"
    ],
    [
      "let someone be disappointed without chasing them",
      "a cold reply",
      "my hands staying still",
      "I can survive not being approved"
    ],
    [
      "rested before I collapsed",
      "a blanket in the afternoon",
      "sunlight on the floor",
      "prevention is not laziness"
    ],
    [
      "asked for clarification instead of assuming hate",
      "one careful question",
      "a normal answer",
      "my anxiety is not always a prophet"
    ],
    [
      "deleted a draft I wrote in pain",
      "paragraphs full of fire",
      "the backspace key",
      "not every feeling needs delivery"
    ],
    [
      "cried without insulting myself",
      "wet sleeves",
      "no inner lecture",
      "being soft did not make me weak"
    ],
    [
      "accepted an apology but kept the boundary",
      "kind words",
      "a locked door inside",
      "forgiveness is not the same as access"
    ],
    [
      "started eating properly again",
      "rice, dal, one pickle",
      "my body feeling less like an enemy",
      "care can be basic and holy"
    ],
    [
      "told my story without laughing it off",
      "one serious pause",
      "someone listening",
      "pain does not need comedy to deserve space"
    ],
    [
      "stopped explaining my absence to everyone",
      "fewer excuses",
      "more truth",
      "privacy is allowed"
    ],
    [
      "noticed I was calmer after leaving",
      "a quiet walk home",
      "no message to decode",
      "peace is data"
    ],
    [
      "blocked a person and did not unblock",
      "the empty search result",
      "my chest still loud",
      "healing can feel rude at first"
    ],
    [
      "let a good day be good",
      "tea, clean clothes, ordinary light",
      "no suspicion waiting behind it",
      "joy does not require an apology"
    ],
    [
      "asked for help before breaking",
      "one honest message",
      "a reply that came quickly",
      "people cannot show up for secrets"
    ],
    [
      "made peace with not getting closure",
      "no final talk",
      "no perfect ending",
      "some doors teach you by staying closed"
    ],
    [
      "looked in the mirror with less hatred",
      "tired eyes",
      "still my face",
      "I am trying to come home to myself"
    ]
  ]
};

const COMMENT_TONES = [
  "relatable", "supportive", "gentle-advice", "short-reaction", "tiny-story", "soft-disagree", "warm-humor", "older-sibling", "quiet-witness"
];

const SCORCHED_PUSHBACKS = [
  "I understand the anger, but I am not fully with you on the way you framed the other person.",
  "This sounds painful, but one part of this reads like hurt trying to become a verdict.",
  "I was nodding until the last bit. Maybe they were wrong and you still do not have to become cruel back.",
  "You are allowed to be furious. I just hope you do not let the anger drive the whole car.",
  "There may be another side here, but the hurt in your post still feels real.",
  "I get why you snapped. I also think the aftermath might need a calmer conversation later.",
  "This is one of those posts where both things can be true: they were unfair, and you may be spiraling.",
  "Not judging you, but I think revenge will keep you tied to the same person longer.",
  "The pain makes sense. The conclusion might be too harsh because it was written while the wound was open.",
  "I do not think you are wrong for feeling this, but I would wait before making a permanent decision from it.",
];

let rngSeed = 20260526;
function random() {
  rngSeed = (rngSeed * 1664525 + 1013904223) % 4294967296;
  return rngSeed / 4294967296;
}
function rand(min, max) { return Math.floor(random() * (max - min + 1)) + min; }
function pick(arr) { return arr[rand(0, arr.length - 1)]; }
function sample(arr, count, excludeSet = new Set()) {
  const pool = arr.filter((item) => !excludeSet.has(String(item._id || item)));
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = rand(0, i);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.min(count, pool.length));
}
function uniqueIds(users) { return [...new Set(users.map((user) => user._id))]; }
function daysAgo(days, hourOffset = 0) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(rand(7, 23) + hourOffset, rand(0, 59), rand(0, 59), 0);
  return date;
}
function normalizeText(text) { return String(text || "").replace(/\s+/g, " ").trim().toLowerCase(); }

function categoryForMood(mood, index) {
  const m = mood.toLowerCase();
  if (m === "angry") return "scorched";
  if (m === "grateful" || m === "hopeful" || m === "healing") return index % 5 === 0 ? "budding" : "grove";
  if (m === "funny" || m === "love") return index % 4 === 0 ? "budding" : "grove";
  if (m === "heavy" || m === "regret") return index % 3 === 0 ? "scorched" : "budding";
  if (m === "lost" || m === "lonely") return index % 4 === 0 ? "scorched" : "budding";
  return "general";
}

function categoryWarning(mood) {
  const lower = mood.toLowerCase();
  if (["heavy", "lonely", "lost"].includes(lower)) return "emotional";
  if (["angry", "regret"].includes(lower)) return "conflict";
  return "";
}

function randomCosmeticLoadout(index) {
  const frame = COSMETICS.frames[index % COSMETICS.frames.length];
  const badge = COSMETICS.badges[(index * 2 + 1) % COSMETICS.badges.length];
  const title = COSMETICS.titles[(index * 3 + 2) % COSMETICS.titles.length];
  const postTheme = COSMETICS.postThemes[(index * 5 + 3) % COSMETICS.postThemes.length];
  return {
    ownedCosmetics: {
      frames: [frame, pick(COSMETICS.frames)],
      badges: [badge, pick(COSMETICS.badges)],
      titles: [title, pick(COSMETICS.titles)],
      postThemes: [postTheme, pick(COSMETICS.postThemes)],
    },
    equippedCosmetics: { frame, badge, title, postTheme },
  };
}

function moodIntro(mood, number) {
  const intros = {
    Hopeful: ["I did not fix my life today, but something shifted.", "This is a small confession, but it felt bigger while living it.", "I almost did not count this as progress, then I realized I always move the goalpost."],
    Heavy: ["I have been carrying this quietly because saying it out loud makes it real.", "Today felt normal from outside, which is the part that scares me.", "I kept functioning, but inside it felt like I was walking through water."],
    Angry: ["I know anger is not always pretty, but I need to put this somewhere.", "I am tired of making my hurt sound polite so other people feel comfortable.", "Maybe this is not my calmest version, but it is the honest one."],
    Lonely: ["I do not think people understand how quiet loneliness can be.", "This is not about having zero people around. It is worse than that.", "I miss being known in small, useless ways."],
    Love: ["I hate how soft I get when I care about someone.", "I am writing this anonymously because even admitting it to myself feels too exposed.", "Love is embarrassing when it catches you before you are ready."],
    Regret: ["I keep replaying this like there is still a version where I choose better.", "I know I cannot edit the past, but my brain keeps opening the file.", "This regret is not dramatic to anyone else, but it keeps finding me."],
    Funny: ["This is not tragic, just humiliating enough to confess anonymously.", "I need to admit this somewhere because my ego is still recovering.", "Today I was defeated by a very ordinary situation."],
    Grateful: ["Something small happened and I have been weirdly emotional about it.", "I forget that kindness can arrive without fireworks.", "This is just gratitude, but it caught me off guard."],
    Lost: ["I feel like everyone got a manual and mine was printed in fog.", "I am not in crisis exactly. I just do not know where I am going.", "The confusing part is that nothing is obviously wrong and I still feel misplaced."],
    Healing: ["I noticed a tiny sign that I am not where I used to be.", "Healing is not cinematic today. It is awkward and quiet.", "I did something different from my old pattern, and I want to remember it."],
  };
  return intros[mood][number % intros[mood].length];
}

function buildMessage(mood, index, topic) {
  const [event, detail, turn, takeaway] = topic;
  const intro = moodIntro(mood, index);
  const shapes = [
    `${intro}

It started with ${event}. The detail I keep thinking about is ${detail}. It should have been ordinary, but ${turn} and suddenly the whole day had a different weight.

I guess what I am trying to admit is this: ${takeaway}.`,
    `${intro}

There was this moment with ${detail} after I ${event}. I did not react dramatically. I just stood there with ${turn}, pretending it was just another minute.

But it stayed with me because ${takeaway}. I needed to say it somewhere before I swallowed it again.`,
    `${intro}

I keep minimizing it because it sounds silly when summarized: ${event}. But the part nobody saw was ${turn}, and the tiny object my brain saved was ${detail}.

Maybe I am overthinking. Maybe I am finally listening to myself. Either way, ${takeaway}.`,
    `${intro}

The scene was not special. Just ${detail}, then ${event}, then me acting like ${turn} did not hit me in the chest.

I am not asking for advice. I just want this feeling outside me for a while: ${takeaway}.`,
  ];
  let body = shapes[index % shapes.length];
  if (index % 5 === 0) {
    body += `

The annoying part is how much energy I spend trying to make my feelings sound reasonable before I let anyone see them. Even here, anonymous, I want to edit myself into someone calmer. The raw version is probably more useful.`;
  } else if (index % 4 === 0) {
    body += `

I think I wanted someone to notice without forcing me to perform the whole explanation. I know people are not mind readers, but wanting to be noticed gently is such a human weakness.`;
  }
  return body;
}

function makeComment(mood, category, postIndex, commentIndex, topic) {
  const [event, detail, turn, takeaway] = topic;
  const tone = COMMENT_TONES[(postIndex * 3 + commentIndex) % COMMENT_TONES.length];

  if (category === "scorched" && commentIndex % 3 === 1) {
    const push = SCORCHED_PUSHBACKS[(postIndex + commentIndex) % SCORCHED_PUSHBACKS.length];
    return `${push} The detail about ${detail} makes it feel less like random drama and more like something that has been building.`;
  }
  if (category === "scorched" && commentIndex % 5 === 3) {
    return `I get the fire in this, but the part where ${turn} feels like the moment to pause. Sometimes anger tells the truth loudly and still misses a few rooms.`;
  }

  const banks = {
    relatable: `The ${detail} part is what made this feel real. Different situation, but I know that exact feeling of one tiny thing holding the whole day hostage.`,
    supportive: `I do not think you are strange for reacting to ${event} like this. The sentence about "${takeaway}" actually makes a lot of sense.`,
    "gentle-advice": `Maybe do not force a final answer tonight. If ${turn} is still echoing, just naming it clearly might be enough for now.`,
    "short-reaction": `Damn, ${turn} is such a specific kind of hurt. This did not read fake or dramatic to me.`,
    "tiny-story": `This reminded me of a day when I kept staring at something ordinary and realized I was not okay. Small witnesses like ${detail} can be weirdly powerful.`,
    "soft-disagree": `I get why you are judging yourself here, but from outside this reads less like failure and more like someone trying to make sense of ${event}.`,
    "warm-humor": `Not ${detail} becoming the emotional main character. Feelings really do choose the strangest props to attack us with.`,
    "older-sibling": `For what it is worth, this sounds like awareness, not weakness. The ${event} part would have stayed with a lot of people.`,
    "quiet-witness": `I read the whole thing. No big speech, just wanted you to know the part about ${turn} landed with someone.`,
  };

  const closers = [
    "Hope the next hour is a little easier on you.",
    "Leaving this here so it does not feel like you threw it into a void.",
    "That kind of honesty is small but not easy.",
    "This is exactly the sort of thing people hide and then feel alone with.",
    "You made it sound human, not attention-seeking.",
    "I hope you treat yourself with less sharpness after saying it.",
    "Sometimes being understood for five seconds still helps.",
  ];
  return `${banks[tone]} ${closers[(postIndex + commentIndex * 2) % closers.length]}`;
}

function buildPostReactions(category, author, users) {
  const exclude = new Set([String(author._id)]);
  let waterCount;
  let burnCount;
  if (category === "budding") {
    waterCount = rand(10, 32);
    burnCount = rand(Math.max(5, waterCount - 7), Math.min(40, waterCount + 7));
  } else if (category === "grove") {
    waterCount = rand(25, 40);
    burnCount = rand(5, 14);
  } else if (category === "scorched") {
    burnCount = rand(25, 40);
    waterCount = rand(5, 20);
  } else {
    waterCount = rand(12, 40);
    burnCount = rand(5, 34);
  }
  const wateredUsers = sample(users, waterCount, exclude);
  const used = new Set([...exclude, ...wateredUsers.map((u) => String(u._id))]);
  const burnedUsers = sample(users, burnCount, used);
  return { wateredBy: uniqueIds(wateredUsers), burnedBy: uniqueIds(burnedUsers) };
}

function buildComments(mood, category, postIndex, topic, postDate, users, author) {
  const count = rand(5, 9);
  const commenters = sample(users, count, new Set([String(author._id)]));
  const boostedIndexes = new Set(sample([...Array(count).keys()], rand(1, 3)).map((n) => n));
  return commenters.map((commenter, i) => {
    const isBoosted = boostedIndexes.has(i);
    const waterCount = isBoosted ? rand(20, 30) : rand(0, 8);
    const burnCount = category === "scorched"
      ? (isBoosted ? rand(3, 12) : rand(0, 6))
      : (isBoosted ? rand(0, 4) : rand(0, 3));
    const wateredUsers = sample(users, waterCount, new Set([String(commenter._id)]));
    const used = new Set([String(commenter._id), ...wateredUsers.map((u) => String(u._id))]);
    const burnedUsers = sample(users, burnCount, used);
    return {
      userId: commenter._id,
      text: makeComment(mood, category, postIndex, i, topic),
      image: null,
      wateredBy: uniqueIds(wateredUsers),
      burnedBy: uniqueIds(burnedUsers),
      replies: [],
      isHidden: false,
      hiddenReason: "",
      hiddenBy: null,
      hiddenAt: null,
      createdAt: new Date(postDate.getTime() + (i + 1) * rand(13, 89) * 60 * 1000),
    };
  });
}

function buildComfortCards(users, author) {
  return sample(COMFORT_TEXTS, rand(3, 5)).map((text) => {
    const senders = sample(users, rand(3, 12), new Set([String(author._id)]));
    return { text, count: senders.length, sentBy: uniqueIds(senders) };
  });
}

function validateUniqueContent(confessions) {
  const seenPosts = new Map();
  const seenComments = new Map();
  for (const confession of confessions) {
    const postKey = normalizeText(confession.message);
    if (seenPosts.has(postKey)) throw new Error(`Duplicate confession text found for mood ${confession.mood}`);
    seenPosts.set(postKey, true);
    for (const comment of confession.comments || []) {
      const commentKey = normalizeText(comment.text);
      if (seenComments.has(commentKey)) throw new Error(`Duplicate comment text found: ${comment.text}`);
      seenComments.set(commentKey, true);
    }
  }
  return { postCount: seenPosts.size, commentCount: seenComments.size };
}

async function wipeContentOnly() {
  const deleteConfessions = await Confession.deleteMany({});
  console.log(`Deleted confessions/posts: ${deleteConfessions.deletedCount}`);
  if (Report?.deleteMany) {
    const deletedReports = await Report.deleteMany({});
    console.log(`Deleted reports tied to old content: ${deletedReports.deletedCount}`);
  }
  if (Notification?.deleteMany) {
    const deletedNotifications = await Notification.deleteMany({});
    console.log(`Deleted notifications tied to old content: ${deletedNotifications.deletedCount}`);
  }
}

async function resetSeedUsersAndContent() {
  const deleteConfessions = await Confession.deleteMany({ isSeedContent: true });
  const deleteUsers = await User.deleteMany({ isSeedUser: true });
  console.log(`Deleted seed confessions: ${deleteConfessions.deletedCount}`);
  console.log(`Deleted seed users: ${deleteUsers.deletedCount}`);
}

async function ensureSeedUsers() {
  const existing = await User.find({ isSeedUser: true }).sort({ createdAt: 1, username: 1 });
  const passwordHash = await bcrypt.hash(`starter-${Date.now()}-${Math.random()}`, 10);
  const existingNames = new Set(existing.map((u) => u.username));
  const usersToCreate = [];
  for (let index = 0; index < TARGET_SEED_USERS; index += 1) {
    const [username, persona] = SEED_PERSONAS[index % SEED_PERSONAS.length];
    if (existingNames.has(username)) continue;
    const cosmetics = randomCosmeticLoadout(index);
    usersToCreate.push({
      username,
      email: `${username}@seed.confession-wall.local`,
      password: passwordHash,
      profilePicture: seedAvatarPath(index),
      bio: persona,
      isAdmin: false,
      role: "user",
      isSeedUser: true,
      seedPersona: persona,
      seeds: rand(75, 1200),
      showSeedsOnProfile: rand(0, 1) === 1,
      ownedCosmetics: cosmetics.ownedCosmetics,
      equippedCosmetics: cosmetics.equippedCosmetics,
      dailyStreak: { current: rand(0, 18), best: rand(2, 36), lastVisitDateKey: "" },
      createdAt: daysAgo(rand(15, 90)),
      updatedAt: daysAgo(rand(0, 14)),
    });
  }
  if (usersToCreate.length) {
    await User.insertMany(usersToCreate, { ordered: false });
    console.log(`Created missing fictional seed users: ${usersToCreate.length}`);
  }
  const allSeedUsers = await User.find({ isSeedUser: true }).sort({ createdAt: 1, username: 1 });
  const operations = allSeedUsers.slice(0, TARGET_SEED_USERS).map((user, index) => ({
    updateOne: {
      filter: { _id: user._id },
      update: { $set: { profilePicture: seedAvatarPath(index), updatedAt: new Date() } },
    },
  }));
  if (operations.length) await User.bulkWrite(operations);
  return User.find({ isSeedUser: true }).sort({ createdAt: 1, username: 1 }).limit(TARGET_SEED_USERS);
}

async function refreshSeedUserAvatars() {
  const users = await ensureSeedUsers();
  console.log(`Refreshed/ensured seed user avatars: ${users.length}`);
  console.log(`Avatar pool available: ${SEED_AVATAR_PATHS.length}`);
}

function buildConfessions(users) {
  const confessions = [];
  let globalIndex = 0;
  for (const mood of MOODS) {
    const topics = TOPICS_BY_MOOD[mood];
    for (let i = 0; i < POSTS_PER_MOOD; i += 1) {
      const topic = topics[i];
      const category = categoryForMood(mood, i);
      const author = users[(globalIndex * 7 + i * 3) % users.length];
      const createdAt = daysAgo(rand(0, 26), -Math.floor(i / 5));
      const reactions = buildPostReactions(category, author, users);
      const comments = buildComments(mood, category, globalIndex, topic, createdAt, users, author);
      const postTheme = author.equippedCosmetics?.postTheme || pick(COSMETICS.postThemes);
      const warning = categoryWarning(mood);
      confessions.push({
        userId: author._id,
        message: buildMessage(mood, i, topic),
        image: null,
        images: [],
        mood,
        isSeedContent: true,
        seedCategory: category,
        seedBatch: SEED_BATCH,
        postTheme,
        contentWarning: {
          enabled: Boolean(warning),
          category: warning,
          note: warning ? "Fictional starter confession with emotional themes." : "",
          sensitive: Boolean(warning),
        },
        wateredBy: reactions.wateredBy,
        burnedBy: reactions.burnedBy,
        seedReactionRewardedBy: [],
        comfortCards: buildComfortCards(users, author),
        poll: undefined,
        weeklyEventTracking: [],
        isHidden: false,
        hiddenReason: "",
        hiddenBy: null,
        hiddenAt: null,
        comments,
        safetyFlags: [],
        createdAt,
        updatedAt: createdAt,
      });
      globalIndex += 1;
    }
  }
  validateUniqueContent(confessions);
  return confessions;
}

async function main() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error("Missing MONGO_URI in server/.env");
    process.exit(1);
  }
  await mongoose.connect(mongoUri);
  console.log("Connected to MongoDB.");

  if (DRY_RUN) {
    const fakeUsers = Array.from({ length: TARGET_SEED_USERS }, (_, i) => ({ _id: new mongoose.Types.ObjectId(), equippedCosmetics: randomCosmeticLoadout(i).equippedCosmetics }));
    const confessions = buildConfessions(fakeUsers);
    const uniqueReport = validateUniqueContent(confessions);
    console.log("Dry run passed.");
    console.log(`Would create ${TARGET_SEED_USERS} fictional seed users if missing.`);
    console.log(`Would create ${confessions.length} starter confessions.`);
    console.log(`Unique confession texts: ${uniqueReport.postCount}`);
    console.log(`Unique comment texts: ${uniqueReport.commentCount}`);
    console.log("Use --wipe-content --seed to delete all old posts/comments and recreate starter content while keeping users.");
    await mongoose.disconnect();
    return;
  }

  if (REFRESH_AVATARS) {
    await refreshSeedUserAvatars();
    await mongoose.disconnect();
    return;
  }

  if (RESET_SEED_USERS) {
    await resetSeedUsersAndContent();
  }

  if (WIPE_CONTENT) {
    await wipeContentOnly();
  }

  const existingConfessions = await Confession.countDocuments({});
  if (!SHOULD_SEED && !WIPE_CONTENT && !RESET_SEED_USERS) {
    console.log("No write action selected.");
    console.log("Use --dry-run, --wipe-content --seed, --refresh-avatars, or --reset-seed-users --seed.");
    await mongoose.disconnect();
    return;
  }

  if (SHOULD_SEED) {
    if (existingConfessions > 0 && !WIPE_CONTENT && !FORCE) {
      console.log(`Confessions already exist: ${existingConfessions}`);
      console.log("Use --wipe-content --seed to replace content, or --force --seed to add anyway.");
      await mongoose.disconnect();
      return;
    }
    const users = await ensureSeedUsers();
    const confessions = buildConfessions(users);
    const uniqueReport = validateUniqueContent(confessions);
    await Confession.insertMany(confessions, { ordered: false });
    const countsByMood = confessions.reduce((acc, confession) => { acc[confession.mood] = (acc[confession.mood] || 0) + 1; return acc; }, {});
    const countsByCategory = confessions.reduce((acc, confession) => { acc[confession.seedCategory] = (acc[confession.seedCategory] || 0) + 1; return acc; }, {});
    console.log("Starter content v3 complete.");
    console.log(`Seed users kept/ensured: ${users.length}`);
    console.log(`Created starter confessions: ${confessions.length}`);
    console.log(`Unique confession texts: ${uniqueReport.postCount}`);
    console.log(`Unique comment texts: ${uniqueReport.commentCount}`);
    console.log("By mood:", countsByMood);
    console.log("By category:", countsByCategory);
  }

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error("Seed starter content failed:", err);
  try { await mongoose.disconnect(); } catch (_) {}
  process.exit(1);
});
