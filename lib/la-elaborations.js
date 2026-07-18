// lib/la-elaborations.js
// Aj asked (2026-07-17) for the "Elaborations" concept from BC's English
// Language Arts curriculum intro (curriculum.gov.bc.ca/content/english-
// language-arts/introduction) to be a visible, actionable feature -- short,
// concrete teaching ideas a teacher can lean on to guide the year's
// structure, each tagged with which of the three sections (Reading /
// Writing / Oral Language Fluency) it covers. Working backward from an
// idea like "Novel Study" to the strands it touches, per Aj's example.
//
// This is a curated starter set in this app's own words, not a scrape or
// reproduction of BC Ministry text -- categories/coverage are Aj's/this
// app's judgment call, editable here any time.
export const LA_ELABORATIONS = [
  {
    key: 'novel_study',
    label: 'Novel Study',
    covers: ['reading', 'writing', 'oral'],
    description: 'Whole-class or small-group study of one novel: comprehension, discussion, and a culminating written or spoken response.',
  },
  {
    key: 'readers_theatre',
    label: "Reader's Theatre",
    covers: ['reading', 'oral'],
    description: 'Students perform a script aloud from a shared text -- builds fluency and expression without needing memorization or costumes.',
  },
  {
    key: 'literature_circles',
    label: 'Literature Circles',
    covers: ['reading', 'oral'],
    description: 'Small student-led groups reading and discussing the same book on a rotating schedule, each member taking a discussion role.',
  },
  {
    key: 'persuasive_essay',
    label: 'Persuasive Essay',
    covers: ['writing'],
    description: 'Students take a position on a topic and build a structured written argument with supporting evidence.',
  },
  {
    key: 'personal_narrative',
    label: 'Personal Narrative',
    covers: ['writing'],
    description: 'Students write about a real experience of their own, focusing on voice, sequence, and reflective detail.',
  },
  {
    key: 'poetry_study',
    label: 'Poetry Study',
    covers: ['reading', 'writing'],
    description: 'Reading and analyzing poems for device and meaning, then writing original poems using the same techniques.',
  },
  {
    key: 'readers_response_journal',
    label: "Reader's Response Journal",
    covers: ['reading', 'writing'],
    description: 'Ongoing written reflections on independent reading -- connects comprehension work directly to writing practice.',
  },
  {
    key: 'book_talk',
    label: 'Book Talk / Show and Tell',
    covers: ['oral'],
    description: 'Short, low-stakes spoken presentations recommending or summarizing something to the class.',
  },
  {
    key: 'class_debate',
    label: 'Class Debate',
    covers: ['oral', 'writing'],
    description: 'Students research and argue opposing sides of a question -- written prep feeding a structured spoken debate.',
  },
  {
    key: 'author_study',
    label: 'Author Study',
    covers: ['reading', 'writing'],
    description: "Deep dive into one author's body of work, comparing style and theme across texts, with a written response.",
  },
  {
    key: 'informational_report',
    label: 'Informational Writing / Research Report',
    covers: ['reading', 'writing'],
    description: 'Students research a topic from multiple sources and write an organized informational piece.',
  },
  {
    key: 'storytelling_oral_tradition',
    label: 'Storytelling & Oral Tradition',
    covers: ['oral'],
    description: 'Students tell or retell stories aloud without a script -- builds sequencing, expression, and audience awareness.',
  },

  // --- Added from the district's Balanced Literacy Guide (uploaded 2026-07-17) ---
  // Each of these carries a `framework` tag matching one of the six components
  // of the guide's Balanced Literacy model: routines, flexibleGroupings,
  // explicitPlanning, workshop, richEnvironment, foundations. Descriptions are
  // this app's own paraphrase of the guide's Instructional Routines table and
  // Components of Balanced Literacy section, not a reproduction of its text.
  {
    key: 'think_pair_share',
    label: 'Think-Pair-Share',
    covers: ['oral'],
    framework: 'explicitPlanning',
    description: 'Teacher poses a question, students think individually first, then share their response with a partner before a wider discussion.',
  },
  {
    key: 'close_reading',
    label: 'Close Reading',
    covers: ['reading'],
    framework: 'explicitPlanning',
    description: 'Repeated reading and annotation of a short, complex text or extract, guided by teacher questioning toward deeper analysis and discussion.',
  },
  {
    key: 'jigsaw_reading',
    label: 'Jigsaw',
    covers: ['reading', 'oral'],
    framework: 'flexibleGroupings',
    description: 'Small groups each become "experts" on one part of a text, then regroup so each expert teaches their piece -- the whole text gets read and understood collaboratively.',
  },
  {
    key: 'kwl_ran',
    label: 'K-W-L / R.A.N. Chart',
    covers: ['reading'],
    framework: 'routines',
    description: 'A background-activating routine where students record what they already Know, Want to know, and later have Learned (or Read And Noticed) about a topic.',
  },
  {
    key: 'think_aloud',
    label: 'Think Aloud / Modelling Comprehension',
    covers: ['reading'],
    framework: 'explicitPlanning',
    description: 'Teacher reads aloud and narrates their own thinking process -- questions, connections, predictions -- to make invisible comprehension strategies visible to students.',
  },
  {
    key: 'read_alouds',
    label: 'Read-Alouds',
    covers: ['oral', 'reading'],
    framework: 'richEnvironment',
    description: 'Teacher reads aloud using varied tone, pace, volume, pauses, and eye contact to model fluent, enjoyable reading for the whole class.',
  },
  {
    key: 'phonics_routine',
    label: 'Phonemic Awareness / Phonics Routine',
    covers: ['reading'],
    framework: 'foundations',
    description: 'A short, repeatable daily routine (word sorts, sound wall work, Greek/Latin roots, etc.) building the foundational sound-symbol skills reading depends on.',
  },
  {
    key: 'story_workshop',
    label: 'Story Workshop',
    covers: ['oral', 'writing'],
    framework: 'routines',
    description: 'Students explore prepared materials/loose parts and build stories from them, with adults working alongside as story ideas take shape -- especially strong in primary grades.',
  },
  {
    key: 'guided_reading_group',
    label: 'Guided Reading',
    covers: ['reading'],
    framework: 'workshop',
    description: 'Small-group lesson at a shared instructional level: word study, book introduction/vocabulary, supported reading, and discussion.',
  },
  {
    key: 'morning_message',
    label: 'Morning Message / Question of the Day',
    covers: ['oral', 'reading'],
    framework: 'routines',
    description: 'A short daily transition routine -- a message or question the class reads and responds to together -- that builds print awareness and community in a low-stakes, repeatable way.',
  },
  {
    key: 'literacy_conferencing',
    label: 'Reading/Writing Conferences',
    covers: ['reading', 'writing'],
    framework: 'workshop',
    description: 'One-on-one check-ins during independent work time where the teacher discusses a student\'s reading or writing, gives targeted feedback, and sets a next step.',
  },
  {
    key: 'word_study_orthographic',
    label: 'Word Study & Spelling Patterns',
    covers: ['writing', 'reading'],
    framework: 'foundations',
    description: 'Explicit practice with orthographic patterns (spelling, morphology -- roots, prefixes, suffixes) to build word recognition and spelling accuracy.',
  },
  {
    key: 'classroom_library_setup',
    label: 'Build/Refresh the Classroom Library',
    covers: ['reading'],
    framework: 'richEnvironment',
    description: 'Organize a diverse, browsable classroom library (fiction, non-fiction, varied cultures and abilities represented) that students can access independently.',
  },
  {
    key: 'anchor_charts',
    label: 'Co-Created Anchor Charts',
    covers: ['reading', 'writing'],
    framework: 'richEnvironment',
    description: 'Build a chart together with students as a visible, ongoing reference for a routine, strategy, or criteria -- e.g. a story-elements chart built during a mini-lesson.',
  },
]

export function elaborationsForCategory(categoryKey) {
  return LA_ELABORATIONS.filter((e) => e.covers.includes(categoryKey))
}

// The six components of the district's Balanced Literacy Guide framework,
// for labelling the `framework` tag on LA_ELABORATIONS items that came from
// that guide (see additions above, 2026-07-17).
export const BALANCED_LITERACY_FRAMEWORK = {
  routines: 'Balanced Literacy Routine',
  flexibleGroupings: 'Flexible Grouping',
  explicitPlanning: 'Explicit & Intentional Planning',
  workshop: 'Reading/Writing Workshop',
  richEnvironment: 'Rich Learning Environment',
  foundations: 'Foundations',
}
