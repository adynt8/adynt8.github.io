// Question of the week. One question per ISO-style week, cycling through the list.
// IDs must stay stable (votes are stored against them) and match /^q\d{1,3}$/.
// To add a question, append it; don't reorder or renumber existing ones.
export const POLLS = [
  { id: 'q1', question: 'Before you measured, where did you think you stood?', options: ['Below average', 'About average', 'Above average', 'No idea'] },
  { id: 'q2', question: 'Grower or shower?', options: ['Grower', 'Shower', 'Somewhere in between', 'Not sure'] },
  { id: 'q3', question: 'Which do you think matters more?', options: ['Length', 'Girth', 'Both equally', 'Neither, really'] },
  { id: 'q4', question: 'Have you ever exaggerated your size to someone?', options: ['Never', 'Rounded up a little', 'Yes, by a lot', 'I round down'] },
  { id: 'q5', question: 'How often do you think about your size?', options: ['Rarely or never', 'Now and then', 'Most weeks', 'Most days'] },
  { id: 'q6', question: 'Has a partner ever commented on your size?', options: ['Yes, positively', 'Yes, negatively', 'Both', 'Never'] },
  { id: 'q7', question: 'Has porn changed what you think of as average?', options: ['Yes, a lot', 'A little', 'Not really', 'Not sure'] },
  { id: 'q8', question: 'How did your result here make you feel?', options: ['Better', 'Worse', 'No different', "Haven't measured yet"] },
  { id: 'q9', question: 'How do standard condoms fit you?', options: ['Too tight', 'Too loose', 'It varies', 'They fit fine'] },
  { id: 'q10', question: 'If you could change one thing, what would it be?', options: ['Longer', 'Thicker', 'Both', "Nothing, I'm happy"] },
  { id: 'q11', question: 'Do you press the ruler to the pubic bone when measuring?', options: ['Always', 'Sometimes', 'Never', "What's that?"] },
  { id: 'q12', question: 'Who knows your exact measurements?', options: ['Only me', 'A partner', 'Friends too', "I don't know them myself"] },
  { id: 'q13', question: "How accurate are most men's claimed sizes?", options: ['Mostly honest', 'Rounded up a bit', 'Wildly inflated', 'No idea'] },
  { id: 'q14', question: 'Before today, when did you last measure?', options: ['This month', 'This year', 'Years ago', 'Never'] },
  { id: 'q15', question: 'How much does size affect your confidence?', options: ['A lot', 'Somewhat', 'Barely', 'Not at all'] },
  { id: 'q16', question: 'What worries you more?', options: ['Erect size', 'Flaccid size', 'Both', 'Neither'] },
];

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const EPOCH = Date.UTC(2026, 10, 16); // Monday 16 November 2026, 00:00 UTC

const weekIndex = (date) => Math.floor((+date - EPOCH) / WEEK_MS);

/** The poll for the week containing `date`; `offset` −1 gives last week's. */
export function pollForDate(date = new Date(), offset = 0) {
  const n = POLLS.length;
  return POLLS[(((weekIndex(date) + offset) % n) + n) % n];
}

/** Whole days until the question changes (1–7). */
export function daysUntilNextPoll(date = new Date()) {
  const next = EPOCH + (weekIndex(date) + 1) * WEEK_MS;
  return Math.max(1, Math.ceil((next - +date) / (24 * 60 * 60 * 1000)));
}
