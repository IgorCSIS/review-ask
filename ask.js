/*
 * Review Ask: the homeowner page.
 *
 * One job, one button. There is no rating widget, no "how did we do", and no
 * branch of any kind, because a page that asks how you feel before it decides
 * which link to show you is review gating, and Google does not allow it.
 * Every homeowner who lands here sees the same page.
 *
 * The only input is ?job=, and it is matched against the known ids rather
 * than read. An unknown value falls back to the generic wording and is never
 * written to the page.
 */

(function () {
  "use strict";

  var DATA = window.ReviewAskData;

  var els = {
    title: document.getElementById("ask-title"),
    body: document.getElementById("ask-body"),
    button: document.getElementById("review-button"),
    sampleUrl: document.getElementById("sample-url"),
    noThanks: document.getElementById("no-thanks"),
    secondary: document.querySelector(".ask-secondary"),
  };

  /**
   * Find the job named by ?job=, if it is one we know about.
   *
   * Matching against the known ids rather than trusting the parameter is the
   * whole defence here: the value never reaches the DOM, so there is nothing
   * to escape and nothing to get wrong.
   *
   * @returns {object|null} the job, or null for missing or unknown ids
   */
  function currentJob() {
    var id;
    try {
      id = new URLSearchParams(window.location.search).get("job");
    } catch (err) {
      return null;
    }
    if (!id) return null;

    var found = null;
    DATA.JOBS.forEach(function (job) {
      if (job.id === id) found = job;
    });
    return found;
  }

  /** Put the sample Google URL on screen as text, next to its label. */
  function showSampleUrl() {
    if (els.sampleUrl) els.sampleUrl.textContent = DATA.SAMPLE_REVIEW_URL;
  }

  /**
   * Fill in the greeting for a known job.
   *
   * The generic copy is what the page already ships with, so an unknown id
   * needs no work: leaving the markup alone is the fallback.
   */
  function applyJob(job) {
    if (!job) return;

    els.title.textContent =
      "Thanks for choosing " + DATA.COMPANY.name + ", " + job.first + ".";
    els.body.textContent =
      "Your " +
      job.job +
      " is done. If you have a minute, an honest Google review helps other East County " +
      "homeowners find us.";
  }

  /**
   * Replace the ask with a plain thank-you.
   *
   * No guilt, no feedback form, no second ask. Somebody who says no thanks has
   * answered, and a page that argues with that answer is the thing this demo
   * exists to avoid.
   */
  function declineAsk() {
    var line = document.createElement("p");
    line.className = "ask-body";
    line.textContent = "No problem. Thanks again for having us out.";

    var card = els.button.parentNode;
    card.replaceChild(line, els.button);

    var label = document.querySelector(".sample-label");
    if (label && label.parentNode) label.parentNode.removeChild(label);
    if (els.sampleUrl && els.sampleUrl.parentNode) {
      els.sampleUrl.parentNode.removeChild(els.sampleUrl);
    }
    if (els.secondary && els.secondary.parentNode) {
      els.secondary.parentNode.removeChild(els.secondary);
    }
  }

  showSampleUrl();
  applyJob(currentJob());

  if (els.noThanks) {
    els.noThanks.addEventListener("click", declineAsk);
  }
})();
