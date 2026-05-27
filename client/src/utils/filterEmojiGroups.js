const EMOJI_GROUP_ALIASES = {
  smileys: "face faces smile happy laugh laughing joy grin cute blush wink thinking sleep sick party cool nerd suspicious neutral emoji mood",
  feelings: "sad cry crying angry mad scared fear anxious shocked confused upset pain tired monster ghost robot cat emotion feeling",
  heavy: "sad heavy depression grief heartbreak broken heart rain storm lonely numb pain candle dark vent sorrow",
  love: "love heart hearts romance crush kiss cute couple heal healing flower rose pink red relationship",
  support: "support hug hugs help comfort strength pray prayer friendship together gentle safe care hands",
  chaos: "chaos fire dramatic fight red flag drama demon crazy toxic angry explosive messy",
  funny: "funny laugh meme joke clown silly monkey awkward cool goofy food popcorn comedy",
  people: "people person human job jobs student teacher doctor coder artist wizard fairy hero villain family",
  hands: "hand hands gesture clap prayer muscle body eye mouth brain heart thumbs point",
  animals: "animal animals pet dog cat bird butterfly bee snake dragon fish horse monkey cute wildlife",
  forest: "forest plant plants leaf leaves tree flower flowers nature butterfly bee bird mushroom confession wall grove",
  nature: "nature weather sky moon sun star water rain cloud storm snow rainbow fire bubbles",
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
