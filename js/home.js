// Homepage extras that give people a reason to return: a welcome-back summary and the weekly poll.
import { $, esc, toast } from './layout.js';
import { empiricalPercentile, formatPercentile } from './stats.js';
import * as store from './store.js';
import { fetchCommunity, fetchPollResults, castVote } from './api.js';
import { pollForDate, daysUntilNextPoll } from './polls.js';
import { monthStreak, daysSinceLastEntry } from './progress-stats.js';
import { COMMUNITY_MIN_N } from './config.js';

const days = (n) => (n === 0 ? 'today' : n === 1 ? 'yesterday' : `${n} days ago`);

// ---------- Welcome back ----------

// Lets the poll add a line to the welcome panel once it knows there's an unanswered question.
let addWelcomeItem = () => {};

async function renderWelcome() {
  const el = $('#welcome');
  const visits = store.recordVisit();
  const state = store.load();
  if (!el || !visits.previous || !store.hasMeasurements(state.measurements)) return;

  const since = new Date(visits.previous);
  const awayDays = Math.floor((Date.now() - +since) / 86400000);
  if (awayDays < 1) return;

  const items = [];
  const lastLog = daysSinceLastEntry(state.history);
  const streak = monthStreak(state.history);
  if (lastLog == null) {
    items.push('You haven\'t started a progress log yet. <a href="progress.html">Log your first entry</a> to track changes over time.');
  } else {
    items.push(`You last logged a measurement ${days(lastLog)}${streak > 1 ? ` · <strong>${streak}-month streak</strong>` : ''}. <a href="progress.html">${lastLog >= 25 ? 'Time for a new entry' : 'Open your log'}</a>`);
  }

  const paint = () => {
    el.innerHTML = `<h2>Welcome back</h2>
      <p class="muted">Your last visit was ${days(awayDays)}. Here's what's new.</p>
      <ul>${items.map((i) => `<li>${i}</li>`).join('')}</ul>`;
    el.classList.remove('hidden');
  };
  paint();
  addWelcomeItem = (html) => { items.push(html); paint(); };

  try {
    const rows = await fetchCommunity();
    const fresh = rows.filter((r) => r.timestamp && new Date(r.timestamp) > since).length;
    if (fresh > 0) items.push(`<strong>${fresh}</strong> new ${fresh === 1 ? 'entry' : 'entries'} in the <a href="community.html">community stats</a> since then.`);
    const lengths = rows.map((r) => r.erectLength).filter(Number.isFinite);
    const mine = state.measurements.erectLength;
    if (Number.isFinite(mine) && lengths.length >= COMMUNITY_MIN_N) {
      const p = empiricalPercentile(mine, lengths);
      items.push(`Among ${lengths.length} site users, your erect length is at the <strong>${esc(formatPercentile(p))} percentile</strong>.`);
    }
    paint();
  } catch { /* community data is optional */ }
}

// ---------- Question of the week ----------

function resultsHtml(poll, counts, mine) {
  const total = counts.reduce((s, c) => s + c, 0);
  return `<div class="poll-results">${poll.options.map((label, i) => {
    const pct = total ? Math.round((counts[i] / total) * 100) : 0;
    return `<div class="poll-row${i === mine ? ' mine' : ''}">
      <div class="poll-bar" style="width:${pct}%"></div>
      <span>${esc(label)}${i === mine ? ' <small>· your answer</small>' : ''}</span><b>${pct}%</b>
    </div>`;
  }).join('')}</div>
  <p class="muted poll-foot">${total.toLocaleString()} ${total === 1 ? 'vote' : 'votes'} · new question in ${daysUntilNextPoll()} ${daysUntilNextPoll() === 1 ? 'day' : 'days'}</p>`;
}

async function renderPoll() {
  const el = $('#poll');
  if (!el) return;
  const poll = pollForDate();
  const last = pollForDate(new Date(), -1);
  const n = poll.options.length;

  let counts;
  try {
    counts = await fetchPollResults(poll.id, n);
  } catch {
    return; // polls aren't set up on the backend (or it's offline): keep the card hidden
  }

  const body = () => {
    const mine = store.load().votes?.[poll.id];
    return mine != null
      ? resultsHtml(poll, counts, mine)
      : `<div class="poll-options">${poll.options.map((label, i) => `<button type="button" class="btn" data-choice="${i}">${esc(label)}</button>`).join('')}</div>
         <p class="muted poll-foot">Anonymous. Vote to see how others answered.</p>`;
  };

  el.innerHTML = `<span class="tag">Question of the week</span>
    <h2>${esc(poll.question)}</h2>
    <div id="poll-body">${body()}</div>
    <div id="poll-last" class="muted"></div>`;
  el.classList.remove('hidden');
  if (store.load().votes?.[poll.id] == null) {
    addWelcomeItem(`This week's question: “${esc(poll.question)}” <a href="#poll">Vote and see the results</a>`);
  }

  el.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-choice]');
    if (!btn) return;
    const choice = Number(btn.dataset.choice);
    el.querySelectorAll('[data-choice]').forEach((b) => { b.disabled = true; });
    try {
      counts = await castVote(poll.id, store.visitorId(), choice, n);
      const state = store.load();
      store.update({ votes: { ...state.votes, [poll.id]: choice } });
    } catch {
      toast('Could not record your vote — please try again');
    }
    $('#poll-body').innerHTML = body();
  });

  try {
    const prev = await fetchPollResults(last.id, last.options.length);
    const total = prev.reduce((s, c) => s + c, 0);
    if (total >= 5 && last.id !== poll.id) {
      const top = prev.indexOf(Math.max(...prev));
      $('#poll-last').innerHTML = `Last week: “${esc(last.question)}” — <strong>${esc(last.options[top])}</strong> led with ${Math.round((prev[top] / total) * 100)}%.`;
    }
  } catch { /* optional */ }
}

renderWelcome();
renderPoll();
