/**
 * Paste-ready Create Series inputs for the three production examples.
 * English source. Visitors can read the storyline; Copy puts the same text
 * on the clipboard for New Series.
 */

export type ExampleSeriesEpisode = {
  number: number
  title: string
  synopsis: string
}

export type ExampleSeriesInput = {
  cardId: 'animation' | 'documentary' | 'training'
  showTitle: string
  artLock: string
  concept: string
  logline: string
  storyline: string
  episodes: readonly ExampleSeriesEpisode[]
}

export const EXAMPLE_SERIES_INPUTS: readonly ExampleSeriesInput[] = [
  {
    cardId: 'animation',
    showTitle: 'Hart House',
    artLock:
      'One locked flat-cel style for the whole season: bold ink outlines, warm suburban color, and the same character designs in every episode. The platform can hold many styles. This series does not switch.',
    concept:
      'Hart House is a weekly family comedy in the invented town of Millwick. Ruth Hart, a municipal clerk, and Ellis Hart, a night-shift bus mechanic, share a small house with their daughter June (16), their son Milo (9), and Ruth’s mother, Nana Inez, who has turned the side porch into her rooms. Each episode is one ordinary Millwick problem — a new town rule, a rained-out festival, a breakfast that is the only hour the family overlaps — told so the joke is also the point. Lock one flat-cel art style, these five faces, and this house from episode 1 to episode 5. Episode 5 turns: the family has to decide whether Nana Inez’s “temporary” porch is actually her home.',
    logline:
      'In Millwick, the Harts turn a household argument into the week’s joke, and the joke into the reason they still live under one roof.',
    storyline:
      'Ruth keeps the calendar. Ellis fixes machines that almost work. June, sixteen, will debate the rule before she follows it. Milo, nine, collects facts nobody requested. Nana Inez remembers every slight the block ever offered and still sets an extra plate. The season is five weeks in one house. The art style never changes: the same ink line, the same warm palette, the same faces. What changes is how much of the house belongs to Nana Inez, and whether Millwick will treat a temporary arrangement as a real home.',
    episodes: [
      {
        number: 1,
        title: 'The Sorting Rule',
        synopsis:
          'Millwick issues a new recycling order with twelve categories. Ellis builds a sorting machine in the garage. It works on bottles and then, disastrously, on the family’s unlabeled boxes. June wants to challenge the rule at the town meeting. Ruth wants the curb to look compliant by Thursday. The episode lands when Milo labels one box “Nana’s porch things” and nobody can agree what the label means.',
      },
      {
        number: 2,
        title: 'Parade Weather',
        synopsis:
          'Rain is forecast for Millwick Day. June wants to cancel her debate-club banner. Milo wants to log the lightning. Nana Inez refuses to wave at a neighbor she has avoided since a fence dispute. Ruth still has to host the block under a tarp. The joke is the tarp. The point is who gets to decide that a celebration happened.',
      },
      {
        number: 3,
        title: 'Night Shift Breakfast',
        synopsis:
          'Ellis gets home at dawn and cooks for people who are already leaving. June has a tournament. Milo has a field trip. Ruth has a counter shift. For one hour the kitchen is the whole family, and the eggs are the only conversation that fits. A burnt pancake becomes the running argument about whose morning the house is built around.',
      },
      {
        number: 4,
        title: 'The Spare Key',
        synopsis:
          'Someone has been refilling the cat’s bowl on the mornings Ellis oversleeps. The Harts investigate and find the key they hid under a brick years ago. The neighbor they have been calling nosy has been covering the dawn gap. Nana Inez has to decide whether to take the key back or admit the block has been helping.',
      },
      {
        number: 5,
        title: 'The Porch Vote',
        synopsis:
          'Nana Inez announces she is done with the “temporary” porch and will move to her sister’s town. The Harts call a household vote. Rebuilding the porch as her real rooms means Ellis’s garage project stops, June’s study corner moves, and Millwick has to permit a change it has been ignoring. The season turns here: the comedy is no longer about a messy week. It is about who gets to stay.',
      },
    ],
  },
  {
    cardId: 'documentary',
    showTitle: 'The Long Thought',
    artLock:
      'Period accuracy is the rule of the picture. A 1956 lab has period wardrobe, film grain, and the machines of that year — no flat screens, no phones. A present-day chapter looks like now. The same two witnesses, Dr. Amira Hassan and Kenji Sato, keep the same faces across every era they appear in.',
    concept:
      'The Long Thought is a five-episode documentary on the rise and trajectory of artificial intelligence and the question of superintelligence. It is global, not a single-country story: Manchester and Tokyo in the early labs, a Nairobi records room and a Seoul chip floor when machines became useful, a Lagos newsroom and a São Paulo classroom when the public arrived, then one present day in Manila, Accra, and Rotterdam, and a final chapter that refuses both utopia and doom. Lock the narrator and the two witnesses. Keep every chapter’s wardrobe, rooms, and cities accurate to that year.',
    logline:
      'A five-part documentary follows intelligence — built, borrowed, and still unfinished — from the first useful machines to the question of a system smarter than its makers.',
    storyline:
      'Two witnesses carry the series. Dr. Amira Hassan starts in a Cairo lecture hall and later works between Cairo and London. Kenji Sato starts on an Osaka factory floor and later in a research lab. A calm narrator ties the chapters. The pictures never cheat the year. Early episodes cannot contain a smartphone. The present cannot be dressed as the 1950s. The last episode does not predict a winner. It asks what a system smarter than the people who built it would owe the people who never got a vote.',
    episodes: [
      {
        number: 1,
        title: 'The Room with the Switches',
        synopsis:
          'Mid-century labs in Manchester, Princeton, and Tokyo. Researchers in period dress stand over machines that do one clever thing in a loud room. Amira’s teacher, on a later interview tape, describes the hope without using a single object from the future. Kenji’s uncle services a factory controller the size of a wardrobe. The chapter ends on a switch left in the on position overnight.',
      },
      {
        number: 2,
        title: 'The Useful Machine',
        synopsis:
          'The 1980s and 1990s. An expert system in a Nairobi hospital records room, a chip floor in Seoul, a translation office in Paris. Beige terminals, CRT glow, clothing and cars of that decade. Amira, young, watches a program suggest a diagnosis a senior clinician rejects. Kenji sees a line stop because a sensor trusted itself. Useful, and already arguing with the people beside it.',
      },
      {
        number: 3,
        title: 'The Public Arrival',
        synopsis:
          'The 2010s. A Lagos newsroom, a São Paulo classroom, a Berlin kitchen where a phone answers a question a child asked out loud. The model has left the lab. Amira is now the person reporters call. Kenji’s factory posts a notice that the night shift will “consult the system.” The chapter holds on faces reading a screen, not on the screen.',
      },
      {
        number: 4,
        title: 'The Acceleration',
        synopsis:
          'One present day, three cities. A nurse in Manila, a composer in Accra, a dock planner in Rotterdam. Each uses a system that finishes a sentence they started. The narrator counts what sped up and who was not in the room when the terms were set. Amira and Kenji, older, compare the notices on their doors. The pictures are contemporary: current dress, current streets, current light.',
      },
      {
        number: 5,
        title: 'The Question Ahead',
        synopsis:
          'The superintelligence horizon, told as a question rather than a prophecy. Amira and Kenji sit in a quiet archive — papers, photographs, and a machine that is not pretending to be a person. They ask what a system smarter than its makers would owe the nurse, the composer, the dock planner, and the people who never touched the switch. The series does not answer. It leaves the obligation in the room.',
      },
    ],
  },
  {
    cardId: 'training',
    showTitle: 'Five Plates',
    artLock:
      'One locked chef. Chef Lila Mensah, the same face, the same white coat, the same close-cropped hair, in the same Harbor Street teaching kitchen — same tiles, same pots, same window — from the broth to the dessert.',
    concept:
      'Five Plates is a five-module culinary course taught by one chef in one kitchen. Chef Lila Mensah teaches five meals that build on each other: a clear broth, a bread, a vegetable main that can feed a class, a celebration roast, and a dessert that uses the skills of the first four. Learners see the same instructor, the same coat, and the same Harbor Street kitchen in every module. Each module is setup, demonstration, and a check before the next plate.',
    logline:
      'One chef, one kitchen, five meals — each plate teaching the hands what the next plate will need.',
    storyline:
      'Chef Lila Mensah does not change wigs, kitchens, or personalities between modules. The course is a sequence, not a pile of clips. Students learn heat and salt in the broth, time and touch in the bread, feeding a group with the vegetable main, holding a celebration plate, and finishing with a dessert that depends on everything before it. The last module is the check: the class cooks the five plates as one meal, and Lila is still the person who started the broth.',
    episodes: [
      {
        number: 1,
        title: 'The Broth',
        synopsis:
          'Lila starts with a clear broth: knife, bones or vegetables, heat, and patience. She shows the simmer, the skim, and the moment salt goes in. The kitchen, the coat, and her face are established as the locked set. The check is a spoonful that tastes finished, not cloudy.',
      },
      {
        number: 2,
        title: 'The Bread',
        synopsis:
          'Same bench, same chef. Dough, time, and the feel of a proved loaf. Lila ties the broth’s lesson about patience to the wait the dough requires. Students shape, score, and bake. The check is a crumb that is open, not gummy, and a note on what they would change next time.',
      },
      {
        number: 3,
        title: 'The Vegetable Main',
        synopsis:
          'A pan of greens and grains that has to feed the whole class, not a camera. Lila shows a sauce built from the broth, seasoning for a group, and how to hold color in the vegetables. The check is a plate that is the same in the first bowl and the last.',
      },
      {
        number: 4,
        title: 'The Celebration Roast',
        synopsis:
          'A center plate for a night that matters: roast, rest, and a side that uses yesterday’s bread. Lila keeps the same station and the same voice while the stakes of the plate go up. The check is carving for a table, not a single hero shot.',
      },
      {
        number: 5,
        title: 'The Last Sweet',
        synopsis:
          'A dessert that needs the heat control of module 1, the timing of module 2, and the seasoning eye of module 3. Then the class sets all five plates as one meal. Lila walks the pass in the same coat, in the same kitchen. The course turns from lessons into a service.',
      },
    ],
  },
]

const SERIES_BY_CARD: Record<ExampleSeriesInput['cardId'], ExampleSeriesInput> = {
  animation: EXAMPLE_SERIES_INPUTS[0],
  documentary: EXAMPLE_SERIES_INPUTS[1],
  training: EXAMPLE_SERIES_INPUTS[2],
}

export function getExampleSeriesInput(cardId: string): ExampleSeriesInput | null {
  if (cardId === 'animation' || cardId === 'documentary' || cardId === 'training') {
    return SERIES_BY_CARD[cardId]
  }
  return null
}

export function formatSeriesInput(series: ExampleSeriesInput): string {
  const episodes = series.episodes
    .map((episode) => `${episode.number}. ${episode.title}\n${episode.synopsis}`)
    .join('\n\n')
  return [
    series.showTitle,
    series.artLock,
    '',
    'Create Series input',
    series.concept,
    '',
    'Storyline',
    series.logline,
    '',
    series.storyline,
    '',
    'Episodes',
    episodes,
  ].join('\n')
}
