/*
  Confession Wall richer starter community seeder
  ------------------------------------------------------------
  Creates fictional anonymous starter users, original confessions,
  unique comments, reactions, comfort cards, avatars, and cosmetics.

  Run from server folder:
    node scripts/seedStarterContent.js

  Replace current starter seed content only:
    node scripts/seedStarterContent.js --reset

  Preview counts without writing:
    node scripts/seedStarterContent.js --dry-run

  Refresh avatars for existing seed users:
    node scripts/seedStarterContent.js --refresh-avatars

  Notes:
  - All content is fictional/original starter content.
  - All starter users/content are internally marked for safe cleanup.
  - --reset deletes only documents marked isSeedUser/isSeedContent.
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
const SEED_BATCH = "starter-community-v2-organic-200";

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

const POSTS_PER_MOOD = 20;
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
];

const STORY_SEEDS = {
  Hopeful: [
    ["cleaned one corner of my room", "the mug by my bed", "opening the window before noon", "maybe I am not broken, just backed up"],
    ["sent a job application I was scared of", "the submit button", "a tiny cup of tea after", "trying counts even before winning"],
    ["walked outside after avoiding sunlight", "a stray dog at the gate", "buying one guava from a cart", "outside did not judge me"],
    ["answered a message I had ignored", "three typing dots", "a normal reply back", "not every delay ruins everything"],
    ["started studying again after weeks", "one page of notes", "a pen that barely worked", "momentum can be embarrassingly small"],
    ["went to sleep without doom-scrolling", "phone face down", "the fan making old-house noises", "rest can be a decision"],
    ["cooked a real meal for myself", "too much salt", "steam on my glasses", "care still counts when it is clumsy"],
    ["deleted an old chat shortcut", "my thumb looking for it", "the empty space on the screen", "absence can become freedom slowly"],
    ["made a plan for next month", "a scratched notebook", "rent, groceries, one dream", "future me deserves a vote"],
    ["told someone I need time", "a calm no", "my heartbeat being dramatic", "boundaries did not destroy me"],
    ["wore the clothes I was saving", "a green shirt", "no special occasion", "being alive is enough occasion sometimes"],
    ["opened my old sketchbook", "bad drawings", "one decent leaf", "I can begin badly and still begin"],
    ["drank water before coffee", "a steel glass", "the smallest responsible choice", "I am learning to parent myself gently"],
    ["cleaned my email inbox", "hundreds of unread things", "one folder named later", "chaos can be negotiated"],
    ["talked to my sibling without snapping", "a silly meme", "a normal laugh", "peace can return in tiny pieces"],
    ["went to therapy search page but did not book", "the open tab", "a list of names", "even looking is movement"],
    ["stopped comparing my timeline", "someone's engagement post", "my own quiet evening", "their joy is not proof of my failure"],
    ["saved a little money", "coins in a drawer", "not much, but mine", "small safety still feels like safety"],
    ["prayed for myself without bargaining", "folded hands", "no dramatic promise", "I asked softly and that felt enough"],
    ["made my bed for no reason", "crooked blanket", "pillow dent", "I wanted one place to look cared for"],
  ],
  Heavy: [
    ["felt tired in a way sleep does not touch", "the bus window", "my reflection looking older", "I am functioning but not feeling held"],
    ["smiled through a family call", "the question about my future", "my throat going tight", "being polite can cost too much"],
    ["sat in the bathroom longer than needed", "cold tiles", "someone knocking once", "privacy became my only quiet room"],
    ["kept working while my chest felt loud", "a spreadsheet", "one blinking cursor", "people only notice collapse, not the before"],
    ["watched everyone make plans without me", "the group chat", "heart reactions piling up", "I felt like furniture in my own life"],
    ["missed someone who hurt me", "an old photo", "my brain defending them", "grief does not check if they deserve it"],
    ["could not explain why I was sad", "a half-written note", "too many reasons and none", "language gave up before I did"],
    ["felt invisible in a crowded room", "birthday lights", "people laughing near me", "loneliness can be loud"],
    ["heard a song and suddenly folded", "the second verse", "a memory I did not invite", "some days the past has good aim"],
    ["kept saying I am fine", "dry lips", "automatic smile", "fine has become a password"],
    ["felt guilty for resting", "an afternoon nap", "unfinished tasks", "my body asked nicely and I still judged it"],
    ["held back tears in public", "a shop mirror", "one cashier being kind", "kindness is dangerous when you are already full"],
    ["got bad news and went silent", "a plain message", "the room changing shape", "some words split the day in two"],
    ["felt like I am behind everyone", "their announcements", "my quiet calendar", "comparison is a thief with good lighting"],
    ["wanted comfort but could not ask", "a contact name", "deleted text", "needing people feels risky"],
    ["woke up already exhausted", "morning light", "the same ceiling", "starting the day felt like continuing a war"],
    ["pretended noise did not bother me", "plates clanging", "too many voices", "my nerves felt skinless"],
    ["felt ashamed of needing help", "a form left incomplete", "my pride being useless", "survival should not be embarrassing"],
    ["realized nobody knows the full version", "different masks", "different rooms", "I am tired of being edited"],
    ["kept a whole breakdown scheduled for later", "public transport", "one hand gripping the bag", "sometimes control is just postponing tears"],
  ],
  Angry: [
    ["watched someone rewrite the story", "their innocent tone", "my name turned into blame", "calm people can still be lying"],
    ["got called sensitive again", "the little laugh after", "my jaw locking", "sensitive is what people say when truth inconveniences them"],
    ["realized I was the backup plan", "late replies", "sudden availability", "I am not an emergency charger for lonely people"],
    ["heard an apology with no change", "same words", "same behavior", "sorry is cheap when rent is due in actions"],
    ["saw them be kind to strangers", "public sweetness", "private cruelty", "performance kindness makes me furious"],
    ["got interrupted until I stopped talking", "half a sentence", "their louder opinion", "silence is not agreement"],
    ["was expected to forgive on schedule", "everyone saying move on", "nobody asking what it cost", "peace should not mean protecting the person who broke it"],
    ["found out they mocked me", "a screenshot", "my own words turned into a joke", "trust can die from secondhand laughter"],
    ["did all the work and got none of the credit", "a project file", "their name in the praise", "being useful is not the same as being valued"],
    ["was told to be mature", "my hands shaking", "their comfort prioritized", "maturity should not be a muzzle"],
    ["noticed my boundary annoyed them", "one-word reply", "cold air after", "people miss the version of you they could use"],
    ["got blamed for reacting", "the thing they started", "my voice finally rising", "the reaction became the crime"],
    ["saw favoritism again", "same rules, different person", "my stomach dropping", "unfairness is exhausting when it is polite"],
    ["was expected to understand everything", "their bad mood", "their excuses", "I am tired of being the emotional dustbin"],
    ["got a fake compliment", "teeth in the smile", "a sting after", "some sweetness is just poison with manners"],
    ["waited for them to notice", "the obvious hurt", "their comfortable blindness", "if you cared, I would not need subtitles"],
    ["had my privacy treated like drama", "a shared secret", "too many people knowing", "betrayal travels fast"],
    ["was compared to someone again", "their perfect example", "my patience thinning", "I am a person, not a failed copy"],
    ["got told to calm down", "after being cornered", "after being dismissed", "calm is easier when you are not the one bleeding"],
    ["finally stopped explaining", "their confusion", "my silence", "not every exit needs a speech"],
  ],
  Lonely: [
    ["missed having a no-reason person", "a photo of the sky", "nobody to send it to", "casual closeness is what I crave"],
    ["sat with people and still felt outside", "chairs in a circle", "inside jokes", "I was present but not included"],
    ["watched my phone stay quiet", "charging cable", "no notifications", "silence has a weight"],
    ["ate dinner alone again", "one plate", "too much rice", "the room too clean", "routine can become a witness"],
    ["realized I am always the one asking", "how are you texts", "empty return lane", "care should have traffic both ways"],
    ["wanted to call someone but chose not to", "contacts list", "thumb hovering", "I did not want to be a burden with a ringtone"],
    ["felt replaced in a group", "new nicknames", "old jokes without me", "friendship can fade without a funeral"],
    ["missed home while being at home", "familiar walls", "unfamiliar quiet", "places can change their meaning"],
    ["stood at a party like a loading screen", "music too loud", "smile too practiced", "I wanted to disappear politely"],
    ["saw best friends being best friends", "two people laughing", "my chest doing that pinch", "I am happy for them and sad for me"],
    ["kept my good news to myself", "a tiny achievement", "no one obvious to tell", "joy also needs somewhere to sit"],
    ["scrolled old chats", "messages from better days", "names that no longer fit", "memory is a cruel archive"],
    ["felt lonely after posting", "a story with views", "no replies", "being seen is not the same as being reached"],
    ["wanted someone to notice my mood", "short answers", "they did not ask", "maybe hints are unfair but directness scares me"],
    ["walked behind a group", "their shoulders close", "my steps separate", "sometimes distance is only two feet"],
    ["missed a version of myself", "old photos", "bigger smile", "I want to meet that person again"],
    ["had nobody to gossip with", "a ridiculous thing happened", "the joke died inside me", "small laughter needs company"],
    ["kept refreshing messages", "blue light", "same empty screen", "hope can become a habit"],
    ["felt like a temporary person", "people passing through", "no one staying", "I want to be someone's familiar place"],
    ["slept early to skip the evening", "lights off", "mind still awake", "night is harder when nobody expects you"],
  ],
  Love: [
    ["caught feelings from ordinary kindness", "they saved me a seat", "my heart acting foolish", "gentleness is dangerous"],
    ["miss someone I never dated", "almost messages", "almost plans", "almost can still bruise"],
    ["like someone and hate how obvious I am", "checking their reply", "pretending not to smile", "my face is not loyal"],
    ["received a voice note and replayed it", "background noise", "their laugh", "sound can become a place"],
    ["want love but fear being known", "soft attention", "old defenses", "intimacy feels like opening a locked room"],
    ["felt safe with a friend", "walking home", "quiet beside me", "maybe love is not always fireworks"],
    ["saw my parents being gentle once", "tea offered without asking", "a small smile", "love can be old and quiet"],
    ["still care about someone who left", "their birthday date", "my memory being stubborn", "care does not understand endings quickly"],
    ["got jealous and felt ashamed", "a tagged photo", "my stomach twist", "feelings are not always fair but they are honest"],
    ["wanted to confess but swallowed it", "the perfect moment", "my courage leaving", "some truths live under the tongue"],
    ["love my friend more than I say", "their tired face", "wanting to protect them", "friendship is not a lesser love"],
    ["was loved gently and panicked", "a patient message", "my urge to run", "kindness feels suspicious when you learned chaos first"],
    ["miss being someone's favorite notification", "old name popping up", "the rush gone", "attention can become a ghost"],
    ["made a playlist for someone", "songs I cannot send", "titles telling on me", "music is my cowardly confession"],
    ["want simple love", "shared food", "normal errands", "someone remembering how I take tea", "romance can be domestic"],
    ["felt loved by a small detail", "they noticed I was quiet", "no big speech", "attention is a language"],
    ["kept a secret crush too long", "years of almost", "different cities now", "some feelings expire unopened"],
    ["held back because timing is wrong", "right person maybe", "wrong season definitely", "love still needs a place to land"],
    ["got butterflies from a stupid joke", "terrible pun", "my laugh betraying me", "standards vanish when the heart votes"],
    ["chose myself over chemistry", "one last message", "a shaky block button", "love without peace is not home"],
  ],
  Regret: [
    ["did not reply when someone needed me", "their old message", "my excuse at the time", "delay became distance"],
    ["said something sharp to win", "their face after", "the victory tasting awful", "being right can still be ugly"],
    ["stayed quiet to keep peace", "a room full of tension", "my truth folded small", "silence charged interest"],
    ["left without explaining", "a half-goodbye", "years later", "avoidance is not kindness"],
    ["took my parents for granted", "missed calls", "ordinary concern", "love sounded annoying until it got rare"],
    ["wasted a year pretending", "fake goals", "fake confidence", "my own life waiting outside"],
    ["trusted the wrong person with a secret", "their smile", "my story traveling", "some doors should stay locked"],
    ["laughed at something that hurt someone", "group pressure", "their quietness", "cowardice can sound like laughter"],
    ["ignored my health too long", "small symptoms", "bigger fear", "denial is not medicine"],
    ["chose ego over apology", "drafted texts", "deleted everything", "pride is a lonely room"],
    ["let a friendship fade", "we both got busy", "I stopped trying", "not all losses are dramatic"],
    ["used someone as comfort", "not love", "just loneliness", "people are not blankets"],
    ["stayed where I was disrespected", "small insults", "big excuses", "I taught them my limits were imaginary"],
    ["spent money to feel less empty", "packages arriving", "same sadness", "new things cannot replace peace"],
    ["pretended not to care", "cool voice", "burning chest", "indifference was just fear in sunglasses"],
    ["missed one last visit", "I thought there was time", "there was not", "later is not a promise"],
    ["made fun of my own dream", "before anyone else could", "then stopped trying", "self-protection became self-sabotage"],
    ["kept choosing unavailable people", "the chase", "the crash", "familiar pain felt like proof"],
    ["did not defend myself", "the accusation", "my frozen body", "sometimes the comeback arrives years late"],
    ["forgot to be kind to younger me", "old mistakes", "old photos", "that person was surviving too"],
  ],
  Funny: [
    ["acted confident and walked into the wrong room", "everyone staring", "my fake purpose", "I invented a destination on the spot"],
    ["liked a very old post by accident", "the year on the caption", "my soul leaving", "I considered changing my identity"],
    ["waved back at someone waving behind me", "full enthusiasm", "zero recovery plan", "my hand betrayed the bloodline"],
    ["said you too to the waiter", "enjoy your meal", "my automatic mouth", "I hope they forgive me spiritually"],
    ["pretended to understand a song lyric", "everyone singing", "my invented language", "confidence carried the chorus"],
    ["sent a serious text with a typo", "I miss your soup instead of support", "no explanation helped", "autocorrect has enemies"],
    ["joined a gym and got humbled by stairs", "day two", "legs negotiating", "fitness is rude"],
    ["tried to cook fancy noodles", "smoke alarm", "one sad pan", "the recipe and I are no longer speaking"],
    ["forgot why I entered a room", "stood there like an NPC", "left with nothing", "quest failed successfully"],
    ["overdressed for a casual hangout", "everyone in slippers", "me looking like a side quest prince", "commitment was made"],
    ["laughed during a serious moment", "wrong timing", "panic laugh", "my body chose social destruction"],
    ["called my teacher mom once", "classroom silence", "instant regret", "I still remember the floor pattern"],
    ["ordered food while trying to save money", "discount code", "delivery fee", "financial logic left the chat"],
    ["typed a brave message and sent only okay", "paragraph deleted", "one tiny word", "communication champion"],
    ["tried meditation and planned my whole week", "eyes closed", "brain sprinting", "peace had network issues"],
    ["used a dramatic password hint", "forgot the password", "hint insulted me", "past me is toxic"],
    ["sang with headphones too loud", "neighbor eye contact", "no stage, only shame", "tour cancelled"],
    ["panicked at a compliment", "they said nice shirt", "I said congratulations", "why am I like this"],
    ["opened the fridge five times", "same contents", "new hope", "science remains unexplained"],
    ["made a to-do list and added make to-do list", "checked it off", "felt productive", "I fear I am unstoppable"],
  ],
  Grateful: [
    ["someone remembered my exam date", "one good luck message", "my chest warming", "being remembered gently matters"],
    ["my friend sent food without making it a big deal", "a simple parcel", "no lecture", "care can arrive quietly"],
    ["a stranger helped me with directions", "rain starting", "their patient explanation", "small kindness changed the whole day"],
    ["my sibling made me laugh", "stupid voice", "bad mood broken", "family can be annoying and saving at once"],
    ["had one peaceful morning", "sun on the floor", "tea cooling", "nothing urgent", "peace felt borrowed but real"],
    ["my plant grew a new leaf", "tiny green proof", "me checking twice", "life keeps making little arguments for staying"],
    ["someone listened without fixing", "no advice parade", "just presence", "being heard is its own medicine"],
    ["I found an old note from myself", "messy handwriting", "hope from a past version", "I accidentally comforted future me"],
    ["my mother saved my favorite piece", "a plate covered for me", "ordinary love", "some affection is served as food"],
    ["a teacher believed I could improve", "one sentence", "months ago", "their faith outlasted my confidence"],
    ["the rain slowed everything down", "wet roads", "soft air", "my mind quieter", "weather can be kind"],
    ["a friend did not judge my silence", "weeks without talking", "same warmth", "low-maintenance love is rare"],
    ["got paid for small work", "not a huge amount", "my own effort", "earning even little feels like spine"],
    ["laughed so hard my stomach hurt", "bad joke", "good people", "for five minutes I forgot the heavy stuff"],
    ["my body carried me through another day", "tired feet", "steady breath", "I complain but I am thankful"],
    ["someone asked if I reached home", "simple text", "late night", "care has tiny sentences"],
    ["I had clean bedsheets", "fresh smell", "small luxury", "comfort does not always need money"],
    ["my younger cousin hugged me", "sticky hands", "full trust", "love can be very unpolished"],
    ["a song found me at the right time", "one chorus", "goosebumps", "music is such a strange rescue"],
    ["I got another chance", "not dramatic", "just enough room", "I am grateful life did not close the door yet"],
  ],
  Lost: [
    ["do not know what career I actually want", "tabs open", "advice everywhere", "my own voice missing", "options can feel like fog"],
    ["feel like I outgrew my old self", "old habits", "new discomfort", "no manual", "change is awkward before it is clear"],
    ["keep waiting for a sign", "same ceiling", "same questions", "no lightning", "maybe I have to choose without certainty"],
    ["do not know where I belong", "different friend groups", "different versions of me", "none fully true", "identity feels rented"],
    ["feel behind but also tired of racing", "milestones", "announcements", "my own slow path", "speed is not direction"],
    ["left something and miss it anyway", "old routine", "new silence", "freedom can echo"],
    ["changed my mind again", "plans crossed out", "people asking why", "growth looks flaky from outside"],
    ["cannot tell if I need discipline or rest", "unfinished work", "heavy eyes", "guilt shouting", "self-knowledge is blurry"],
    ["feel like everyone got instructions except me", "adult tasks", "forms and fees", "fake confidence", "I am improvising a life"],
    ["lost interest in things I used to love", "dusty hobby", "quiet shelf", "no spark", "I miss wanting things"],
    ["am scared my dream is not mine", "other people's praise", "my private boredom", "approval can disguise a cage"],
    ["do not know if I am lonely or just changing", "fewer calls", "more quiet", "less tolerance", "maybe solitude is doing renovations"],
    ["feel stuck between leaving and staying", "packed thoughts", "unpacked room", "same view", "indecision has furniture"],
    ["cannot explain my mood", "not sad exactly", "not fine either", "weather inside", "language feels too simple"],
    ["started over and feel embarrassed", "beginner mistakes", "younger people ahead", "my pride sweating", "new paths make everyone a learner"],
    ["do not recognize my own goals", "old list", "new silence", "no excitement", "maybe wanting can expire"],
    ["feel spiritually offline", "prayers quiet", "mind noisy", "no clear answer", "faith also has buffering days"],
    ["want to disappear and restart", "not forever", "just elsewhere", "new name energy", "escape is tempting when clarity is absent"],
    ["am tired of explaining my confusion", "people want decisions", "I have fog", "fog is not laziness"],
    ["feel like a draft version", "half-built habits", "unfinished confidence", "loose edges", "maybe drafts are still real"],
  ],
  Healing: [
    ["did not check their profile today", "muscle memory", "one stopped thumb", "I chose peace for ten seconds"],
    ["cried and did not shame myself", "wet pillow", "quiet room", "no performance", "tears are not a failure"],
    ["said no without giving a courtroom speech", "two letters", "racing heart", "I survived the silence after"],
    ["noticed an old trigger early", "same tone", "old panic", "new pause", "awareness arrived before the spiral"],
    ["stopped apologizing for needing space", "one evening offline", "no dramatic exit", "rest is not betrayal"],
    ["forgave myself a little", "not fully", "just one corner", "maybe softness can start small"],
    ["cleaned up after a bad week", "laundry basket", "fresh water", "tiny order", "repair can be domestic"],
    ["talked about something I usually hide", "careful words", "someone staying", "truth did not make me unlovable"],
    ["blocked someone and felt guilty", "quiet screen", "shaky hands", "guilt does not always mean wrong"],
    ["let a good day be good", "no waiting for disaster", "ordinary sunlight", "joy deserves less suspicion"],
    ["returned to an old hobby", "rusty start", "small fun", "I am allowed to be bad at joy"],
    ["accepted that closure may not come", "no final talk", "no perfect answer", "I can still leave the room"],
    ["stopped arguing with an imagined version of them", "shower debates", "fake comebacks", "my peace needed the microphone back"],
    ["asked for reassurance directly", "awkward sentence", "honest need", "less guessing", "clarity felt kinder"],
    ["caught myself being kind to my body", "stretching slowly", "not insulting the mirror", "neutral is progress too"],
    ["let someone help me", "carrying one bag", "not proving toughness", "support did not make me smaller"],
    ["deleted old screenshots", "receipts of pain", "empty gallery", "I do not need a museum of hurt"],
    ["made peace with not being chosen", "their decision", "my dignity", "rejection is not a verdict"],
    ["slept after a hard conversation", "no overthinking marathon", "just tired", "my nervous system deserved mercy"],
    ["started again after relapsing into old habits", "same mistake", "less cruelty", "healing includes returning"],
  ],
};

const COMMENT_VOICES = [
  "relatable",
  "supportive",
  "gentle-advice",
  "short-reaction",
  "tiny-story",
  "soft-disagree",
  "warm-humor",
  "older-sibling",
  "quiet-witness",
];

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[rand(0, arr.length - 1)];
}

function sample(arr, count, excludeSet = new Set()) {
  const filtered = arr.filter((item) => !excludeSet.has(String(item._id || item)));
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

function categoryForMood(mood, index) {
  const pattern = {
    Hopeful: ["grove", "budding", "grove", "general"],
    Heavy: ["budding", "scorched", "budding", "general"],
    Angry: ["scorched", "scorched", "budding", "general"],
    Lonely: ["budding", "budding", "general", "scorched"],
    Love: ["grove", "budding", "general", "grove"],
    Regret: ["budding", "scorched", "general", "budding"],
    Funny: ["grove", "general", "budding", "grove"],
    Grateful: ["grove", "grove", "general", "budding"],
    Lost: ["budding", "general", "scorched", "budding"],
    Healing: ["grove", "budding", "grove", "general"],
  };
  return pattern[mood][index % pattern[mood].length];
}

function categoryWarning(mood) {
  if (["Heavy", "Lost"].includes(mood)) return "Heavy / Sensitive";
  if (["Regret", "Healing"].includes(mood)) return "Self-reflection";
  if (mood === "Angry") return "Vent";
  if (mood === "Love") return "Relationship";
  return "";
}

function randomCosmeticLoadout(index) {
  const frame = COSMETICS.frames[index % COSMETICS.frames.length];
  const badge = COSMETICS.badges[(index * 2) % COSMETICS.badges.length];
  const title = COSMETICS.titles[(index * 3) % COSMETICS.titles.length];
  const postTheme = COSMETICS.postThemes[(index * 5) % COSMETICS.postThemes.length];
  const extraItems = sample(
    [...COSMETICS.frames, ...COSMETICS.badges, ...COSMETICS.titles, ...COSMETICS.postThemes].map((itemId) => ({ itemId })),
    rand(3, 7)
  ).map((item) => item.itemId);

  const allOwned = Array.from(new Set([frame, badge, title, postTheme, ...extraItems]));

  return {
    ownedCosmetics: allOwned.map((itemId) => ({ itemId, purchasedAt: daysAgo(rand(2, 60)) })),
    equippedCosmetics: { badge, frame, title, postTheme, reactionStyle: "", visualEffect: "" },
  };
}

function makeStory(mood, index) {
  const [hook, object, scene, takeaway] = STORY_SEEDS[mood][index];
  const openings = [
    `I need to admit something: I ${hook}.`,
    `This is small, but it stayed with me. I ${hook}.`,
    `I do not really have a neat ending for this. I just ${hook}.`,
    `I have been thinking about how I ${hook}.`,
  ];
  const middles = [
    `The weird part was ${object}. It should have been ordinary, but it made the whole thing feel too real. I kept noticing ${scene}, like my brain wanted one tiny detail to hold onto instead of the bigger feeling.`,
    `It happened around ${object}, and for some reason ${scene} became the part I cannot stop replaying. Nothing dramatic happened after that. I just carried it around quietly.`,
    `There was ${object}, then ${scene}, and suddenly I felt like the day had a hidden subtitle only I could read. I hate when ordinary moments expose something I was trying to ignore.`,
    `I remember ${object} more than the actual conversation. I remember ${scene}. Sometimes the smallest details become evidence that something mattered.`,
  ];
  const endings = [
    `I guess the confession is that ${takeaway}. I am not asking anyone to fix it. I just wanted it outside my chest for a while.`,
    `Maybe that is the lesson, or maybe I am just trying to make meaning out of a messy day. Either way, ${takeaway}.`,
    `It sounds simple when I type it, but it did not feel simple inside me. ${takeaway}.`,
    `I do not know what I will do with this feeling yet. For now, ${takeaway}.`,
  ];

  const longMiddle = index % 5 === 0
    ? `\n\nI also noticed how much energy I spend trying to make my feelings look reasonable before I let anyone see them. Even here, anonymous, part of me wants to edit this until it sounds mature. But the raw version is probably more honest: I am tired, hopeful, embarrassed, and trying at the same time.\n\n`
    : index % 4 === 0
      ? `\n\nThe part I cannot say out loud is that I wanted someone to notice without me making a scene. I know that is unfair sometimes. People are not mind readers. Still, wanting to be noticed gently is such a human thing.\n\n`
      : `\n\n`;

  return `${openings[index % openings.length]}\n\n${middles[(index * 2) % middles.length]}${longMiddle}${endings[(index * 3) % endings.length]}`;
}

function makeComment(mood, postIndex, commentIndex, seed) {
  const [, object, scene, takeaway] = seed;
  const voice = COMMENT_VOICES[(postIndex + commentIndex) % COMMENT_VOICES.length];
  const endings = [
    "Hope you are a little gentler with yourself after typing it.",
    "Leaving this here so it does not feel like you said it into empty air.",
    "That kind of honesty is small but not easy.",
    "I hope the next hour is less heavy than this one.",
    "This is exactly the sort of thing people hide and then feel alone with.",
    "You made it sound human, not dramatic.",
  ];

  const bank = {
    relatable: `The ${object} detail is what got me. I have had a completely different situation do the same thing, where one tiny object suddenly holds the whole mood.`,
    supportive: `I do not think you are weird for feeling this. The line about "${takeaway}" makes sense in a way I wish it did not.`,
    "gentle-advice": `Maybe do not force yourself to solve all of it tonight. Sometimes naming the feeling clearly is already the first useful thing.`,
    "short-reaction": `Damn. The part with ${scene} hit harder than expected.`,
    "tiny-story": `This reminded me of a day when I kept staring at something ordinary and suddenly realized I was not okay. It is strange how the body picks the smallest witnesses.`,
    "soft-disagree": `I get why you are judging yourself, but from outside it reads less like weakness and more like someone trying to survive without instructions.`,
    "warm-humor": `Not me nodding at this like the ${object} personally attacked both of us. Feelings really choose the weirdest props.`,
    "older-sibling": `For what it is worth, this sounds like a person growing awareness, not a person failing. Those are very different things.`,
    "quiet-witness": `I read the whole thing. No big advice, just witnessing it with you for a second.`,
  };

  return `${bank[voice]} ${endings[(postIndex * 7 + commentIndex) % endings.length]}`;
}

function buildPostReactions(category, author, users) {
  const exclude = new Set([String(author._id)]);
  let waterCount;
  let burnCount;

  if (category === "budding") {
    waterCount = rand(8, 28);
    burnCount = rand(Math.max(5, waterCount - 5), Math.min(40, waterCount + 5));
  } else if (category === "grove") {
    waterCount = rand(24, 40);
    burnCount = rand(5, 16);
  } else if (category === "scorched") {
    burnCount = rand(24, 40);
    waterCount = rand(5, 18);
  } else {
    waterCount = rand(12, 40);
    burnCount = rand(5, 35);
  }

  const wateredUsers = sample(users, waterCount, exclude);
  const used = new Set([...exclude, ...wateredUsers.map((u) => String(u._id))]);
  const burnedUsers = sample(users, burnCount, used);

  return { wateredBy: uniqueIds(wateredUsers), burnedBy: uniqueIds(burnedUsers) };
}

function buildComments(mood, postIndex, seed, postDate, users, author) {
  const count = rand(5, 9);
  const commenters = sample(users, count, new Set([String(author._id)]));
  const boostedIndexes = new Set(sample([...Array(count).keys()], rand(1, 3)).map((n) => n));

  return commenters.map((commenter, i) => {
    const isBoosted = boostedIndexes.has(i);
    const waterCount = isBoosted ? rand(20, 30) : rand(0, 8);
    const burnCount = isBoosted ? rand(0, 4) : rand(0, 3);
    const wateredUsers = sample(users, waterCount, new Set([String(commenter._id)]));
    const used = new Set([String(commenter._id), ...wateredUsers.map((u) => String(u._id))]);
    const burnedUsers = sample(users, burnCount, used);

    return {
      userId: commenter._id,
      text: makeComment(mood, postIndex, i, seed),
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
  return sample(COMFORT_TEXTS, rand(3, 5)).map((text) => {
    const senders = sample(users, rand(3, 12), new Set([String(author._id)]));
    return { text, count: senders.length, sentBy: uniqueIds(senders) };
  });
}

function validateUniqueContent(confessions) {
  const seenPosts = new Map();
  const seenComments = new Map();

  for (const confession of confessions) {
    const postKey = confession.message.trim().toLowerCase();
    if (seenPosts.has(postKey)) {
      throw new Error(`Duplicate confession text found for mood ${confession.mood}`);
    }
    seenPosts.set(postKey, true);

    for (const comment of confession.comments || []) {
      const commentKey = comment.text.trim().toLowerCase();
      if (seenComments.has(commentKey)) {
        throw new Error(`Duplicate comment text found: ${comment.text}`);
      }
      seenComments.set(commentKey, true);
    }
  }

  return { postCount: seenPosts.size, commentCount: seenComments.size };
}

async function resetSeedData() {
  const deleteConfessions = await Confession.deleteMany({ isSeedContent: true });
  const deleteUsers = await User.deleteMany({ isSeedUser: true });
  console.log(`Reset starter confessions: ${deleteConfessions.deletedCount}`);
  console.log(`Reset starter users: ${deleteUsers.deletedCount}`);
}

async function createSeedUsers() {
  const passwordHash = await bcrypt.hash(`starter-${Date.now()}-${Math.random()}`, 10);
  const users = SEED_PERSONAS.slice(0, 90).map(([username, persona], index) => {
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
      seeds: rand(75, 1200),
      showSeedsOnProfile: rand(0, 1) === 1,
      ownedCosmetics: cosmetics.ownedCosmetics,
      equippedCosmetics: cosmetics.equippedCosmetics,
      dailyStreak: { current: rand(0, 18), best: rand(2, 36), lastVisitDateKey: "" },
      createdAt: daysAgo(rand(15, 90)),
      updatedAt: daysAgo(rand(0, 14)),
    };
  });
  return User.insertMany(users, { ordered: false });
}

function buildConfessions(users) {
  const confessions = [];
  let globalIndex = 0;

  for (const mood of MOODS) {
    for (let i = 0; i < POSTS_PER_MOOD; i += 1) {
      const seed = STORY_SEEDS[mood][i];
      const category = categoryForMood(mood, i);
      const author = users[(globalIndex * 7 + i * 3) % users.length];
      const createdAt = daysAgo(rand(0, 18), -i);
      const reactions = buildPostReactions(category, author, users);
      const comments = buildComments(mood, globalIndex, seed, createdAt, users, author);
      const postTheme = author.equippedCosmetics?.postTheme || pick(COSMETICS.postThemes);
      const warning = categoryWarning(mood);

      confessions.push({
        userId: author._id,
        message: makeStory(mood, i),
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

async function refreshSeedUserAvatars() {
  const users = await User.find({ isSeedUser: true }).sort({ createdAt: 1, username: 1 });
  if (!users.length) {
    console.log("No seed users found. Run the seed script first, or run with --reset to recreate starter users.");
    return;
  }
  const operations = users.map((user, index) => ({
    updateOne: {
      filter: { _id: user._id },
      update: { $set: { profilePicture: seedAvatarPath(index), updatedAt: new Date() } },
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
    console.log("Dry run: would create 90 fictional seed users and 200 starter confessions.");
    console.log("Each mood gets 20 unique confessions.");
    console.log("Each confession gets 5-9 unique comments, with boosted comment reactions.");
    console.log(`Avatar pool available: ${SEED_AVATAR_PATHS.length}`);
    await mongoose.disconnect();
    return;
  }

  if (SHOULD_RESET) await resetSeedData();

  const existingSeedUsers = await User.countDocuments({ isSeedUser: true });
  const existingSeedConfessions = await Confession.countDocuments({ isSeedContent: true });

  if ((existingSeedUsers > 0 || existingSeedConfessions > 0) && !FORCE && !SHOULD_RESET) {
    console.log("Starter community content already exists.");
    console.log(`Seed users: ${existingSeedUsers}`);
    console.log(`Seed confessions: ${existingSeedConfessions}`);
    console.log("Use --reset to replace starter content, or --force to add another batch.");
    await mongoose.disconnect();
    return;
  }

  const users = await createSeedUsers();
  const confessions = buildConfessions(users);
  const uniqueReport = validateUniqueContent(confessions);
  await Confession.insertMany(confessions, { ordered: false });

  const countsByMood = confessions.reduce((acc, confession) => {
    acc[confession.mood] = (acc[confession.mood] || 0) + 1;
    return acc;
  }, {});
  const countsByCategory = confessions.reduce((acc, confession) => {
    acc[confession.seedCategory] = (acc[confession.seedCategory] || 0) + 1;
    return acc;
  }, {});

  console.log("Richer starter community seed complete.");
  console.log(`Created fictional seed users: ${users.length}`);
  console.log(`Assigned profile avatars from pool: ${SEED_AVATAR_PATHS.length}`);
  console.log(`Created starter confessions: ${confessions.length}`);
  console.log(`Unique confession texts: ${uniqueReport.postCount}`);
  console.log(`Unique comment texts: ${uniqueReport.commentCount}`);
  console.log("By mood:", countsByMood);
  console.log("By category:", countsByCategory);
  console.log("All starter users/content are marked with isSeedUser/isSeedContent for cleanup.");

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error("Seed starter content failed:", err);
  try { await mongoose.disconnect(); } catch (_) {}
  process.exit(1);
});
