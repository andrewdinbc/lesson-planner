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
]

export function elaborationsForCategory(categoryKey) {
  return LA_ELABORATIONS.filter((e) => e.covers.includes(categoryKey))
}
