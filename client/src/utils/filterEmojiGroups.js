const EMOJI_GROUP_ALIASES = {
  "smileys & emotions": "face faces smile happy laugh laughing joy grin cute blush wink thinking sleep sick party cool nerd suspicious neutral sad cry crying angry mad scared fear anxious shocked confused upset pain tired monster ghost robot cat emotion feeling mood heavy love heart heartbreak support chaos funny confession",
  "hands & body": "hand hands gesture clap prayer muscle body eye mouth brain heart lungs bone thumbs point hug support high five fingers arm leg foot ear nose lips",
  "people & roles": "people person human job jobs role roles student teacher doctor coder artist wizard fairy hero villain worker profession sport dancing running family skin tone hair",
  "family & couples": "family couple couples love romance kiss heart relationship parent child people holding hands wedding",
  "skin tones": "skin tone tones modifier light medium dark",
  animals: "animal animals pet dog cat bird butterfly bee snake dragon fish horse monkey cute wildlife bug insect paw",
  "nature & weather": "nature weather sky moon sun star water rain cloud storm snow rainbow fire bubbles forest plant leaf leaves tree flower flowers mountain earth",
  "food & drink": "food drink fruit vegetable snack meal pizza burger tea coffee sweet dessert breakfast lunch dinner cup bottle",
  "activities & games": "activity activities sport sports game games music art trophy chess dance sing gaming hobby ball medal celebration party",
  "travel & places": "place places travel car bus plane train house building temple city mountain road vehicle map hotel school hospital",
  "objects & tools": "object objects tool phone computer camera money key lock book paper gift light weapon medical writing office home instrument",
  "symbols & signs": "symbol symbols check cross warning question exclamation color shape square circle arrow zodiac religion sign button heart number punctuation",
  keycaps: "keycap keycaps number numbers digit digits hash star",
  flags: "flag flags country countries pride pirate banner",
  smileys: "face faces smile happy laugh laughing joy grin cute blush wink thinking sleep sick party cool nerd suspicious neutral emoji mood",
  feelings: "sad cry crying angry mad scared fear anxious shocked confused upset pain tired monster ghost robot cat emotion feeling",
  heavy: "sad heavy depression grief heartbreak broken heart rain storm lonely numb pain candle dark vent sorrow",
  love: "love heart hearts romance crush kiss cute couple heal healing flower rose pink red relationship",
  support: "support hug hugs help comfort strength pray prayer friendship together gentle safe care hands",
  chaos: "chaos fire dramatic fight red flag drama demon crazy toxic angry explosive messy",
  funny: "funny laugh meme joke clown silly monkey awkward cool goofy food popcorn comedy",
  people: "people person human job jobs student teacher doctor coder artist wizard fairy hero villain family",
  hands: "hand hands gesture clap prayer muscle body eye mouth brain heart thumbs point",
  forest: "forest plant plants leaf leaves tree flower flowers nature butterfly bee bird mushroom confession wall grove",
  magic: "magic fantasy mystical moon star crystal sword shield fairy wizard dragon evil eye charm",
  food: "food drink fruit vegetable snack meal pizza burger tea coffee sweet dessert",
  activities: "activity sport game music art trophy chess dance sing gaming hobby",
  objects: "object objects tool phone computer camera money key lock book paper gift light weapon medical writing",
  places: "place places travel car bus plane train house building temple city mountain road",
  symbols: "symbol symbols check cross warning question exclamation color flag flags shape square circle",
  confession: "confession secret vent whisper thought brain heart lock key diary note writing truth anonymous"
};

const normalizeSearchText = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

export function filterEmojiGroups(groups, query) {
  const needle = normalizeSearchText(query);
  if (!needle) return groups;

  return groups
    .map((group) => {
      const label = String(group.label || "").toLowerCase();
      const aliases = EMOJI_GROUP_ALIASES[label] || "";
      const groupMatches = label.includes(needle) || aliases.includes(needle);

      if (groupMatches) {
        return group;
      }

      const emojis = group.emojis.filter((emoji) => String(emoji).includes(query.trim()));
      return emojis.length ? { ...group, emojis } : null;
    })
    .filter(Boolean);
}
