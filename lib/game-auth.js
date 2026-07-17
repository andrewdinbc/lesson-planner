// lib/game-auth.js
// Host authorization for live/draw sessions works two ways:
//  1. In-app (existing behavior): the requester is logged into
//     lesson-planner and their user_id matches session.user_id.
//  2. Cross-app (new, 2026-07-18): the requester has no lesson-planner
//     login at all (they're a teacher in Math Mastery, Assessment Tool,
//     etc.) -- they instead present the host_token that was handed back
//     when /api/games/create made the session on their behalf.
// A session only has a host_token if it was created cross-app; in-app
// sessions have host_token = null and can only be hosted via path 1.

export function isAuthorizedHost(session, user, hostToken) {
  if (user && session.user_id && user.id === session.user_id) return true
  if (hostToken && session.host_token && hostToken === session.host_token) return true
  return false
}
