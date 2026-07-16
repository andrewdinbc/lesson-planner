-- Adds real BC curriculum data to unit_priorities so units can be
-- auto-populated from curriculum.gov.bc.ca (via lib/bc-curriculum.js,
-- already built) instead of teachers typing unit names from scratch.

ALTER TABLE unit_priorities ADD COLUMN IF NOT EXISTS content_summary TEXT;
-- The specific Content bullet points this unit was clustered from --
-- shown on hover, mirroring curriculum.gov.bc.ca's own hover-to-elaborate
-- behavior.

ALTER TABLE unit_priorities ADD COLUMN IF NOT EXISTS curricular_competency TEXT;
-- Kept separate from content_summary -- shown in an expandable section,
-- not the primary focus (Content is), per Aj's explicit instruction.

ALTER TABLE unit_priorities ADD COLUMN IF NOT EXISTS grades TEXT[];
-- Which grade(s) this unit applies to -- an array so split-grade classes
-- (e.g. a combined 4/5) can have a unit cover both, distinct from a
-- straightforward single-grade class.

ALTER TABLE unit_priorities ADD COLUMN IF NOT EXISTS source_url TEXT;
-- Link back to the official curriculum.gov.bc.ca page this was pulled
-- from, for transparency/verification.
