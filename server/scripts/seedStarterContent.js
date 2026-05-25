/*
  Confession Wall starter content v4
  ------------------------------------------------------------
  Wipes/reseeds confession content while keeping user accounts and avatar assets.

  Main commands from server folder:
    node scripts/seedStarterContent.js --dry-run
    node scripts/seedStarterContent.js --wipe-content --seed

  Safe notes:
  - --wipe-content deletes confessions/posts and optional post-linked reports/notifications.
  - It does NOT delete users, seed avatars, admins, cosmetics, or accounts.
  - Seed users are fictional anonymous characters marked isSeedUser=true.
  - All starter posts/comments are original fictional content with stricter uniqueness and more varied organic comment voices.
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
const SEED_BATCH = "starter-community-v4-organic-no-duplicate-200";

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
    Hopeful: [
      "Not a huge life update. Just one of those small things that quietly mattered.",
      "I almost ignored this because it sounds too ordinary to be a confession.",
      "Today did not turn magical, but it stopped feeling completely stuck for a minute.",
      "I caught myself expecting the worst and then something normal happened instead.",
      "This is tiny, but I am writing it down before my brain convinces me it counts for nothing.",
    ],
    Heavy: [
      "I have been acting fine so convincingly that even I forget it is an act sometimes.",
      "Nothing dramatic happened today. That is the weird part. I still felt crushed.",
      "I do not want pity. I just want to stop carrying this like it is not heavy.",
      "I kept doing normal-person tasks while feeling like my chest had bad weather in it.",
      "This is one of those feelings that looks boring from outside and impossible from inside.",
    ],
    Angry: [
      "I know this is not my most generous version, but I am tired of editing my anger.",
      "Maybe I am being unfair. I am still angry enough to say it anyway.",
      "I keep making my disappointment sound polite and I am sick of that job.",
      "This is scorched because I do not have a calm little bow to put on it.",
      "I am not proud of how bitter this sounds. I am just done pretending it is fine.",
    ],
    Lonely: [
      "The worst loneliness is the kind where your phone has notifications and none of them feel like you.",
      "I have people around. That almost makes it harder to explain.",
      "This is not a dramatic lonely movie scene. It is quieter and more annoying than that.",
      "I miss being someone's automatic choice for stupid little updates.",
      "Some days I do not want a solution. I just want someone to notice the silence changed shape.",
    ],
    Love: [
      "I hate how embarrassing it is to care this much.",
      "I am posting this anonymously because saying it with my actual face would ruin me.",
      "Love makes me act like a normal notification is a court judgment.",
      "I thought I was being chill. Apparently I was just being quiet and dramatic internally.",
      "This is not a confession I can send to them, so I am leaving it here instead.",
    ],
    Regret: [
      "My brain keeps replaying one moment like it is trying to find a hidden exit.",
      "I know the past is over. Very cool fact. My stomach has not accepted it.",
      "This regret is not cinematic. It is just annoying and persistent.",
      "I keep thinking about the version of me who could have chosen softer words.",
      "I want to be forgiven, but I also know forgiveness is not a vending machine.",
    ],
    Funny: [
      "This is low stakes, but my dignity still wants witness protection.",
      "No tragedy here. Just me losing a fight against a completely normal situation.",
      "I need to confess this before my brain turns it into a ten-part documentary.",
      "The universe handed me a tiny embarrassment and I performed like it was opening night.",
      "I am laughing now, which is different from being okay with what happened.",
    ],
    Grateful: [
      "Someone did a small kind thing and it has been sitting in my chest all day.",
      "I forget how much a tiny decent moment can rearrange a bad mood.",
      "This is not a grand thank-you speech. I just do not want the kindness to disappear unnoticed.",
      "A normal person was kind for ten seconds and apparently that was enough to undo me.",
      "I keep replaying this because it reminded me people can still be gentle for no reward.",
    ],
    Lost: [
      "I do not feel broken exactly. I feel misplaced.",
      "Everyone seems to be moving in straight lines and I am circling the same room with snacks.",
      "I am not having a crisis. I am having a long confused loading screen.",
      "The future feels like a form I forgot to fill correctly.",
      "Nothing is on fire, which somehow makes it harder to explain why I feel stuck.",
    ],
    Healing: [
      "I noticed a small old pattern and did not obey it immediately. That felt new.",
      "Healing today looked suspiciously boring, but I think it still counted.",
      "I am not transformed. I just caught myself being a little less cruel to myself.",
      "Something that used to wreck me only bruised me today. I want to remember that.",
      "I did not become peaceful. I just did not make the wound bigger.",
    ],
  };
  return intros[mood][number % intros[mood].length];
}

function paragraphJoin(parts) {
  return parts.filter(Boolean).join("\n\n");
}

function buildMessage(mood, index, topic) {
  const [event, detail, turn, takeaway] = topic;
  const intro = moodIntro(mood, index);
  const lowercaseStart = index % 11 === 3;
  const looseLine = index % 7 === 2;

  const shapes = [
    () => paragraphJoin([
      intro,
      `It started with ${event}. I know that sounds like the smallest possible thing, but the part that stayed was ${detail}. My face probably looked normal. Inside, ${turn}.`,
      `I keep trying to make this sound cleaner than it felt. The honest version is that ${takeaway}.`,
    ]),
    () => paragraphJoin([
      intro,
      `The whole scene was boring if you were not living inside my head: ${detail}, then ${event}, then me pretending ${turn} was not suddenly the loudest thing in the room.`,
      `I am not looking for a perfect answer. I just needed to put this somewhere before I made it smaller again: ${takeaway}.`,
    ]),
    () => paragraphJoin([
      intro,
      `i did this thing where I acted casual about ${event} and then thought about it for way too long. The stupid little detail was ${detail}. That is what my brain chose to save, apparently.`,
      `Maybe it is not deep. Maybe it is. Either way, ${takeaway}.`,
    ]),
    () => paragraphJoin([
      intro,
      `There was a moment with ${detail} where I almost laughed because it was so ordinary. Then ${turn}, and I realized ordinary things can still hit like a brick when you are already tired.`,
      `The part I am confessing is not the event itself. It is that ${takeaway}.`,
    ]),
    () => paragraphJoin([
      intro,
      `If I tell this out loud, it sounds like nothing: ${event}. No music, no movie lighting, just ${detail} and me trying to keep my reaction in a normal human range.`,
      `But I have been thinking about it because ${turn}. I guess ${takeaway}.`,
      index % 2 === 0 ? "I hate how much work it takes to describe one feeling without sounding dramatic." : "Maybe someone else has had a tiny moment ruin or rescue an entire day too.",
    ]),
    () => paragraphJoin([
      intro,
      `I keep circling back to ${event}. Not because it was huge, but because of ${detail}. That detail made it feel personal in a way I was not prepared for.`,
      `By the time ${turn}, I had already written three different versions of the story in my head. The simplest one is probably this: ${takeaway}.`,
    ]),
    () => paragraphJoin([
      intro,
      `Honestly, ${event} should have been a normal Tuesday-level thing. Instead, I carried ${detail} around in my head like evidence.`,
      `The embarrassing truth is ${turn}. I do not even know what I want anyone to say. I just know ${takeaway}.`,
    ]),
    () => paragraphJoin([
      intro,
      `I did not cry or explode or make a scene. I just noticed ${detail} after ${event}, and then ${turn}. That was enough to make the rest of the day feel weirdly tilted.`,
      `So here it is, without making it prettier: ${takeaway}.`,
    ]),
    () => paragraphJoin([
      intro,
      `The thing about ${event} is that nobody would know it mattered. It looked like any other tiny moment. But ${detail} stuck to me, and ${turn} made me realize I was not as over it as I pretended.`,
      `I am leaving this here because ${takeaway}.`,
    ]),
    () => paragraphJoin([
      intro,
      `I keep wanting to delete this because it sounds too specific: ${detail}. But that is the exact reason it feels true. After ${event}, I had this ridiculous pause where ${turn}.`,
      `No grand conclusion. Just ${takeaway}.`,
    ]),
  ];

  let body = shapes[index % shapes.length]();
  if (looseLine) {
    body += `\n\nAlso yes, I know I might be overthinking. That has never once stopped me from overthinking.`;
  } else if (index % 9 === 4) {
    body += `\n\nI am not proud of every thought I had in that moment. I am only trying to be honest about the fact that I had it.`;
  } else if (index % 13 === 5) {
    body += `\n\nMaybe tomorrow I will feel normal about it. Today I do not.`;
  }

  if (lowercaseStart) {
    body = body.charAt(0).toLowerCase() + body.slice(1);
  }
  return body;
}

const ORGANIC_COMMENT_PATTERNS = {
  supportive: [
    ({ detail, takeaway }) => `The ${detail} part made this feel painfully real. I do not think you are making it too big; ${takeaway} is a pretty human thing to admit.`,
    ({ event }) => `I am glad you wrote this somewhere. People act like ${event} should be easy to shrug off, but sometimes it follows you home.`,
    ({ turn }) => `The line about ${turn} landed quietly. No advice, just saying somebody actually read it and understood the shape of it.`,
    ({ takeaway }) => `This does not read attention-seeking to me. It reads like someone finally naming the thing under the thing: ${takeaway}.`,
  ],
  relatable: [
    ({ detail }) => `Different situation, same stupid emotional physics. One tiny detail like ${detail} can hold the whole day hostage.`,
    ({ event, turn }) => `I have had my version of ${event}, and the worst part was also that weird moment where ${turn}. Very annoying brain behavior.`,
    ({ detail }) => `Not me understanding the ${detail} bit immediately. That is exactly the kind of tiny thing I would pretend not to care about and then remember for weeks.`,
    ({ event }) => `This is the kind of post where I start laughing because I relate, then stop because oh. Yeah. ${event} would have stayed with me too.`,
  ],
  practical: [
    ({ turn }) => `If you do anything with this, maybe start with the moment where ${turn}. That sounds like the part asking for your attention first.`,
    ({ event }) => `You do not have to solve the whole story tonight. Maybe just decide what you need after ${event}, even if it is only distance or sleep.`,
    ({ detail, takeaway }) => `The ${detail} detail feels like a clue, not a verdict. Sit with it, but do not let ${takeaway} become the only possible explanation.`,
    ({ turn }) => `Small practical thought: write down what happened before ${turn}. Sometimes the before-part shows what you actually needed.`,
  ],
  short: [
    ({ turn }) => `yeah, ${turn} is the sort of thing that looks tiny until it is yours.`,
    ({ detail }) => `The ${detail} detail is doing way too much emotional damage here and I mean that sincerely.`,
    ({ takeaway }) => `I would not have said it that neatly, but ${takeaway} makes sense.`,
    ({ event }) => `No because ${event} would have made me spiral too.`,
  ],
  humor: [
    ({ detail }) => `${detail} becoming the emotional main character is painfully believable. Feelings have no respect for normal props.`,
    ({ event }) => `The way ${event} turned into a whole internal courtroom is too real. Brains need fewer departments.`,
    ({ turn }) => `I laughed at ${turn} and then immediately felt bad because yeah, that is actually rough.`,
    ({ detail }) => `Somewhere ${detail} is just existing, completely unaware it became lore.`,
  ],
  miniStory: [
    ({ event, detail }) => `I once had a totally different situation where ${detail} did the same thing to me after ${event}. Nobody understood why I got quiet, which somehow made it worse.`,
    ({ turn }) => `This reminds me of when I kept saying I was fine and then one small thing made ${turn} happen in my head. Not the same story, but same weather.`,
    ({ takeaway }) => `I had a phase where I would joke about everything and then privately realize ${takeaway}. Reading this poked that memory a little.`,
    ({ detail }) => `My version had a different object, but the same feeling. It is wild how something like ${detail} can become a bookmark for a whole mood.`,
  ],
  gentlePush: [
    ({ event, takeaway }) => `I get this, but I also wonder if ${event} is carrying more meaning than it can fairly hold. ${takeaway} may be true, just not the whole truth.`,
    ({ turn }) => `I am with you emotionally, but the part where ${turn} might be worth questioning when you are calmer. Feelings can be real and still not be perfect maps.`,
    ({ detail }) => `The ${detail} detail explains why it hurt, but it might not prove everything your brain is trying to prove from it.`,
    ({ event }) => `Not dismissing you, but I would be careful about making ${event} the final evidence. Sometimes the story gets sharper when we are tired.`,
  ],
};

const SCORCHED_COMMENT_PATTERNS = [
  ({ event, detail }) => `I get why ${event} burned you, but the ${detail} part also makes me think you might be reading the worst possible version of them.`,
  ({ turn }) => `I was with you until the bit where ${turn}. Hurt explains the reaction; it does not automatically make it fair.`,
  ({ takeaway }) => `This sounds honest, but ${takeaway} also sounds like a conclusion written while angry. I would not sign it in permanent ink yet.`,
  ({ event }) => `Not saying they were right, but ${event} does not give you a free pass to scorch everything around it.`,
  ({ detail, turn }) => `The ${detail} detail makes the anger understandable. The ${turn} part is where I think the comment section is going to split.`,
  ({ event }) => `Honestly, both sides might have handled ${event} badly. That does not erase your hurt, but it changes the shape of the blame.`,
  ({ takeaway }) => `I believe the feeling. I am less sure about the verdict. ${takeaway} sounds more wounded than objective.`,
  ({ turn }) => `There is a difference between setting a boundary and punishing someone. The ${turn} line is where that difference matters.`,
  ({ detail }) => `The way you describe ${detail} is strong, but I still want to know what happened before this. Scorched posts always hide a prequel.`,
  ({ event, takeaway }) => `You may be right to be done after ${event}. I just do not think ${takeaway} should become permission to be cruel back.`,
  ({ turn }) => `ngl this reads like pain wearing armor. The ${turn} part is loud, but I am not sure it is the whole story.`,
  ({ detail }) => `I disagree with the harshest part, but I do understand why ${detail} would make somebody snap.`,
];


const UNIQUE_COMMENT_TEXTURES = [
  "That little part changes how I read the whole thing.",
  "I would not reduce this to one simple lesson.",
  "There is more going on here than the first read suggests.",
  "The messy middle of this is the believable part.",
  "I can see why people would react differently to this.",
  "That detail makes the feeling less random.",
  "I do not think this needs to be wrapped up neatly.",
  "The way you described it makes the mood pretty clear.",
  "This is one of those posts where the small part is not small.",
  "I would probably still be thinking about it too.",
  "The uncomfortable part is exactly why it sounds real.",
  "I am not sure there is a clean side to stand on here.",
  "This reads like someone trying to be honest, not dramatic.",
  "I can imagine the comments splitting on this one.",
  "That one moment says a lot without explaining everything.",
  "I would be careful with the conclusion, but the feeling makes sense.",
  "The post feels more complicated than a yes-or-no reaction.",
  "I get why this stayed in your head after the moment passed.",
  "That is the kind of thing people dismiss until it happens to them.",
  "The ordinary setting somehow makes it hit harder.",
  "I do not fully agree with every part, but I get the wound behind it.",
  "This sounds less like a performance and more like a spillover.",
  "The part you almost glossed over is the part I noticed most.",
  "It is weird how specific memories become bigger than the event.",
  "I think the comment section could help, as long as it does not turn into a trial.",
  "There is a difference between being sensitive and noticing something real.",
  "I would not be surprised if you feel differently about this tomorrow.",
  "The way this lands depends a lot on what happened before it.",
  "No perfect advice from me, just saying the conflict makes sense.",
  "This is one of those situations where two things can be true at once.",
];

function addCommentTexture(text, mood, category, postIndex, commentIndex, context) {
  const anchors = [
    `The part about ${context.detail} is what makes this feel specific.`,
    `The way ${context.event} sits in the story matters here.`,
    `I keep thinking about the moment where ${context.turn}.`,
    `The ending, especially ${context.takeaway}, changes the tone for me.`,
    `The ${mood.toLowerCase()} mood actually fits this better than a clean explanation would.`,
    category === "scorched"
      ? "This is exactly the kind of post where disagreement is part of the point."
      : "I like that this does not pretend to have a perfect ending.",
  ];
  const texture = UNIQUE_COMMENT_TEXTURES[(postIndex * 17 + commentIndex * 11 + mood.length) % UNIQUE_COMMENT_TEXTURES.length];
  const anchor = anchors[(postIndex + commentIndex * 2) % anchors.length];
  return `${text} ${anchor} ${texture}`;
}

function topicContext(topic) {
  const [event, detail, turn, takeaway] = topic;
  return { event, detail, turn, takeaway };
}

function makeComment(mood, category, postIndex, commentIndex, topic) {
  const context = topicContext(topic);
  const scorchedMode = category === "scorched" || mood === "Angry";

  if (scorchedMode) {
    const patternIndex = (postIndex * 5 + commentIndex * 3) % SCORCHED_COMMENT_PATTERNS.length;
    if (commentIndex === 0 || commentIndex === 2 || commentIndex === 4 || commentIndex === 6) {
      return addCommentTexture(SCORCHED_COMMENT_PATTERNS[patternIndex](context), mood, category, postIndex, commentIndex, context);
    }
    if (commentIndex === 1) {
      return addCommentTexture(ORGANIC_COMMENT_PATTERNS.relatable[(postIndex + commentIndex) % ORGANIC_COMMENT_PATTERNS.relatable.length](context), mood, category, postIndex, commentIndex, context);
    }
    if (commentIndex === 3) {
      return addCommentTexture(ORGANIC_COMMENT_PATTERNS.gentlePush[(postIndex + commentIndex) % ORGANIC_COMMENT_PATTERNS.gentlePush.length](context), mood, category, postIndex, commentIndex, context);
    }
  }

  const moodToneOrder = {
    Hopeful: ["supportive", "relatable", "short", "practical", "humor", "miniStory", "supportive", "gentlePush", "short"],
    Heavy: ["supportive", "quiet", "relatable", "practical", "miniStory", "short", "supportive", "gentlePush", "relatable"],
    Lonely: ["relatable", "supportive", "miniStory", "short", "practical", "supportive", "humor", "relatable", "gentlePush"],
    Love: ["relatable", "humor", "supportive", "gentlePush", "short", "miniStory", "supportive", "practical", "relatable"],
    Regret: ["gentlePush", "supportive", "practical", "relatable", "short", "miniStory", "gentlePush", "supportive", "short"],
    Funny: ["humor", "short", "relatable", "humor", "miniStory", "supportive", "short", "practical", "humor"],
    Grateful: ["supportive", "relatable", "short", "miniStory", "supportive", "humor", "practical", "relatable", "short"],
    Lost: ["relatable", "practical", "supportive", "short", "miniStory", "gentlePush", "relatable", "supportive", "humor"],
    Healing: ["supportive", "short", "relatable", "practical", "miniStory", "supportive", "gentlePush", "humor", "relatable"],
  };
  const order = moodToneOrder[mood] || ["supportive", "relatable", "short", "practical", "miniStory", "gentlePush", "humor"];
  let tone = order[commentIndex % order.length];
  if (tone === "quiet") tone = "supportive";
  const bank = ORGANIC_COMMENT_PATTERNS[tone] || ORGANIC_COMMENT_PATTERNS.supportive;
  const pattern = bank[(postIndex * 7 + commentIndex * 2 + mood.length) % bank.length];
  let text = pattern(context);

  const naturalTags = [
    "Not trying to sound wise, just reacting honestly.",
    "That is the sort of thing people pretend does not count, but it does.",
    "I would probably overthink this too, unfortunately.",
    "The messy version of this is more believable than a perfect lesson.",
    "This comment section might not fix it, but at least it is not only in your head now.",
    "I hope you do not turn this into a reason to hate yourself.",
    "Also, people underestimate how much one tiny moment can change the whole day.",
    "Take the useful part of this reply and ignore the rest if it does not fit.",
    "You sound human here, not broken.",
    "I do not know you, but I can picture this too clearly.",
  ];
  if ((postIndex + commentIndex) % 4 === 0) {
    text += ` ${naturalTags[(postIndex + commentIndex) % naturalTags.length]}`;
  }
  return addCommentTexture(text, mood, category, postIndex, commentIndex, context);
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
  const seen = new Map();
  const seenPosts = new Map();
  const seenComments = new Map();

  function remember(kind, rawText, label) {
    const text = String(rawText || "");
    const key = normalizeText(text);
    if (!key) throw new Error(`Empty ${kind} found at ${label}`);
    if (kind === "comment" && text.trim().length < 12) {
      throw new Error(`Comment is too short at ${label}: ${text}`);
    }
    if (seen.has(key)) {
      throw new Error(`Duplicate text found between seed entries. First: ${seen.get(key)} | Again: ${label} | Text: ${text}`);
    }
    seen.set(key, label);
    if (kind === "post") seenPosts.set(key, true);
    if (kind === "comment") seenComments.set(key, true);
  }

  confessions.forEach((confession, postIndex) => {
    remember("post", confession.message, `post ${postIndex + 1} mood=${confession.mood}`);
    if (!Array.isArray(confession.comments) || confession.comments.length < 5) {
      throw new Error(`Post ${postIndex + 1} has fewer than 5 comments.`);
    }
    const localComments = new Set();
    confession.comments.forEach((comment, commentIndex) => {
      const key = normalizeText(comment.text);
      if (localComments.has(key)) {
        throw new Error(`Duplicate comment inside one post at post ${postIndex + 1}: ${comment.text}`);
      }
      localComments.add(key);
      remember("comment", comment.text, `post ${postIndex + 1} comment ${commentIndex + 1} mood=${confession.mood}`);
    });
  });

  return { postCount: seenPosts.size, commentCount: seenComments.size, totalUniqueTexts: seen.size };
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
    console.log("Starter content v4 complete.");
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
