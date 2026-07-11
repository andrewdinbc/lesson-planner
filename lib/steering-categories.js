// lib/steering-categories.js
// The three-part taxonomy Aj wants steering resources organized into. Each
// category plays a distinct role in how it's applied during generation
// (see the framing text below, used directly in app/api/generate/route.js)
// rather than just being three flat tags.

export const STEERING_CATEGORIES = [
  {
    key: 'philosophy_of_education',
    label: 'Philosophy of Education',
    description: 'Why we teach - the purpose, values, and vision behind instruction.',
    // How this category should be used when generating a plan.
    promptRole: 'Ground the overall purpose and framing of the lesson in this philosophy. Let it shape WHY the lesson matters and how it\u2019s introduced to students, not just what activities are chosen.',
  },
  {
    key: 'psychology_of_education',
    label: 'Psychology of Education',
    description: 'How students actually learn - cognitive, developmental, and motivational principles.',
    promptRole: 'Use this to justify the lesson\u2019s pacing, scaffolding, and sequencing decisions - e.g. how much cognitive load a task should carry, how feedback and practice are spaced, how motivation is sustained.',
  },
  {
    key: 'actionable_resources',
    label: 'Actionable Resources',
    description: 'Concrete strategies, techniques, and activity structures ready to apply directly.',
    promptRole: 'Pull specific activity structures, techniques, and classroom moves from this material directly into the lesson\u2019s actual tasks and steps - this is the most literal, closest-to-copy source of the three.',
  },
]

export const STEERING_CATEGORY_MAP = Object.fromEntries(
  STEERING_CATEGORIES.map((c) => [c.key, c])
)

export const DEFAULT_CATEGORY = 'actionable_resources'
