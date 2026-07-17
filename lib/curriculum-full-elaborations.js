// lib/curriculum-full-elaborations.js
// Structured BC Ministry curriculum data: Big Ideas, Content topics, and
// Elaborations (the Ministry's own explanatory notes + sample inquiry
// questions from the official "PDF with Elaborations" documents at
// curriculum.gov.bc.ca), for K-9. Built 2026-07-17 at Aj's request to
// surface the full elaborations content (not just curated activity ideas
// like lib/la-elaborations.js) as a browsable/teachable resource.
//
// Covers: English Language Arts, Mathematics, Science (K-9), built directly
// this session. Social Studies, ADST, Arts Education, Physical & Health
// Education, Career Education, Francais langue premiere, FRAL, and the
// individual Languages courses are queued in Hyperion for the same
// treatment - see docs/curriculum-elaborations-queue.md.
//
// Shape: CURRICULUM_ELABORATIONS[subjectName][grade] = {
//   bigIdeas: string[],       // the grade's official Big Ideas
//   content: string[],        // the grade's official Content topic list
//   elaborations: {term, detail}[]  // Ministry elaboration notes / sample
//                                     inquiry questions, usable as concrete
//                                     classroom activity prompts
// }

export const CURRICULUM_ELABORATIONS = {
  "English Language Arts": {
    "K": {
      "bigIdeas": [
        "Language and story can be a source of creativity and joy.",
        "Stories and other texts help us learn about ourselves and our families.",
        "Stories and other texts can be shared through pictures and words.",
        "Everyone has a unique story to share.",
        "Through listening and speaking, we connect with others and share our world.",
        "Playing with language helps us discover how language works.",
        "Curiosity and wonder lead us to new discoveries about ourselves and the world around us."
      ],
      "content": [
        "structure of story",
        "literary elements and devices",
        "reading strategies",
        "oral language strategies",
        "metacognitive strategies",
        "writing processes",
        "concepts of print",
        "letter knowledge",
        "phonemic and phonological awareness",
        "letter formation",
        "the relationship between reading, writing, and oral language"
      ],
      "elaborations": [
        {
          "term": "story/stories",
          "detail": "Narrative texts, real or imagined, that teach us about human nature, motivation, and experience, and often reflect a personal journey or strengthen identity. Can be oral, written, or visual; used to instruct, inspire, entertain."
        },
        {
          "term": "text/texts",
          "detail": "Generic term for oral (speeches, poems, plays, oral stories), written (novels, articles, short stories), visual (posters, photographs), and digital communication."
        },
        {
          "term": "structure of story",
          "detail": "Beginning, middle, end (or first, then, last)."
        },
        {
          "term": "foundational concepts of print",
          "detail": "Directionality of print, difference between letter and word, difference between writing and drawing, spacing, letter-sound relationship, that pictures convey meaning, taking turns, role-playing."
        },
        {
          "term": "oral storytelling processes",
          "detail": "Creating an original story or finding an existing story (with permission), sharing from memory, using vocal expression to clarify meaning."
        },
        {
          "term": "concepts of print (detailed)",
          "detail": "Symbolic nature of writing; correspondence of spoken to printed words; association of letters and sounds; distinctive features of letters/words; uppercase/lowercase correspondence; left-to-right directionality; use of space for word boundaries; punctuation signs; front/back of a book."
        },
        {
          "term": "phonemic and phonological awareness",
          "detail": "Phonemic: segmenting spoken words into phonemes (c/a/t) and blending phonemes into words. Phonological: hearing/creating rhymes, segmenting speech into words, hearing syllables as chunks."
        },
        {
          "term": "letter formation",
          "detail": "Use of scribble writing or letter strings to communicate meaning; distinguishes drawing from writing."
        }
      ]
    },
    "1": {
      "bigIdeas": [
        "Language and story can be a source of creativity and joy.",
        "Stories and other texts help us learn about ourselves and our families.",
        "Stories and other texts can be shared through pictures and words.",
        "Everyone has a unique story to share.",
        "Through listening and speaking, we connect with others and share our world.",
        "Playing with language helps us discover how language works.",
        "Curiosity and wonder lead us to new discoveries about ourselves and the world around us."
      ],
      "content": [
        "elements of story",
        "literary elements and devices",
        "vocabulary to talk about texts",
        "reading strategies",
        "oral language strategies",
        "metacognitive strategies",
        "writing processes",
        "concepts of print",
        "print awareness",
        "phonemic and phonological awareness",
        "letter formation",
        "sentence structure",
        "conventions"
      ],
      "elaborations": [
        {
          "term": "read fluently at grade level",
          "detail": "Reading with comprehension, phrasing, and attention to punctuation."
        },
        {
          "term": "elements of story",
          "detail": "Setting, character, events (few details)."
        },
        {
          "term": "literary elements and devices",
          "detail": "Poetic language, figurative language, sound play, images, colour, symbols."
        },
        {
          "term": "vocabulary to talk about texts",
          "detail": "Book, page, chapter, author, title, illustrator, pictures, web page, website, search box."
        },
        {
          "term": "story in First Peoples cultures",
          "detail": "Traditional/contemporary forms (prose, song, dance, poetry, theatre, carvings) for teaching, sharing creation stories, recording histories, mapping geography, cultural continuity, healing, entertainment."
        },
        {
          "term": "conventions of Canadian spelling, grammar, punctuation",
          "detail": "Capitals/small letters printed legibly; familiar words spelled correctly; correct use of periods, question marks, capitals (including I)."
        },
        {
          "term": "communication forms",
          "detail": "Lists, journals, notes, simple stories, digital/oral presentations, pictures, drama (puppet shows, dance, plays, storyboards)."
        }
      ]
    },
    "2": {
      "bigIdeas": [
        "Language and story can be a source of creativity and joy.",
        "Stories and other texts connect us to ourselves, our families, and our communities.",
        "Everyone has a unique story to share.",
        "Through listening and speaking, we connect with others and share our world.",
        "Playing with language helps us discover how language works.",
        "Curiosity and wonder lead us to new discoveries about ourselves and the world around us."
      ],
      "content": [
        "elements of story",
        "literary elements and devices",
        "text features",
        "vocabulary associated with texts",
        "reading strategies",
        "oral language strategies",
        "metacognitive strategies",
        "writing processes",
        "features of oral language",
        "word patterns, word families",
        "letter formation",
        "sentence structure",
        "conventions"
      ],
      "elaborations": [
        {
          "term": "elements of story",
          "detail": "Character, plot, setting, structure (beginning, middle, end), and dialogue."
        },
        {
          "term": "text features",
          "detail": "How text and visuals are displayed (colour, arrangement, bold, underline)."
        },
        {
          "term": "vocabulary associated with texts",
          "detail": "Book, page, chapter, author, title, illustrator, web page, website, search box, headings, table of contents, pictures, diagrams."
        },
        {
          "term": "text structures",
          "detail": "Letters, recipes, maps, lists, web pages."
        },
        {
          "term": "features of oral language",
          "detail": "Tone, volume, inflection, pace, gestures."
        },
        {
          "term": "sentence structure",
          "detail": "The structure of compound sentences."
        }
      ]
    },
    "3": {
      "bigIdeas": [
        "Language and story can be a source of creativity and joy.",
        "Stories and other texts help us learn about ourselves, our families, and our communities.",
        "Stories can be understood from different perspectives.",
        "Using language in creative and playful ways helps us understand how language works.",
        "Curiosity and wonder lead us to new discoveries about ourselves and the world around us."
      ],
      "content": [
        "elements of story",
        "functions and genres of stories and other texts",
        "text features",
        "literary elements and devices",
        "reading strategies",
        "oral language strategies",
        "metacognitive strategies",
        "writing processes",
        "features of oral language",
        "word patterns, word families",
        "legible handwriting",
        "sentence structure",
        "conventions"
      ],
      "elaborations": [
        {
          "term": "elements of story",
          "detail": "Character, plot, setting, conflict, and theme."
        },
        {
          "term": "text features",
          "detail": "Headings, diagrams, columns, sidebars."
        },
        {
          "term": "literary elements and devices",
          "detail": "Descriptive/poetic/figurative language, images, imagery, rhythm, rhyme, simile, alliteration."
        },
        {
          "term": "how story in First Peoples cultures connects people to land",
          "detail": "First Peoples stories were created to explain the landscape, seasons, and local events."
        },
        {
          "term": "word knowledge",
          "detail": "Morphology, including roots, affixes, and suffixes."
        },
        {
          "term": "oral traditions",
          "detail": "How culture is transmitted over generations other than through written records \u2014 told stories, songs, dance, carvings/masks; expresses both spiritual/emotional and literal truth."
        },
        {
          "term": "conventions",
          "detail": "Common practices in punctuation of sentences and apostrophe use in contractions."
        }
      ]
    },
    "4": {
      "bigIdeas": [
        "Language and text can be a source of creativity and joy.",
        "Exploring stories and other texts helps us understand ourselves and make connections to others and to the world.",
        "Texts can be understood from different perspectives.",
        "Using language in creative and playful ways helps us understand how language works.",
        "Questioning what we hear, read, and view contributes to our ability to be educated and engaged citizens."
      ],
      "content": [
        "forms, functions, and genres of text",
        "text features",
        "literary elements",
        "literary devices",
        "evidence",
        "reading strategies",
        "oral language strategies",
        "metacognitive strategies",
        "writing processes",
        "features of oral language",
        "paragraph structure",
        "sentence structure and grammar",
        "conventions"
      ],
      "elaborations": [
        {
          "term": "forms/functions/genres",
          "detail": "Forms such as narrative, exposition, report; functions are text purposes; genres are literary/thematic categories (fantasy, humour, adventure, biography)."
        },
        {
          "term": "literary elements",
          "detail": "Theme, character, setting, plot, conflict, purpose."
        },
        {
          "term": "literary devices",
          "detail": "Sensory detail (imagery) and figurative language (metaphor, simile)."
        },
        {
          "term": "organization in meaning",
          "detail": "Use of paragraphing, chronological order, and order of importance to convey meaning."
        },
        {
          "term": "oral tradition in First Peoples cultures",
          "detail": "Means of transmitting culture across generations other than written records \u2014 stories, songs, dance, carvings/masks; expresses spiritual/emotional and literal truth."
        },
        {
          "term": "purposes of First Peoples texts",
          "detail": "Teaching life lessons/skills, conveying community responsibilities, sharing family/community histories, explaining the natural world, recording history, mapping geography."
        },
        {
          "term": "paragraph structure",
          "detail": "Use of a topic sentence and supporting details."
        },
        {
          "term": "grammar",
          "detail": "Parts of speech; past, present, future tenses; subject-verb agreement."
        }
      ]
    },
    "5": {
      "bigIdeas": [
        "Language and text can be a source of creativity and joy.",
        "Exploring stories and other texts helps us understand ourselves and make connections to others and to the world.",
        "Texts can be understood from different perspectives.",
        "Using language in creative and playful ways helps us understand how language works.",
        "Questioning what we hear, read, and view contributes to our ability to be educated and engaged citizens."
      ],
      "content": [
        "forms, functions, and genres of text",
        "text features",
        "literary elements",
        "literary devices",
        "perspective/point of view",
        "reading strategies",
        "oral language strategies",
        "metacognitive strategies",
        "writing processes",
        "features of oral language",
        "paragraphing",
        "sentence structure and grammar",
        "conventions"
      ],
      "elaborations": [
        {
          "term": "literary elements",
          "detail": "Narrative structures and characterization."
        },
        {
          "term": "thinking skills",
          "detail": "Exploring new ideas, determining relative importance, considering alternative viewpoints, developing explanations, summarizing, analyzing, synthesizing."
        },
        {
          "term": "use writing and design processes",
          "detail": "Planning/drafting/editing across forms \u2014 opinion pieces, poetry, short stories, narrative, slams, spoken word, storyboards/comic strips, masks, multimedia."
        },
        {
          "term": "word knowledge",
          "detail": "Morphology, including roots, affixes, and suffixes."
        },
        {
          "term": "conventions",
          "detail": "Uses of the comma, quotation marks for dialogue, apostrophe in contractions; capitalization in titles/headings; Canadian spelling."
        }
      ]
    },
    "6": {
      "bigIdeas": [
        "Language and text can be a source of creativity and joy.",
        "Exploring stories and other texts helps us understand ourselves and make connections to others and to the world.",
        "Exploring and sharing multiple perspectives extends our thinking.",
        "Developing our understanding of how language works allows us to use it purposefully.",
        "Questioning what we hear, read, and view contributes to our ability to be educated and engaged citizens."
      ],
      "content": [
        "forms, functions, and genres of text",
        "text features",
        "literary elements",
        "literary devices",
        "techniques of persuasion",
        "reading strategies",
        "oral language strategies",
        "metacognitive strategies",
        "writing processes",
        "features of oral language",
        "paragraphing",
        "language varieties",
        "sentence structure and grammar",
        "conventions",
        "presentation techniques"
      ],
      "elaborations": [
        {
          "term": "literary elements, techniques, devices",
          "detail": "Characterization, mood, foreshadowing, conflict, protagonist/antagonist, theme, imagery, sound devices."
        },
        {
          "term": "techniques of persuasion",
          "detail": "Use of emotional and logical appeals to persuade."
        },
        {
          "term": "language varieties",
          "detail": "Regional dialects, standard Canadian vs American English, formal vs informal registers, situational varieties (texting vs essay writing)."
        },
        {
          "term": "refine texts",
          "detail": "Using verbs effectively, repetition/substitution for effect, adding modifiers, varying sentence types, precise diction."
        },
        {
          "term": "oral tradition",
          "detail": "Means of transmitting culture across generations other than written records."
        }
      ]
    },
    "7": {
      "bigIdeas": [
        "Language and text can be a source of creativity and joy.",
        "Exploring stories and other texts helps us understand ourselves and make connections to others and to the world.",
        "Exploring and sharing multiple perspectives extends our thinking.",
        "Developing our understanding of how language works allows us to use it purposefully.",
        "Questioning what we hear, read, and view contributes to our ability to be educated and engaged citizens."
      ],
      "content": [
        "forms, functions, and genres of text",
        "text features",
        "literary elements",
        "literary devices",
        "argument",
        "reading strategies",
        "oral language strategies",
        "metacognitive strategies",
        "writing processes",
        "features of oral language",
        "paragraphing",
        "language varieties",
        "syntax and sentence fluency",
        "conventions",
        "presentation techniques"
      ],
      "elaborations": [
        {
          "term": "validity of First Peoples oral tradition",
          "detail": "Recognize similarities/differences between oral and written records; oral tradition has the same validity, importance, and permanence for First Peoples as written texts for other cultures."
        },
        {
          "term": "how literary elements enhance meaning",
          "detail": "Metaphor brings fresh perspective; diction influences emotional response; hyperbole exaggerates for emphasis; sound devices add to/disrupt aesthetics; imagery evokes sensory experience."
        },
        {
          "term": "refine texts",
          "detail": "Adjusting diction/form for audience, active vs passive voice, parallelism, eliminating wordiness."
        },
        {
          "term": "syntax and sentence fluency",
          "detail": "Mix of simple/compound/complex sentences; pronoun use; subject-verb agreement; transitional words; run-ons and fragments."
        }
      ]
    },
    "8": {
      "bigIdeas": [
        "Language and text can be a source of creativity and joy.",
        "Exploring stories and other texts helps us understand ourselves and make connections to others and to the world.",
        "People understand text differently depending on their worldviews and perspectives.",
        "Texts are socially, culturally, and historically constructed.",
        "Questioning what we hear, read, and view contributes to our ability to be educated and engaged citizens."
      ],
      "content": [
        "forms, functions, and genres of text",
        "text features",
        "literary elements",
        "literary devices",
        "elements of visual/graphic texts",
        "relevance, accuracy, reliability",
        "reading strategies",
        "oral language strategies",
        "metacognitive strategies",
        "writing processes",
        "features of oral language",
        "multi-paragraphing",
        "language usage and context",
        "elements of style",
        "syntax and sentence fluency",
        "conventions",
        "presentation techniques"
      ],
      "elaborations": [
        {
          "term": "protocols",
          "detail": "As applied to local First Peoples stories: recognized customs about when/where stories can be shared, who owns them, who can share them."
        },
        {
          "term": "elements of visual/graphic texts",
          "detail": "Layout, infographics, emoticons, icons, symbols, interactive visuals, hypertext, colour, illustration styles."
        },
        {
          "term": "elements of style",
          "detail": "Diction, figurative language, tone, inclusive language, degree of formality."
        },
        {
          "term": "language usage and context",
          "detail": "Impact of context on language choice (informal texting vs formal essay writing)."
        }
      ]
    },
    "9": {
      "bigIdeas": [
        "Language and story can be a source of creativity and joy.",
        "Exploring stories and other texts helps us understand ourselves and make connections to others and to the world.",
        "People understand text differently depending on their worldviews and perspectives.",
        "Texts are socially, culturally, and historically constructed.",
        "Questioning what we hear, read, and view contributes to our ability to be educated and engaged citizens."
      ],
      "content": [
        "forms, functions, and genres of text",
        "text features",
        "literary elements",
        "literary devices",
        "elements of visual/graphic texts",
        "reading strategies",
        "oral language strategies",
        "metacognitive strategies",
        "writing processes",
        "features of oral language",
        "multi-paragraphing",
        "language change",
        "elements of style",
        "usage",
        "syntax and sentence fluency",
        "conventions",
        "presentation techniques",
        "rhetorical devices",
        "connotation and denotation"
      ],
      "elaborations": [
        {
          "term": "diversity within and across First Peoples societies",
          "detail": "Variety of worldviews and perspectives, diverse traditions, range of historical experiences."
        },
        {
          "term": "language change",
          "detail": "Languages change slowly but continually; evident in dialects; new words emerge as culture changes; new media accelerates change."
        },
        {
          "term": "rhetorical devices",
          "detail": "Figurative language, parallelism, repetition, irony, humour, exaggeration, emotional language, logic, direct address, rhetorical questions, allusion."
        },
        {
          "term": "spelling",
          "detail": "Canadian spelling focus (-our, -re, -ize endings; doubled consonants; grey, licence)."
        }
      ]
    }
  }
};

export default CURRICULUM_ELABORATIONS;
