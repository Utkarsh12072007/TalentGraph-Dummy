// Status transition rules.
//
// Both pipelines are state machines. The backend is the only place that
// decides whether a transition is legal — the frontend merely renders the
// same map to show/hide buttons.

const APPLICATION_TRANSITIONS = {
  APPLIED: ['IN_REVIEW', 'SHORTLISTED', 'REJECTED'],
  IN_REVIEW: ['SHORTLISTED', 'INTERVIEW', 'REJECTED'],
  SHORTLISTED: ['INTERVIEW', 'OFFERED', 'REJECTED'],
  INTERVIEW: ['OFFERED', 'REJECTED'],
  OFFERED: ['REJECTED'], // offer declined / rescinded
  REJECTED: [],          // terminal
  WITHDRAWN: [],         // terminal
};

// Statuses a candidate may withdraw from (i.e. non-terminal ones).
const WITHDRAWABLE_FROM = ['APPLIED', 'IN_REVIEW', 'SHORTLISTED', 'INTERVIEW', 'OFFERED'];

const JOB_TRANSITIONS = {
  DRAFT: ['PUBLISHED', 'ARCHIVED'],
  PUBLISHED: ['CLOSED', 'ARCHIVED'],
  CLOSED: ['PUBLISHED', 'ARCHIVED'], // reopen is allowed
  ARCHIVED: [],
};

function canTransition(map, from, to) {
  return (map[from] || []).includes(to);
}

module.exports = { APPLICATION_TRANSITIONS, JOB_TRANSITIONS, WITHDRAWABLE_FROM, canTransition };
