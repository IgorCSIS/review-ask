/*
 * Review Ask: the owner console simulation.
 *
 * Nothing here sends anything. There is no network call, no key, no backend
 * and no third party script. Pressing the button walks a scripted timeline
 * and fills two panels with the messages a real install would send, which is
 * what makes this safe to host for free and safe to show a stranger.
 *
 * The timing is compressed rather than real, and says so on the page: two
 * days of waiting would be a poor demo, but pretending the reminder goes out
 * four seconds after the ask would be a lie. Each step carries both clocks,
 * the demo one and the real one.
 *
 * Every string that reaches the page goes through textContent. There is no
 * innerHTML in this file, which is why a saved template can never become
 * markup no matter what somebody types into it.
 */

(function () {
  "use strict";

  var DATA = window.ReviewAskData;

  /*
   * When each thing happens, in milliseconds from the press.
   *
   * The first beat is 400ms rather than 0 so the busy state gets painted
   * before it is replaced; the timeline labels it 0s because that is the
   * real-life claim being made.
   */
  var CLOCK = {
    ask: 400,
    reminder: 4000,
    tapped: 8000,
    thanks: 11000,
  };

  /** The last number on the timeline, and where the elapsed readout stops. */
  var TOTAL_SECONDS = 11;

  /** Step order, which is also the order the panels fill in. */
  var ORDER = ["ask", "reminder", "tapped", "thanks"];

  var els = {
    run: document.getElementById("run-ask"),
    status: document.getElementById("run-status"),
    selected: document.getElementById("selected-job"),
    segments: Array.prototype.slice.call(document.querySelectorAll("[data-channel]")),
    timeline: document.getElementById("timeline"),
    elapsed: document.getElementById("elapsed"),
    homeownerBody: document.getElementById("homeowner-body"),
    homeownerState: document.getElementById("homeowner-state"),
    ownerBody: document.getElementById("owner-body"),
    ownerState: document.getElementById("owner-state"),
    jobList: document.getElementById("job-list"),
    jobsEmpty: document.getElementById("jobs-empty"),
    seeHomeowner: document.getElementById("see-homeowner"),
    reset: document.getElementById("reset-demo"),
    templateFields: document.getElementById("template-fields"),
    saveTemplates: document.getElementById("save-templates"),
    restoreTemplates: document.getElementById("restore-templates"),
    templateStatus: document.getElementById("template-status"),
  };

  var channel = "text";
  var jobId = DATA.JOBS[0].id;
  var asked = {};
  var running = false;
  var ticker = null;
  var storageOk = true;
  var templates = defaults();

  /* ------------------------------------------------------------- helpers */

  function reducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  /**
   * Resolve once the clock reads `ms` past `startedAt`.
   *
   * Paced against the wall clock rather than chained delays, so a slow frame
   * or a backgrounded tab cannot let the steps drift away from the seconds
   * printed next to them.
   */
  function waitUntil(startedAt, ms) {
    /*
     * Reduced motion suppresses the pulse and the transitions, which is what
     * the preference is actually about. It used to return here immediately,
     * which collapsed all four steps into a single tick: the ask, the
     * reminder, the tap and the thank-you landed at once while the readout
     * still printed the full 11 seconds. The sequence is the content of this
     * demo, not decoration, so it keeps its pacing for everybody.
     */
    var remaining = ms - (Date.now() - startedAt);
    return new Promise(function (resolve) {
      window.setTimeout(resolve, remaining > 0 ? remaining : 0);
    });
  }

  /** A fresh deep copy of the shipped wording. */
  function defaults() {
    return JSON.parse(JSON.stringify(DATA.DEFAULT_TEMPLATES));
  }

  /** The job currently selected, always one of the three. */
  function job() {
    var found = DATA.JOBS[0];
    DATA.JOBS.forEach(function (candidate) {
      if (candidate.id === jobId) found = candidate;
    });
    return found;
  }

  /** Where {review_link} points for a job, shown as text. */
  function reviewLink(current) {
    return DATA.ASK_PAGE_BASE + current.id;
  }

  /**
   * Substitute the four placeholders.
   *
   * A plain replace over a fixed list of keys. Anything the author typed that
   * is not on the list is left exactly as typed, and the result only ever
   * reaches the page through textContent.
   */
  function fill(template, current) {
    var values = {
      first_name: current.first,
      company: DATA.COMPANY.name,
      job: current.job,
      review_link: reviewLink(current),
    };
    var out = String(template);
    DATA.PLACEHOLDERS.forEach(function (key) {
      out = out.split("{" + key + "}").join(values[key]);
    });
    return out;
  }

  /** Remove every child of a node without touching innerHTML. */
  function clear(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  /** Build an element with a class and some text. */
  function make(tag, className, text) {
    var el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined && text !== null) el.textContent = text;
    return el;
  }

  /** Show a line of status under the button. */
  function say(message, tone) {
    els.status.textContent = message;
    els.status.setAttribute("data-tone", tone || "info");
  }

  /** Set the small state chip on a panel header. */
  function setPanelState(el, label, tone) {
    el.textContent = label;
    el.className = "chip " + (tone || "chip-quiet");
  }

  function setStep(name, stateName) {
    var step = els.timeline.querySelector('[data-step="' + name + '"]');
    if (step) step.setAttribute("data-state", stateName);
  }

  function resetSteps() {
    ORDER.forEach(function (name) {
      setStep(name, "pending");
    });
  }

  function showElapsed(seconds) {
    els.elapsed.textContent = Math.min(Math.max(seconds, 0), TOTAL_SECONDS) + "s";
  }

  function startClock(startedAt) {
    showElapsed(0);
    els.elapsed.setAttribute("data-running", "true");
    /*
     * Reduced motion gets the same readout on a one second tick instead of ten
     * a second. The thing that preference is about is the flicker, not the
     * number. Stopping the ticker outright, which is what used to happen here,
     * now that the steps keep their pacing would leave the counter frozen at
     * 0s for the whole run and then jump to 11s at the end.
     */
    ticker = window.setInterval(
      function () {
        showElapsed(Math.floor((Date.now() - startedAt) / 1000));
      },
      reducedMotion() ? 1000 : 100,
    );
  }

  function stopClock(seconds) {
    if (ticker !== null) {
      window.clearInterval(ticker);
      ticker = null;
    }
    els.elapsed.setAttribute("data-running", "false");
    showElapsed(seconds);
  }

  /* ------------------------------------------------------------- storage */

  /**
   * Read saved template edits.
   *
   * Everything in localStorage is untrusted: another script on the origin, an
   * older version of this page, or somebody with the console open could have
   * written it. So the shape is checked key by key, values have to be strings,
   * each is capped, and anything that does not match falls back to the
   * shipped default rather than being repaired.
   */
  function loadTemplates() {
    var raw;
    try {
      raw = window.localStorage.getItem(DATA.STORAGE_KEY);
    } catch (err) {
      storageOk = false;
      return defaults();
    }
    if (!raw) return defaults();

    var parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      return defaults();
    }
    if (!parsed || typeof parsed !== "object") return defaults();

    var out = defaults();
    ["text", "email"].forEach(function (key) {
      var saved = parsed[key];
      if (!saved || typeof saved !== "object") return;
      Object.keys(out[key]).forEach(function (field) {
        var value = saved[field];
        if (typeof value !== "string") return;
        if (value.length === 0 || value.length > DATA.MAX_TEMPLATE_CHARS) return;
        if (hasBlockedPhrase(value)) return;
        out[key][field] = value;
      });
    });
    return out;
  }

  /** Persist the edits, and say so if the browser will not keep them. */
  function saveTemplates() {
    try {
      window.localStorage.setItem(DATA.STORAGE_KEY, JSON.stringify(templates));
      return true;
    } catch (err) {
      storageOk = false;
      return false;
    }
  }

  function clearStorage() {
    try {
      window.localStorage.removeItem(DATA.STORAGE_KEY);
    } catch (err) {
      storageOk = false;
    }
  }

  /* -------------------------------------------------------------- panels */

  function clearPanels() {
    clear(els.homeownerBody);
    els.homeownerBody.appendChild(
      make("p", "panel-empty", "Nothing sent yet. Pick a job and run the ask.")
    );
    clear(els.ownerBody);
    els.ownerBody.appendChild(
      make("p", "panel-empty", "You'll see each simulated send, and when the link gets tapped.")
    );
    setPanelState(els.homeownerState, "Waiting", "chip-quiet");
    setPanelState(els.ownerState, "Waiting", "chip-quiet");
  }

  /** Drop the empty-state paragraph the first time something lands. */
  function firstWrite(node) {
    var empty = node.querySelector(".panel-empty");
    if (empty) node.removeChild(empty);
  }

  /**
   * Add one message to the homeowner panel.
   *
   * A text message renders as a bubble with the number it went to. An email
   * renders as a card with its subject line above the body, because a subject
   * the owner cannot see is a subject they cannot check.
   */
  function addHomeownerMessage(kind, current) {
    firstWrite(els.homeownerBody);

    if (channel === "text") {
      var bubble = make("div", "bubble");
      bubble.appendChild(make("p", "bubble-meta", "Text to " + current.phone));
      bubble.appendChild(make("p", "bubble-body", fill(templates.text[kind], current)));
      els.homeownerBody.appendChild(bubble);
      return;
    }

    var card = make("div", "email-card");
    card.appendChild(make("p", "bubble-meta", "Email to " + current.email));
    card.appendChild(
      make("p", "email-subject", fill(templates.email[kind + "Subject"], current))
    );
    card.appendChild(make("p", "email-body", fill(templates.email[kind], current)));
    els.homeownerBody.appendChild(card);
  }

  /** Add one line to the owner's trail. */
  function addOwnerLine(label, detail) {
    firstWrite(els.ownerBody);
    var line = make("div", "trail-line");
    line.appendChild(make("span", "trail-label", label));
    line.appendChild(make("span", "trail-detail", detail));
    els.ownerBody.appendChild(line);
  }

  /* ---------------------------------------------------------- the job list */

  /** The label under the headline, and the link to the homeowner page. */
  function applySelectionCopy() {
    var current = job();
    els.selected.textContent =
      "Sample job: " +
      current.name +
      " · " +
      current.job +
      " · " +
      current.city;
    els.seeHomeowner.textContent = "See what " + current.first + " sees";
    els.seeHomeowner.setAttribute("href", "ask.html?job=" + current.id);
  }

  /** Rebuild the job cards from scratch, which keeps the states honest. */
  function renderJobs() {
    clear(els.jobList);

    var allAsked = DATA.JOBS.every(function (current) {
      return asked[current.id] === true;
    });
    els.jobsEmpty.hidden = !allAsked;

    DATA.JOBS.forEach(function (current) {
      var chosen = current.id === jobId;
      var card = document.createElement("button");
      card.type = "button";
      card.className = "job-card";
      card.setAttribute("role", "radio");
      card.setAttribute("aria-checked", chosen ? "true" : "false");
      card.tabIndex = chosen ? 0 : -1;
      card.setAttribute("data-job", current.id);

      var head = make("span", "job-head");
      head.appendChild(make("span", "job-name", current.name));
      head.appendChild(
        make(
          "span",
          asked[current.id] ? "chip chip-done" : "chip chip-quiet",
          asked[current.id] ? "Asked" : "Not asked"
        )
      );
      card.appendChild(head);
      card.appendChild(make("span", "job-meta", current.job + " · " + current.city));
      card.appendChild(make("span", "job-finished", "Finished: " + current.finished));

      card.addEventListener("click", function () {
        pickJob(current.id, false);
      });
      card.addEventListener("keydown", function (event) {
        var step = 0;
        if (event.key === "ArrowRight" || event.key === "ArrowDown") step = 1;
        if (event.key === "ArrowLeft" || event.key === "ArrowUp") step = -1;
        if (step === 0) return;
        event.preventDefault();
        var index = 0;
        DATA.JOBS.forEach(function (candidate, i) {
          if (candidate.id === current.id) index = i;
        });
        var next = DATA.JOBS[(index + step + DATA.JOBS.length) % DATA.JOBS.length];
        pickJob(next.id, true);
      });

      els.jobList.appendChild(card);
    });
  }

  /** Select a job, and put the run back to its starting state. */
  function pickJob(id, moveFocus) {
    if (running) return;
    var known = false;
    DATA.JOBS.forEach(function (current) {
      if (current.id === id) known = true;
    });
    if (!known) return;

    jobId = id;
    renderJobs();
    applySelectionCopy();
    resetRun();

    if (moveFocus) {
      var card = els.jobList.querySelector('[data-job="' + id + '"]');
      if (card) card.focus();
    }
  }

  /* ------------------------------------------------------------- channel */

  function selectChannel(key, moveFocus) {
    if (running || (key !== "text" && key !== "email")) return;

    channel = key;
    els.segments.forEach(function (seg) {
      var chosen = seg.getAttribute("data-channel") === key;
      seg.setAttribute("aria-checked", chosen ? "true" : "false");
      seg.tabIndex = chosen ? 0 : -1;
      if (chosen && moveFocus) seg.focus();
    });

    renderTemplateFields();
    resetRun();
  }

  /** Put the timeline, panels, clock and button back to their start. */
  function resetRun() {
    resetSteps();
    clearPanels();
    stopClock(0);
    els.run.textContent = "Run review ask";
    els.run.className = "btn btn-primary";
    say("Demo only. Nothing is sent.", "info");
  }

  /* ----------------------------------------------------------- templates */

  /** Count the characters a text message would actually carry. */
  function previewLength(value) {
    return fill(value, job()).length;
  }

  /**
   * Build the editor for whichever channel is selected.
   *
   * Rebuilt rather than toggled, so a field that does not exist for this
   * channel cannot be left behind holding a value nobody can see.
   */
  function renderTemplateFields() {
    clear(els.templateFields);

    DATA.TEMPLATE_FIELDS[channel].forEach(function (field) {
      var wrap = make("div", "template-field");
      var id = "tpl-" + channel + "-" + field.key;

      var label = make("label", "template-label", field.label);
      label.setAttribute("for", id);
      wrap.appendChild(label);

      var input = document.createElement("textarea");
      input.className = "template-input";
      input.id = id;
      input.rows = field.key.indexOf("Subject") > -1 ? 1 : 4;
      input.value = templates[channel][field.key];
      input.setAttribute("data-field", field.key);
      wrap.appendChild(input);

      var counter = null;
      if (field.counted) {
        counter = make("p", "template-count", "");
        wrap.appendChild(counter);
      }

      var previewLabel = make("p", "template-preview-label", "Preview");
      wrap.appendChild(previewLabel);
      var preview = make("p", "template-preview", "");
      wrap.appendChild(preview);

      function refresh() {
        preview.textContent = fill(input.value, job());
        if (counter) {
          var length = previewLength(input.value);
          counter.textContent = length + " characters";
          counter.setAttribute("data-over", length > DATA.SOFT_TEXT_LIMIT ? "true" : "false");
          if (length > DATA.SOFT_TEXT_LIMIT) {
            counter.textContent = length + " characters, long enough that carriers may split it";
          }
        }
      }

      input.addEventListener("input", refresh);
      refresh();

      els.templateFields.appendChild(wrap);
    });

    if (!storageOk) {
      sayTemplates("This browser won't save edits, so they last until you close the tab.", "warn");
    }
  }

  function sayTemplates(message, tone) {
    els.templateStatus.textContent = message;
    els.templateStatus.setAttribute("data-tone", tone || "info");
  }

  /**
   * Check edited wording against Google's rules before it can be saved.
   *
   * Two failure modes, and the message names which one. Offering something in
   * exchange for a review, or asking in a way that filters for happy
   * customers, are both against policy, and a template missing the link is
   * simply broken.
   *
   * @returns {string} the problem, or an empty string when the wording passes
   */
  /**
   * Does this wording contain anything Google's policy does not allow?
   *
   * Shared by the editor and by the loader. The editor used to be the only
   * caller, which made the phrase list a guard on one doorway rather than a
   * property of what the page will show: a value already sitting in
   * localStorage, written by an older build or by anyone with the console
   * open, was rendered into the previews and the simulated messages without
   * ever being tested. The loader drops a failing field back to the shipped
   * default instead.
   */
  function hasBlockedPhrase(value) {
    var lower = String(value).toLowerCase();
    var hit = "";
    DATA.BLOCKED_PHRASES.forEach(function (phrase) {
      if (!hit && lower.indexOf(phrase) > -1) hit = phrase;
    });
    return hit;
  }

  function checkTemplates(candidate) {
    var problem = "";

    DATA.TEMPLATE_FIELDS[channel].forEach(function (field) {
      if (problem) return;
      var value = String(candidate[field.key] || "");
      // D6: an empty field saved happily and then did not survive a reload,
      // because the loader rejects a zero-length value. Blocked at the door.
      if (value.length === 0) {
        problem = "The " + field.label.toLowerCase() + " cannot be empty.";
        return;
      }
      var phrase = hasBlockedPhrase(value);
      if (phrase) {
        problem =
          "Google doesn't allow offering anything for a review or asking only happy " +
          'customers. Take out: "' +
          phrase.trim() +
          '".';
      }
    });
    if (problem) return problem;

    DATA.LINK_REQUIRED.forEach(function (key) {
      if (problem) return;
      var value = String(candidate[key] || "");
      if (value.indexOf("{review_link}") === -1) {
        problem = "The ask and the reminder need {review_link} so they can tap through.";
      }
    });

    return problem;
  }

  /** Read the editor back into an object, capped the same way storage is. */
  function collectTemplates() {
    var out = {};
    DATA.TEMPLATE_FIELDS[channel].forEach(function (field) {
      var input = document.getElementById("tpl-" + channel + "-" + field.key);
      out[field.key] = input ? input.value.slice(0, DATA.MAX_TEMPLATE_CHARS) : "";
    });
    return out;
  }

  function onSaveTemplates() {
    if (running) return;
    var candidate = collectTemplates();
    var problem = checkTemplates(candidate);
    if (problem) {
      sayTemplates(problem, "bad");
      return;
    }

    Object.keys(candidate).forEach(function (key) {
      templates[channel][key] = candidate[key];
    });

    if (saveTemplates()) {
      sayTemplates("Saved in this browser.", "done");
    } else {
      sayTemplates("This browser won't save edits, so they last until you close the tab.", "warn");
    }
    resetRun();
  }

  function onRestoreTemplates() {
    if (running) return;
    templates = defaults();
    clearStorage();
    renderTemplateFields();
    sayTemplates("Templates are back to the defaults.", "done");
    resetRun();
  }

  /* -------------------------------------------------------------- the run */

  /**
   * Lock the controls for the length of a run.
   *
   * aria-disabled rather than the disabled property, on purpose. The run is
   * started from the keyboard as often as not, and disabling the button the
   * visitor just pressed drops focus to the body for the whole eleven seconds
   * with nothing focusable left in the region. Marked disabled, the controls
   * keep their place in the tab order, announce themselves as unavailable, and
   * the handlers below refuse the activation instead.
   */
  function startBusy() {
    running = true;
    setLocked(els.run, true);
    els.run.setAttribute("aria-busy", "true");
    els.run.textContent = "Running demo…";
    els.segments.forEach(function (seg) {
      setLocked(seg, true);
    });
    lockJobCards(true);
    setLocked(els.reset, true);
  }

  /** Mark a control unavailable without taking it out of the tab order. */
  function setLocked(node, locked) {
    if (locked) {
      node.setAttribute("aria-disabled", "true");
    } else {
      node.removeAttribute("aria-disabled");
    }
  }

  function lockJobCards(locked) {
    Array.prototype.slice.call(els.jobList.querySelectorAll(".job-card")).forEach(function (card) {
      setLocked(card, locked);
    });
  }

  function endBusy() {
    running = false;
    setLocked(els.run, false);
    els.run.removeAttribute("aria-busy");
    // Run again stays the primary action, so the finished state still has an
    // ember button on the screen.
    els.run.textContent = "Run again";
    els.segments.forEach(function (seg) {
      setLocked(seg, false);
    });
    lockJobCards(false);
    setLocked(els.reset, false);
  }

  /**
   * Walk the scripted timeline.
   *
   * The pre-run reset sits inside the try along with everything else that
   * touches the DOM. Outside it, a failure there would escape the catch and
   * leave the button disabled with no way back.
   */
  async function runDemo() {
    if (running) return;

    startBusy();
    say("Running the demo ask…", "info");

    try {
      var current = job();

      resetSteps();
      clearPanels();
      setPanelState(els.homeownerState, "Sending", "chip-warn");
      setPanelState(els.ownerState, "Sending", "chip-warn");

      var startedAt = Date.now();
      startClock(startedAt);

      setStep("ask", "active");
      await waitUntil(startedAt, CLOCK.ask);
      addHomeownerMessage("ask", current);
      addOwnerLine(
        "Review ask sent",
        channel === "text" ? current.phone : current.email
      );
      setStep("ask", "done");

      setStep("reminder", "active");
      await waitUntil(startedAt, CLOCK.reminder);
      addHomeownerMessage("reminder", current);
      addOwnerLine("Gentle reminder sent", "Link not tapped yet");
      setStep("reminder", "done");

      setStep("tapped", "active");
      await waitUntil(startedAt, CLOCK.tapped);
      addOwnerLine("Link tapped", "They opened your page");
      setStep("tapped", "done");

      setStep("thanks", "active");
      await waitUntil(startedAt, CLOCK.thanks);
      addHomeownerMessage("thanks", current);
      addOwnerLine("Thank-you sent", "No more asks for this job");
      setStep("thanks", "done");

      stopClock(TOTAL_SECONDS);
      setPanelState(els.homeownerState, "Done", "chip-done");
      setPanelState(els.ownerState, "Done", "chip-done");

      asked[current.id] = true;
      renderJobs();

      say(
        "Done. The ask, the reminder and the thank-you all went out in the demo. Nothing was " +
          "actually sent.",
        "done"
      );
    } catch (err) {
      stopClock(0);
      setPanelState(els.homeownerState, "Waiting", "chip-quiet");
      setPanelState(els.ownerState, "Waiting", "chip-quiet");
      say("Demo couldn't finish. Try Run again.", "bad");
    } finally {
      endBusy();
    }
  }

  /* --------------------------------------------------------------- reset */

  function resetDemo() {
    if (running) return;
    templates = defaults();
    clearStorage();
    asked = {};
    jobId = DATA.JOBS[0].id;
    channel = "text";
    els.segments.forEach(function (seg) {
      var chosen = seg.getAttribute("data-channel") === "text";
      seg.setAttribute("aria-checked", chosen ? "true" : "false");
      seg.tabIndex = chosen ? 0 : -1;
    });
    renderJobs();
    applySelectionCopy();
    renderTemplateFields();
    sayTemplates("", "info");
    resetRun();
    say("Demo reset. Templates are back to the defaults.", "done");
  }

  /* ---------------------------------------------------------------- wire */

  els.segments.forEach(function (seg, index) {
    seg.addEventListener("click", function () {
      selectChannel(seg.getAttribute("data-channel"), false);
    });

    // Arrow keys move between options, the way a radio group is expected to.
    seg.addEventListener("keydown", function (event) {
      var step = 0;
      if (event.key === "ArrowRight" || event.key === "ArrowDown") step = 1;
      if (event.key === "ArrowLeft" || event.key === "ArrowUp") step = -1;
      if (step === 0) return;
      event.preventDefault();
      var next = els.segments[(index + step + els.segments.length) % els.segments.length];
      selectChannel(next.getAttribute("data-channel"), true);
    });
  });

  els.run.addEventListener("click", function () {
    runDemo();
  });
  els.reset.addEventListener("click", resetDemo);
  els.saveTemplates.addEventListener("click", onSaveTemplates);
  els.restoreTemplates.addEventListener("click", onRestoreTemplates);

  templates = loadTemplates();
  renderJobs();
  applySelectionCopy();
  renderTemplateFields();
  clearPanels();

  // Exposed so the page can be driven by a test without clicking, and so a
  // failure path can be exercised on purpose rather than only in theory.
  window.reviewAskDemo = {
    run: runDemo,
    select: selectChannel,
    pick: pickJob,
    reset: resetDemo,
    clock: CLOCK,
  };
})();
