// lib/la-activities.js
// Curated pedagogical activity/strategy ideas per Language Arts category --
// distinct from lib/language-arts-categories.js's ministry curriculum
// CONTENT elaborations. These are HOW you teach something (strategies,
// routines, activity formats), not WHAT you're covering. Supplied in full
// by Aj, 2026-07-19, specifically so each category's Activities tab shows
// only ideas genuinely specific to that strand -- distinct from the
// existing "Content" tab (ministry curriculum topics) and "Curricular
// Competency" tab.
//
// Some activity labels legitimately appear in more than one category's
// list here (e.g. "Reader's Theatre" fits both Reading and Oral; "Graphic
// Organizers" fits both Reading and Writing) -- that's fine and expected.
// The runtime cross-category exclusion in app/units/page.js (isElabCovered
// checking the whole subject, not just one category) is what actually
// enforces "once you pick it under one category, it disappears from the
// others" -- this data file intentionally does NOT pre-dedupe those
// overlaps, since either category is a legitimate home for them until the
// teacher picks one.

export const LA_ACTIVITIES = {
  reading: [
    {
      group: 'Core Reading Skill-Building Activities', icon: '📖',
      items: [
        { label: 'Shared Reading', description: 'Teacher models fluent reading while students follow along.' },
        { label: 'Guided Reading', description: 'Small-group instruction targeting decoding, comprehension, and strategy use.' },
        { label: 'Independent Reading', description: 'Sustained silent reading to build stamina and volume.' },
        { label: 'Echo Reading', description: 'Teacher reads a line, students repeat to build fluency and phrasing.' },
        { label: 'Choral Reading', description: 'Group reading to strengthen confidence and rhythm.' },
      ],
    },
    {
      group: 'Comprehension Strategy Activities', icon: '🔍',
      items: [
        { label: 'Predicting', description: 'Students anticipate what will happen next using text clues.' },
        { label: 'Questioning', description: 'Students generate questions before, during, and after reading.' },
        { label: 'Visualizing', description: 'Create mental images or draw scenes from the text.' },
        { label: 'Summarizing', description: 'Identify key ideas and restate concisely.' },
        { label: 'Making Inferences', description: 'Combine text clues with background knowledge.' },
      ],
    },
    {
      group: 'Vocabulary & Word-Level Activities', icon: '🧠',
      items: [
        { label: 'Word Sorts', description: 'Categorize words by meaning, pattern, or structure.' },
        { label: 'Context Clue Practice', description: 'Determine word meaning using surrounding text.' },
        { label: 'Morphology Work', description: 'Prefixes, suffixes, roots to unlock unfamiliar words.' },
        { label: 'High-Frequency Word Review', description: 'Build automaticity with common words.' },
        { label: 'Semantic Mapping', description: 'Connect new vocabulary to related concepts.' },
      ],
    },
    {
      group: 'Text Structure & Genre Activities', icon: '📚',
      items: [
        { label: 'Text Feature Hunts', description: 'Locate headings, captions, diagrams, etc.' },
        { label: 'Structure Identification', description: 'Compare narrative, informational, persuasive forms.' },
        { label: 'Compare Multiple Texts', description: 'Analyze similarities/differences across sources.' },
        { label: 'Genre Sorting', description: 'Classify texts by genre characteristics.' },
        { label: 'Story Mapping', description: 'Chart characters, setting, problem, events, resolution.' },
      ],
    },
    {
      group: 'Fluency-Focused Reading Activities', icon: '🗣️',
      items: [
        { label: 'Repeated Reading', description: 'Reread short passages to build speed and accuracy.' },
        { label: "Reader's Theatre", description: 'Perform scripts to strengthen expression and pacing.' },
        { label: 'Partner Reading', description: 'Students alternate reading and coaching.' },
        { label: 'Phrase-Cued Reading', description: 'Practice reading in meaningful chunks.' },
        { label: 'Timed Fluency Practice', description: 'Track words-per-minute with comprehension checks.' },
      ],
    },
    {
      group: 'Response-to-Reading Activities', icon: '🔄',
      items: [
        { label: 'Annotation', description: 'Mark up text with notes, symbols, and questions.' },
        { label: 'Graphic Organizers', description: 'Venn diagrams, T-charts, cause/effect charts.' },
        { label: 'Retelling', description: 'Oral or written recount of key events or ideas.' },
        { label: 'Character Analysis', description: 'Explore traits, motivations, and changes.' },
        { label: 'Theme Tracking', description: 'Identify recurring ideas across the text.' },
      ],
    },
    {
      group: 'Creative & Engaging Reading Extensions', icon: '🎨',
      items: [
        { label: 'Storyboarding', description: 'Illustrate key scenes in sequence.' },
        { label: 'Alternate Perspectives', description: "Rewrite a scene from another character's viewpoint." },
        { label: 'Text-to-Self Connections', description: 'Relate personal experiences to the text.' },
        { label: 'Book Talks', description: 'Short presentations recommending a text.' },
        { label: 'Character Hot-Seat', description: 'Students answer questions "as" a character.' },
      ],
    },
  ],

  writing: [
    {
      group: 'Core Writing Practice Activities', icon: '✏️',
      items: [
        { label: 'Quick Writes', description: '3-5 minute bursts to build fluency and reduce writing anxiety.' },
        { label: 'Sentence Expansion', description: 'Start with a simple sentence and add detail, clauses, or description.' },
        { label: 'Paragraph Frames', description: 'Structured templates that teach organization and cohesion.' },
        { label: 'Model Imitation', description: 'Students mimic the structure of a mentor text to learn craft.' },
        { label: 'Dictation & Reconstruction', description: 'Listen, write, then rebuild the text collaboratively.' },
      ],
    },
    {
      group: 'Writing to Build Ideas & Content', icon: '📚',
      items: [
        { label: 'Brainstorming Webs', description: 'Visual idea mapping before drafting.' },
        { label: 'Listing & Categorizing', description: 'Generate ideas, then sort them into logical groups.' },
        { label: 'Question Storming', description: 'Students generate questions about a topic to guide writing.' },
        { label: 'Picture Prompts', description: 'Write stories, descriptions, or explanations based on images.' },
        { label: 'Story Seeds', description: 'Short prompts that spark narrative ideas.' },
      ],
    },
    {
      group: 'Writing to Develop Structure & Organization', icon: '🧠',
      items: [
        { label: 'Graphic Organizers', description: "Venn diagrams, T-charts, story mountains, etc." },
        { label: 'Sequencing Cards', description: 'Arrange events or ideas, then write the sequence.' },
        { label: 'Paragraph Scrambles', description: 'Reorder mixed sentences to learn coherence.' },
        { label: 'Transition Practice', description: 'Build fluency with linking words and phrases.' },
        { label: 'Outline to Draft', description: 'Convert structured notes into full paragraphs.' },
      ],
    },
    {
      group: 'Creative & Expressive Writing Activities', icon: '✍️',
      items: [
        { label: 'Story Starters', description: 'Open-ended beginnings students continue.' },
        { label: 'Dialogue Writing', description: 'Practice punctuation, voice, and character interaction.' },
        { label: 'Poetry Frames', description: 'Haiku, acrostics, list poems, etc.' },
        { label: 'Character Journals', description: "Write from a character's perspective." },
        { label: 'Alternate Endings', description: 'Rewrite the ending of a known story.' },
      ],
    },
    {
      group: 'Functional & Academic Writing Activities', icon: '📝',
      items: [
        { label: 'Summarizing Practice', description: 'Identify main ideas and write concise summaries.' },
        { label: 'Compare-Contrast Writing', description: 'Structured paragraphs using similarities and differences.' },
        { label: 'Opinion Paragraphs', description: 'Claim + reason + example.' },
        { label: 'Procedural Writing', description: '"How-to" texts with steps and sequencing.' },
        { label: 'Research Notes', description: 'Gather facts and convert them into organized writing.' },
      ],
    },
    {
      group: 'Revision & Editing Activities', icon: '🔄',
      items: [
        { label: 'Peer Review Protocols', description: 'Structured feedback routines.' },
        { label: 'Sentence Combining', description: 'Build complexity and flow.' },
        { label: 'Editing Checklists', description: 'Focus on conventions and clarity.' },
        { label: 'Color-Coding Revisions', description: 'Highlight changes for organization, detail, transitions.' },
        { label: 'Read-Aloud Revision', description: 'Read work aloud to catch awkward phrasing and errors by ear.' },
      ],
    },
  ],

  oral: [
    {
      group: 'Guided Oral Practice', icon: '🗣️',
      items: [
        { label: 'Choral repetition', description: 'Whole-group repeating target phrases builds rhythm and confidence.' },
        { label: 'Sentence frames', description: 'Learners complete prompts like "I think... because..." to practice fluent expression.' },
        { label: 'Dialogue drills', description: 'Short, repeated exchanges that strengthen automaticity.' },
      ],
    },
    {
      group: 'Performance-Based Speaking', icon: '🎭',
      items: [
        { label: 'Role plays', description: 'Simulate real-life conversations (ordering food, asking for help).' },
        { label: "Reader's theatre", description: 'Repeated reading aloud improves pacing, intonation, and expression.' },
        { label: 'Short presentations', description: 'Build organized, fluent speech with minimal notes.' },
      ],
    },
    {
      group: 'Interactive Communication Tasks', icon: '🤝',
      items: [
        { label: 'Information gap activities', description: 'Each partner has different info and must talk to complete the task.' },
        { label: 'Think-pair-share', description: 'Quick, structured exchanges that encourage fluent thinking aloud.' },
        { label: 'Small-group discussions', description: 'Practice turn-taking, elaboration, and conversational flow.' },
      ],
    },
    {
      group: 'Oral Language Input + Output Cycles', icon: '📚',
      items: [
        { label: 'Story retelling', description: 'After listening to a story, students retell it in their own words.' },
        { label: 'Picture sequencing', description: 'Describe a series of images to build narrative fluency.' },
        { label: 'Shadowing', description: 'Learners repeat speech immediately after hearing it to build rhythm and speed.' },
      ],
    },
    {
      group: 'Pronunciation & Prosody Training', icon: '🎧',
      items: [
        { label: 'Minimal pairs practice', description: 'Improves clarity and reduces hesitations.' },
        { label: 'Stress and intonation drills', description: 'Helps learners sound more natural and confident.' },
        { label: 'Chunking practice', description: 'Teaches learners to speak in meaningful phrases rather than word-by-word.' },
      ],
    },
    {
      group: 'Vocabulary & Expression Expansion', icon: '🧠',
      items: [
        { label: 'High-frequency phrase practice', description: '"I agree with...", "In my opinion...", "The reason is..."' },
        { label: 'Topic-based vocabulary building', description: 'Gives learners the words they need for specific discussions.' },
        { label: 'Collocation practice', description: 'Helps learners produce natural-sounding language quickly.' },
      ],
    },
  ],
}
