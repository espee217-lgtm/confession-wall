/*
  Confession Wall starter community seeder
  ------------------------------------------------------------
  Creates fictional anonymous starter users, confessions, comments,
  reactions, comfort cards, and equipped shop cosmetics.

  Run from server folder:
    node scripts/seedStarterContent.js

  Reset/reseed only starter data:
    node scripts/seedStarterContent.js --reset

  Preview counts without writing:
    node scripts/seedStarterContent.js --dry-run

  Add/update avatars for existing seed users without reseeding:
    node scripts/seedStarterContent.js --refresh-avatars

  Notes:
  - This script creates fictional starter/community prompt content only.
  - It marks all starter users/content internally with isSeedUser/isSeedContent.
  - It does not touch real users or real posts unless you run --reset, which only
    removes documents previously marked as starter seed data.
*/

const path = require("path");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const User = require("../models/User");
const Confession = require("../models/Confession");

const args = new Set(process.argv.slice(2));
const SHOULD_RESET = args.has("--reset");
const DRY_RUN = args.has("--dry-run");
const FORCE = args.has("--force");
const REFRESH_AVATARS = args.has("--refresh-avatars");
const SEED_BATCH = "starter-community-v1";

const MOODS = [
  "Hopeful",
  "Heavy",
  "Angry",
  "Lonely",
  "Love",
  "Regret",
  "Funny",
  "Grateful",
  "Lost",
  "Healing",
];


const SEED_AVATAR_PATHS = Array.from({ length: 90 }, (_, index) =>
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

const COMMENT_BANK = [
  "This felt weirdly specific in the most human way.",
  "I hope you give yourself a little credit for even saying it out loud.",
  "The way you wrote this made me pause for a second.",
  "Been there. Not exactly the same, but close enough that it stung.",
  "Small steps still count, even when nobody claps for them.",
  "You are not wrong for feeling tired by this.",
  "That last line hit harder than expected.",
  "I like how honest this is without trying to sound perfect.",
  "Some days surviving quietly is the whole achievement.",
  "I hope tomorrow is softer on you.",
  "This sounds like something a lot of people feel but never type.",
  "No advice, just leaving a little lantern here.",
  "I needed to read this too, honestly.",
  "There is a lot of self-awareness in this. That matters.",
  "The messy middle is still part of healing.",
  "I get why this would stay in your chest for a while.",
  "You explained it in a way that felt really real.",
  "The fact that you care this much says something good about you.",
  "I hope you find one person who makes this easier to carry.",
  "This is the kind of confession that makes the wall feel alive.",
  "Not every feeling needs a solution immediately. Sometimes it just needs air.",
  "That sounds exhausting. I am glad you let it out here.",
  "The quiet parts of life can be the heaviest, no lie.",
  "I respect how gentle you are being with a painful thing.",
  "This made me want to check on my own people.",
  "You are allowed to be proud of a tiny win.",
  "I laughed a little and then got sad. Very unfair combination.",
  "This is painfully relatable.",
  "The honesty here is brave in a low-key way.",
  "I hope you keep choosing yourself, even awkwardly.",
  "Sometimes the best closure is no longer explaining yourself.",
  "You are not dramatic. You are describing something that hurt.",
  "Sending a quiet leaf of support.",
  "This is exactly why anonymous spaces can help sometimes.",
  "I do not know you, but I am rooting for you.",
  "That tiny hope at the end mattered.",
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
];

const CONFESSION_TEMPLATES = {
  budding: {
    Hopeful: [
      "I am trying this new thing where I stop pretending that every small improvement has to become a whole transformation. Yesterday I drank water, replied to two messages, and washed the cup that had been sitting near my bed like a tiny monument to avoidance. It was not a movie moment. No music played. I still felt messy. But for the first time in a while, I did not hate myself for being behind. I just thought, okay, maybe this is how I come back: one quiet task at a time.",
      "I keep thinking about how plants do not apologize for growing slowly. I know that sounds like something from a motivational poster, but today it actually helped me. I have been comparing my life to people who seem to be sprinting while I am still tying my shoes. But maybe I am not late. Maybe I am just growing in a season nobody else can see yet.",
    ],
    Heavy: [
      "I have been carrying a strange tiredness that sleep does not fix. I still laugh at jokes, still answer when people call my name, still do the normal things. But somewhere underneath all of that, I feel like I am walking through wet soil. I do not need anyone to solve it tonight. I just wanted to put the truth somewhere outside my body for a minute.",
      "Some days I feel like I am doing life in low battery mode. I can technically function, but every small thing asks for more energy than it should. I hate how invisible that is. People see you standing, so they assume you are fine. They do not see the part of you that is sitting down inside.",
    ],
    Angry: [
      "I am not even angry in a loud way. I am angry in the quiet way where I remember every time I made room for someone who would not even move a chair for me. I keep telling myself to be mature, but sometimes maturity feels like swallowing the same bitter thing again and again while everyone praises you for not making a face.",
      "I hate when people act confused by distance they created. They ignore you, dismiss you, make you feel small, and then one day they ask why the vibe changed. The vibe changed because I finally believed your actions over your apologies.",
    ],
    Lonely: [
      "I miss having someone I could message for no reason. Not for advice, not for an emergency, not because something big happened. Just a person who would understand a random photo of the sky or a stupid thought at 1 a.m. I think that kind of casual closeness is what I miss the most.",
      "The loneliest part is not having nobody. It is having people around but still editing every sentence before you speak. I want one place where I do not have to make my feelings presentable first.",
    ],
    Love: [
      "I think I like someone, but I am trying so hard not to turn it into a whole imaginary future. It is embarrassing how one small message can change my mood for hours. I keep acting normal, but inside I am a badly managed festival of hope and fear.",
      "There is someone whose name makes my day pause for half a second. I do not know if it is love or just the relief of being seen gently. Either way, I am trying not to ruin it by holding it too tightly.",
    ],
    Regret: [
      "I regret how long I stayed quiet when something bothered me. At the time, silence felt safer than conflict. Now I realize silence was still a choice, and it slowly taught people that my comfort was negotiable. I am trying to forgive myself for not knowing better sooner.",
      "I keep replaying a conversation where I laughed instead of saying I was hurt. I wanted to seem chill. I wanted to be easy to love. But now I think being easy to love should not require becoming hard to myself.",
    ],
    Funny: [
      "My toxic trait is opening a productivity video, feeling inspired for eight minutes, then rewarding myself for the inspiration by doing absolutely nothing. At this point my plans have plans, and even those plans are tired of me.",
      "I cleaned one corner of my room and immediately started acting like I had rebuilt my entire life from ashes. If anyone needs me, I will be accepting awards near the laundry pile I refused to look at.",
    ],
    Grateful: [
      "Today someone remembered a tiny thing I said weeks ago. It was not huge, but it stayed with me. Being remembered gently can feel like a blanket. I think I am grateful for people who make you feel like your small details are not wasted.",
      "I am grateful for the friend who does not demand a perfect explanation. Sometimes they just say, 'come sit,' and somehow that is enough. I hope everyone gets at least one person like that.",
    ],
    Lost: [
      "I do not know what I am becoming yet. Some days that scares me. Other days it almost feels like freedom. I am in that strange space where the old version of me does not fit, but the new one has not arrived with instructions.",
      "I keep waiting for a clear sign about what I should do next. But life keeps giving me fog instead of arrows. Maybe I have to learn how to move carefully without being completely sure.",
    ],
    Healing: [
      "Healing is less graceful than I imagined. I thought it would feel like peace. Mostly it feels like noticing the same wound sooner, choosing a different reaction, then being tired from the effort. Still, I think something in me is slowly unclenching.",
      "I deleted a message I wanted to send just to prove I still mattered. It felt small and huge at the same time. Maybe healing is when you stop knocking on doors that only open when they are bored.",
    ],
  },
  grove: {
    Hopeful: [
      "I finally felt a little proud of myself today. Not the loud kind of proud, just the quiet kind where you realize you did not give up on yourself completely. I finished something I had been avoiding, stepped outside for air, and let myself believe that maybe I am not as stuck as I keep saying I am.",
      "Something shifted this week. Nothing dramatic happened, but I caught myself planning for next month instead of just surviving today. That tiny future-thinking felt like a green shoot coming through cracked ground.",
    ],
    Heavy: [
      "I had a hard conversation and did not collapse afterward. I cried, yes, and my hands shook, but I said what I needed to say. I am putting this here because sometimes growth looks like speaking with a trembling voice and not taking it back.",
      "I admitted to someone that I have not been okay. They did not fix it, but they stayed. I forgot how much it matters when someone does not run from your heavier truths.",
    ],
    Angry: [
      "I set a boundary today and the world did not end. The person was annoyed, obviously, because people who benefited from your silence rarely celebrate your voice. But I feel lighter. Angry, still, but lighter.",
      "For once I did not over-explain my no. I just said no. It felt rude for about five seconds and then it felt like breathing.",
    ],
    Lonely: [
      "I went for a walk alone and somehow did not feel lonely the whole time. I noticed flowers growing through a fence, a dog carrying a stick like treasure, and an old couple arguing about vegetables. Maybe being alone is not always the same as being abandoned.",
      "I made peace with spending the evening by myself. Cooked something simple, played music, and let the room be quiet without treating it like a punishment. That felt new.",
    ],
    Love: [
      "Someone was kind to me in a way that did not ask for anything back. I am trying to let that be enough without immediately searching for the catch. Maybe love, in its smallest form, is feeling safe enough to not perform.",
      "I told a friend I loved them today. Not dramatically, not because anything happened, just because it was true. They said it back like it was the easiest thing in the world. I am still smiling about it.",
    ],
    Regret: [
      "I apologized without making it about my guilt. That was harder than I expected. I wanted to explain, defend, soften the edges. Instead I listened. I cannot undo the mistake, but I can become someone who does not hide from repair.",
      "I used to think regret was useless. Now I think it can be a map if you do not let it become a home. Today I chose one small thing differently because of what I learned the hard way.",
    ],
    Funny: [
      "I accidentally motivated myself by pretending I was a background character in a cozy forest game. I made tea, folded clothes, and watered a plant like I was earning domestic side-quest points. Honestly? It worked.",
      "I survived a family function by becoming emotionally unavailable to everyone except the snack table. The snack table understood me. The snack table did not ask about my future plans.",
    ],
    Grateful: [
      "I am grateful for ordinary mornings that do not demand anything dramatic from me. Tea, sunlight on the floor, one message from a friend, and the feeling that maybe peace is not always a huge achievement. Sometimes it is just a small hour that does not hurt.",
      "Today I realized I have people who would notice if I disappeared from a room. That sounds simple, but for someone who spent years feeling replaceable, it means more than I can explain.",
    ],
    Lost: [
      "I still do not know where I am going, but I no longer feel like I have to punish myself for being unsure. I am allowed to take the next honest step without pretending I can see the whole road.",
      "I asked for help today. Not in a polished way. More like, 'I do not know what I am doing, can you sit with me while I figure out the first piece?' It was humbling and also a relief.",
    ],
    Healing: [
      "I noticed an old trigger and chose not to follow it all the way down. That sounds invisible, but it felt like winning a private battle. Nobody saw it, so I am leaving it here like a small flag in the soil.",
      "I am slowly becoming someone I would have felt safe with when I was younger. That thought made me cry, but in a good way. Maybe that is healing too.",
    ],
  },
  scorched: {
    Hopeful: [
      "The hopeful part of me is annoying because it keeps surviving things that should have killed it. I wanted to be colder by now. Instead, some tiny stupid light in me still believes I can have a softer life. I am mad at it, but I am also following it.",
      "I got tired of waiting for an apology that probably is not coming. That sounds sad, but strangely it gave me hope. If closure is not arriving from them, maybe I can build my own door and walk out.",
    ],
    Heavy: [
      "I hate how some people can bruise your trust and still sleep normally. Meanwhile you are stuck becoming a detective of your own pain, replaying tone, timing, and tiny details. I know I will move on eventually, but today I am letting myself admit that it was heavy.",
      "There is a kind of hurt that makes you feel stupid for ever being soft. I do not want to become cruel, but I understand now how people start building walls and calling them standards.",
    ],
    Angry: [
      "I am angry that I had to become 'strong' because other people were careless with me. Everyone praises resilience like it is a crown, but sometimes resilience is just what happens when nobody comes to help and you still have to wake up tomorrow.",
      "People love your forgiveness when it benefits them. The second forgiveness comes with distance, suddenly you are cold, dramatic, changed. Yes, I changed. That was the whole point of surviving it.",
    ],
    Lonely: [
      "The worst loneliness is after you stop explaining. Not because there is nothing to say, but because you finally understand the listener was never really listening. That silence feels scorched. Clean, maybe, but scorched.",
      "I keep thinking about how many people liked the version of me that needed less. The moment I became a person with limits, the room got emptier. I am trying to see that as information instead of rejection.",
    ],
    Love: [
      "I loved someone who treated my patience like a resource they could spend forever. I do not hate them exactly. I hate the version of me that kept finding poetry in their minimum effort. That version deserved better metaphors.",
      "Missing someone does not mean they were good for you. I know that. I know it with my brain, my friends know it, even my blocked list knows it. But some evenings my heart acts like it did not attend the meeting.",
    ],
    Regret: [
      "I regret giving unlimited chances to someone who used every chance to learn how much they could get away with. That sentence makes me feel embarrassed, but also awake. Never again will I confuse endurance with love.",
      "I regret apologizing just to end the discomfort. I was not sorry. I was scared of being disliked. There is a difference, and I am finally old enough emotionally to notice it.",
    ],
    Funny: [
      "My villain origin story is people saying 'just communicate' after I communicated in five fonts, three emotional formats, and one long paragraph they replied to with 'damn.' At this point I should invoice for the labor.",
      "I have reached the stage of healing where I no longer stalk their profile, but I absolutely do judge their new captions if they appear by accident. Growth is not perfection. Growth is restraint with commentary.",
    ],
    Grateful: [
      "I am weirdly grateful for the people who disappointed me clearly. It hurt, but at least the fog lifted. Confusion can keep you trapped longer than cruelty. Clarity burns, but it also lights the exit.",
      "I am grateful I did not become what hurt me. I became sharper, yes, but not rotten. That feels like something worth protecting.",
    ],
    Lost: [
      "After everything ended, I did not just lose them. I lost the version of my future that had quietly arranged itself around them. Now I am standing in the ashes trying to figure out which parts were mine to begin with.",
      "I do not know who I am when I am not trying to be chosen. That is a terrifying confession. But maybe terrifying truths are still better than comfortable lies.",
    ],
    Healing: [
      "I am learning that peace can feel boring after chaos. My nervous system keeps looking for proof that something is wrong. But nothing is wrong tonight. Nobody is yelling, nobody is vanishing, nobody is testing me. It is just quiet. I am trying to let quiet be safe.",
      "Today I did not answer the message that would have pulled me back into the same old fire. I stared at it for a while, felt the old panic, then put my phone down. It was not easy. But the roots stayed unburned this time.",
    ],
  },
  general: {
    Hopeful: [
      "I like the idea that nobody really knows what they are doing at first. Some people just panic more aesthetically. I am trying to be less ashamed of learning in public, failing quietly, and beginning again without making an announcement.",
      "I saw a tiny plant growing out of a crack in the pavement today and it felt embarrassingly personal. I have also been growing in places that were not built for me. Maybe that still counts.",
    ],
    Heavy: [
      "There are days when every notification feels like a responsibility and every silence feels like a verdict. I know that is not logical, but feelings rarely wait for logic to finish speaking. I am just tired of being reachable while feeling unreachable.",
      "I wish people understood that being quiet is not always peace. Sometimes quiet is just what happens when explaining yourself has become more exhausting than being misunderstood.",
    ],
    Angry: [
      "I am tired of being expected to stay graceful when other people are careless. Sometimes I do not want to be the bigger person. Sometimes I want the same energy returned with interest. I probably will not do it, but admitting it feels good.",
      "The phrase 'do not take it personally' is funny because the thing was delivered directly to my emotional doorstep with my name on it. Where exactly should I take it? The post office?",
    ],
    Lonely: [
      "I have friends, but I miss being known in an easy way. The kind where someone can tell from one sentence that you are not okay. I miss not having to submit evidence for my own sadness.",
      "Sometimes I open apps just to feel near people, then close them because everyone seems too far away inside the screen. It is a strange modern loneliness: crowded, bright, and still empty.",
    ],
    Love: [
      "I do not know if I miss the person or the version of myself that believed so easily around them. Maybe both. Love is confusing because even after it hurts you, it leaves behind rooms in your mind with good lighting.",
      "I think love should feel like having somewhere to rest, not like constantly auditioning for a role you already got. I am writing that here so I remember it when someone charming makes me forget.",
    ],
    Regret: [
      "I regret not taking more photos of ordinary days. Not for social media, just for memory. The tea cups, bad hair, half-clean rooms, people laughing mid-sentence. You think ordinary things will stay available forever. They do not.",
      "I regret how often I made myself smaller to avoid making a moment awkward. The moment passed anyway. The smallness stayed longer.",
    ],
    Funny: [
      "I keep making to-do lists with the confidence of a person who has never met me. Morning me is a CEO. Afternoon me is a confused intern. Night me is HR investigating what went wrong.",
      "I bought a notebook to organize my life and immediately used the first page to write 'start using this notebook properly.' This is either self-awareness or a cry for help from stationery.",
    ],
    Grateful: [
      "I am grateful for people who reply with warmth instead of performance. No perfect advice, no lecture, no turning your pain into their stage. Just a simple, 'I am here.' That is rare and holy in a very normal way.",
      "Today I am grateful for food that tasted good, a message that came at the right time, and the fact that I did not say the mean thing I almost said. Growth sometimes has very unglamorous receipts.",
    ],
    Lost: [
      "I am in a chapter where everything feels like a draft. My plans, my personality, my future, even the way I answer 'how are you?' Nothing feels final. Maybe that is okay. Drafts are still proof that something is being written.",
      "I keep waiting to feel like an adult, but mostly I feel like three unfinished versions of myself wearing one hoodie. Maybe everyone is improvising and some people just have better shoes.",
    ],
    Healing: [
      "I am trying to stop confusing peace with boredom. After years of stress, calm can feel suspicious. But maybe the absence of chaos is not a warning. Maybe it is a room I am allowed to sit in.",
      "I caught myself being kinder to my past self today. Not fully, not perfectly, but for one second I thought, you were doing your best with the tools you had. That one second felt like a door opening.",
    ],
  },
};

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(array) {
  return array[rand(0, array.length - 1)];
}

function sample(array, count, excludeIds = new Set()) {
  const filtered = array.filter((item) => !excludeIds.has(String(item._id || item)));
  const shuffled = filtered.slice().sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

function uniqueIds(users) {
  return users.map((user) => user._id);
}

function daysAgo(days, hourOffset = 0) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(rand(7, 23), rand(0, 59), rand(0, 59), 0);
  if (hourOffset) date.setHours(date.getHours() + hourOffset);
  return date;
}

function randomCosmeticLoadout(index) {
  const frame = COSMETICS.frames[index % COSMETICS.frames.length];
  const badge = COSMETICS.badges[(index * 2) % COSMETICS.badges.length];
  const title = COSMETICS.titles[(index * 3) % COSMETICS.titles.length];
  const postTheme = COSMETICS.postThemes[(index * 5) % COSMETICS.postThemes.length];
  const extraItems = sample(
    [
      ...COSMETICS.frames,
      ...COSMETICS.badges,
      ...COSMETICS.titles,
      ...COSMETICS.postThemes,
    ].map((itemId) => ({ itemId })),
    rand(2, 5)
  ).map((item) => item.itemId);

  const allOwned = Array.from(new Set([frame, badge, title, postTheme, ...extraItems]));

  return {
    ownedCosmetics: allOwned.map((itemId) => ({
      itemId,
      purchasedAt: daysAgo(rand(2, 30)),
    })),
    equippedCosmetics: {
      badge,
      frame,
      title,
      postTheme,
      reactionStyle: "",
      visualEffect: "",
    },
  };
}

function buildPostReactions(category, author, users) {
  const exclude = new Set([String(author._id)]);
  let waterCount;
  let burnCount;

  if (category === "budding") {
    waterCount = rand(5, 24);
    burnCount = waterCount;
  } else if (category === "grove") {
    waterCount = rand(22, 40);
    burnCount = rand(1, Math.min(14, waterCount - 5));
  } else if (category === "scorched") {
    burnCount = rand(22, 40);
    waterCount = rand(1, Math.min(14, burnCount - 5));
  } else {
    waterCount = rand(8, 40);
    burnCount = rand(5, 35);
    if (Math.abs(waterCount - burnCount) < 3) burnCount = Math.max(5, burnCount - 4);
  }

  const wateredUsers = sample(users, waterCount, exclude);
  const used = new Set([...exclude, ...wateredUsers.map((u) => String(u._id))]);
  const burnedUsers = sample(users, burnCount, used);

  return {
    wateredBy: uniqueIds(wateredUsers),
    burnedBy: uniqueIds(burnedUsers),
  };
}

function buildComments(postIndex, postDate, users, author) {
  const count = rand(4, 7);
  const commenters = sample(users, count, new Set([String(author._id)]));
  const boostedIndexes = new Set(sample([...Array(count).keys()], rand(1, 2)).map((n) => n));

  return commenters.map((commenter, i) => {
    const isBoosted = boostedIndexes.has(i);
    const waterCount = isBoosted ? rand(20, 30) : rand(0, 8);
    const burnCount = isBoosted ? rand(0, 4) : rand(0, 3);
    const wateredUsers = sample(users, waterCount, new Set([String(commenter._id)]));
    const used = new Set([String(commenter._id), ...wateredUsers.map((u) => String(u._id))]);
    const burnedUsers = sample(users, burnCount, used);

    return {
      userId: commenter._id,
      text: pick(COMMENT_BANK),
      image: null,
      wateredBy: uniqueIds(wateredUsers),
      burnedBy: uniqueIds(burnedUsers),
      replies: [],
      isHidden: false,
      hiddenReason: "",
      hiddenBy: null,
      hiddenAt: null,
      createdAt: new Date(postDate.getTime() + (i + 1) * rand(18, 95) * 60 * 1000),
    };
  });
}

function buildComfortCards(users, author) {
  const cards = sample(COMFORT_TEXTS, rand(2, 4)).map((text) => {
    const senders = sample(users, rand(2, 9), new Set([String(author._id)]));
    return {
      text,
      count: senders.length,
      sentBy: uniqueIds(senders),
    };
  });

  return cards;
}

function confessionMessage(category, mood, variant) {
  const options = CONFESSION_TEMPLATES[category][mood];
  return options[variant % options.length];
}

async function resetSeedData() {
  const deleteConfessions = await Confession.deleteMany({ isSeedContent: true });
  const deleteUsers = await User.deleteMany({ isSeedUser: true });

  console.log(`Reset starter confessions: ${deleteConfessions.deletedCount}`);
  console.log(`Reset starter users: ${deleteUsers.deletedCount}`);
}

async function createSeedUsers() {
  const passwordHash = await bcrypt.hash(`starter-${Date.now()}-${Math.random()}`, 10);

  const users = SEED_PERSONAS.map(([username, persona], index) => {
    const cosmetics = randomCosmeticLoadout(index);

    return {
      username,
      email: `${username}@seed.confession-wall.local`,
      password: passwordHash,
      profilePicture: seedAvatarPath(index),
      bio: persona,
      isAdmin: false,
      role: "user",
      isSeedUser: true,
      seedPersona: persona,
      seeds: rand(75, 900),
      showSeedsOnProfile: rand(0, 1) === 1,
      ownedCosmetics: cosmetics.ownedCosmetics,
      equippedCosmetics: cosmetics.equippedCosmetics,
      dailyStreak: {
        current: rand(0, 12),
        best: rand(2, 28),
        lastVisitDateKey: "",
      },
      createdAt: daysAgo(rand(15, 60)),
      updatedAt: daysAgo(rand(0, 14)),
    };
  });

  return User.insertMany(users, { ordered: false });
}

function buildConfessions(users) {
  const categories = ["budding", "grove", "scorched", "general"];
  const confessions = [];
  let globalIndex = 0;

  categories.forEach((category, categoryIndex) => {
    for (let i = 0; i < 20; i += 1) {
      const mood = MOODS[i % MOODS.length];
      const variant = Math.floor(i / MOODS.length);
      const author = users[(globalIndex * 7 + categoryIndex * 3) % users.length];
      const createdAt = daysAgo(rand(0, 12), -i);
      const reactions = buildPostReactions(category, author, users);
      const comments = buildComments(globalIndex, createdAt, users, author);
      const postTheme = author.equippedCosmetics?.postTheme || pick(COSMETICS.postThemes);

      confessions.push({
        userId: author._id,
        message: confessionMessage(category, mood, variant),
        image: null,
        images: [],
        mood,
        isSeedContent: true,
        seedCategory: category,
        seedBatch: SEED_BATCH,
        postTheme,
        contentWarning: {
          enabled: ["Heavy", "Regret", "Lost", "Angry"].includes(mood),
          category: ["Heavy", "Lost"].includes(mood)
            ? "Heavy / Sensitive"
            : mood === "Regret"
              ? "Self-reflection"
              : mood === "Angry"
                ? "Vent"
                : "",
          note: "Fictional starter confession with emotional themes.",
          sensitive: ["Heavy", "Regret", "Lost", "Angry"].includes(mood),
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
  });

  return confessions;
}

async function refreshSeedUserAvatars() {
  const users = await User.find({ isSeedUser: true }).sort({ createdAt: 1, username: 1 });

  if (!users.length) {
    console.log("No seed users found. Run the seed script first, or run with --reset to recreate starter users.");
    return;
  }

  const operations = users.map((user, index) => ({
    updateOne: {
      filter: { _id: user._id },
      update: {
        $set: {
          profilePicture: seedAvatarPath(index),
          updatedAt: new Date(),
        },
      },
    },
  }));

  const result = await User.bulkWrite(operations);
  console.log(`Refreshed seed user avatars: ${result.modifiedCount || operations.length}`);
  console.log(`Avatar pool available: ${SEED_AVATAR_PATHS.length}`);
}

async function main() {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    console.error("Missing MONGO_URI in server/.env");
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  console.log("Connected to MongoDB.");

  if (REFRESH_AVATARS) {
    await refreshSeedUserAvatars();
    await mongoose.disconnect();
    return;
  }

  if (DRY_RUN) {
    console.log("Dry run: would create 90 fictional seed users and 80 starter confessions.");
    console.log(`Avatar pool available: ${SEED_AVATAR_PATHS.length}`);
    await mongoose.disconnect();
    return;
  }

  if (SHOULD_RESET) {
    await resetSeedData();
  }

  const existingSeedUsers = await User.countDocuments({ isSeedUser: true });
  const existingSeedConfessions = await Confession.countDocuments({ isSeedContent: true });

  if ((existingSeedUsers > 0 || existingSeedConfessions > 0) && !FORCE && !SHOULD_RESET) {
    console.log("Starter community content already exists.");
    console.log(`Seed users: ${existingSeedUsers}`);
    console.log(`Seed confessions: ${existingSeedConfessions}`);
    console.log("Use --reset to remove and recreate starter content, or --force to add another batch.");
    await mongoose.disconnect();
    return;
  }

  const users = await createSeedUsers();
  const confessions = buildConfessions(users);
  await Confession.insertMany(confessions, { ordered: false });

  const counts = confessions.reduce((acc, confession) => {
    acc[confession.seedCategory] = (acc[confession.seedCategory] || 0) + 1;
    return acc;
  }, {});

  console.log("Starter community seed complete.");
  console.log(`Created fictional seed users: ${users.length}`);
  console.log(`Assigned profile avatars from pool: ${SEED_AVATAR_PATHS.length}`);
  console.log(`Created starter confessions: ${confessions.length}`);
  console.log("By category:", counts);
  console.log("All starter users/content are marked with isSeedUser/isSeedContent for cleanup.");

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error("Seed starter content failed:", err);
  try {
    await mongoose.disconnect();
  } catch (_) {}
  process.exit(1);
});
