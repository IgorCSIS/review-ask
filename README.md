<p align="center">
  <img src="assets/banner.svg" alt="Review Ask: the after-job review ask for trades. Four timeline steps: review ask sent at 0s, gentle reminder at 4s, review link tapped at 8s, thank-you sent at 11s." width="880">
</p>

<p align="center">
  <a href="https://github.com/IgorCSIS/review-ask/actions"><img src="https://img.shields.io/github/actions/workflow/status/IgorCSIS/review-ask/deploy.yml?branch=main&label=build&labelColor=070E18&color=F59E0B&style=flat-square" alt="Build status"></a>
  <img src="https://img.shields.io/badge/messages-simulated-F59E0B?labelColor=070E18&style=flat-square" alt="Messages are simulated">
  <img src="https://img.shields.io/badge/dependencies-none-F59E0B?labelColor=070E18&style=flat-square" alt="No dependencies">
  <img src="https://img.shields.io/badge/hosting-%240%20on%20GitHub%20Pages-F59E0B?labelColor=070E18&style=flat-square" alt="Free to host on GitHub Pages">
  <img src="https://img.shields.io/badge/license-MIT-F59E0B?labelColor=070E18&style=flat-square" alt="MIT licensed">
</p>

# Review Ask: the after-job Google review ask for trades

**Demo: simulated messages, sample data. Nothing on this page sends a text or an email.**

The job is finished and nobody asked for the review. This shows what it looks
like when somebody does: one short ask goes to the homeowner by text or email,
a gentle reminder follows if the link was not tapped, and a thank-you goes out
after the tap. The homeowner lands on a small branded page with one button.

**Live demo:** https://igorcsis.github.io/review-ask/  
**Stack:** Hand-written HTML, CSS and JavaScript. No framework, no build step,
no dependencies, no network calls.

## What it is, and what it is not

**It is** a sales demo and a working illustration. In about eleven seconds it
shows an owner the shape of a service they can buy: the ask, the one reminder,
the tap, and the thank-you, with the wording they would actually send.

**It is not** a messaging product, and it deliberately cannot become one:

- **The messages are simulated.** Nothing on either page sends anything. There
  is no Twilio, no queue, no webhook and no third party script.
- **There is no network code at all.** No `fetch`, no `XMLHttpRequest`, no
  `sendBeacon`, no form that posts, no web font. Open the network tab and
  watch: after the page and its files load, nothing else goes out.
- **It stores one thing.** Your template edits, under the key `reviewAsk.v1`,
  in your browser. Job progress lives in memory, so a reload is a fresh demo.
- **It is not a CRM or a reputation dashboard.** No inbox, no review monitoring,
  no scores. Your Jobber or Housecall Pro stays the system of record.

That is deliberate rather than unfinished. A page that could really text a
homeowner would need a registered brand, a paid number and a backend, and none
of that belongs in a link you paste into a text message.

The honesty chip lives in a sticky header, so it is on screen at every scroll
position rather than only at the top, and the timeline says its own timing is
compressed.

## Stack decision

| Layer | Choice | Why |
| --- | --- | --- |
| Pages | Two hand-written HTML files | The console is one screen and the homeowner page is one card. A framework would be more machinery than the thing it renders |
| Styling | Plain CSS with custom properties | No build means no purge step, and no purge step means a class built at runtime cannot be silently dropped from the stylesheet |
| Behaviour | One IIFE per page, no modules, no dependencies | Nothing to audit, nothing to update, nothing that can pull a supply chain in behind it. No ES modules, so both pages also work from `file://` |
| Timing | Compressed, and labelled as compressed | Two days of waiting is a bad demo. Pretending the reminder really goes out four seconds later would be a lie, so every step carries both clocks |
| Storage | `localStorage` for template edits only | Wording is worth keeping between visits. Job progress is not, and a demo that remembers you already ran it is a worse demo |
| Art | SVG for the mark and the banner | Vector stays sharp at any size and costs no bytes to scale. There is no raster in the repo, so no README tag points at a file that does not exist |
| Hosting | GitHub Pages, repository root uploaded as-is | What is in the repository is what is served. Free forever, nothing to renew |
| Messaging | None | See above. There is no messaging |

## How this stays inside Google's rules

Review software is an easy place to buy yourself a policy problem. Three rules
shape this demo, and the same three shape a real install:

- **Every customer gets the same ask.** No filtering for happy customers
  first, no star question that decides which link you see. Google calls that
  review gating and does not allow it. The homeowner page has exactly one
  button and no branch of any kind.
- **Nothing is offered for a review.** No discounts, gift cards or drawings.
  The template editor refuses to save wording containing any of a list of
  phrases (gift card, discount, coupon, `% off`, free, raffle, giveaway,
  reward, in exchange, and the various ways of asking only happy customers)
  and names the phrase it found.
- **Honest reviews, good or bad.** The wording asks for an honest review,
  never a 5-star one. Saving an ask or a reminder without `{review_link}` is
  blocked too, because an ask nobody can act on is not an ask.

Jobber and Housecall Pro can already send a review request. What this sells is
the local setup, the branded homeowner page, wording that stays inside the
rules, and a walkthrough. Not software seats, not a CRM swap.

## What this would look like live

The demo is a simulation, so it is worth being plain about what a real install
actually needs:

- **The client's own number and messaging account.** Twilio or similar, or the
  texting already built into Jobber, Housecall Pro or HighLevel. The messages
  come from the shop, not from me.
- **A2P 10DLC registration before any texting.** US carriers require a
  registered brand and campaign for application-to-person messaging. This is
  the step that takes real time, and nothing sends until it clears.
- **Asks go only to the client's own customers**, and only to people who gave
  their number for the job. STOP and HELP are honored on every message.
- **Triggered by the system of record**, when a job is marked done or an
  invoice is paid, so nobody has to remember.
- **The client's real Google review link**, taken from their Google Business
  Profile. The link in this demo is a placeholder and always labelled as one.
- **Jobber or Housecall Pro stays the system of record.** This sits on top of
  what the shop already runs.
- **Minimal data stored.** A name, a number, a job and whether the link was
  tapped. Nothing else is needed to send one ask and one reminder.

## Running locally

No install, no build. Any static server will do:

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000/. Both pages also open straight from the file
system, because nothing here is an ES module.

The console exposes a hook so the demo can be driven without clicking, which
is how the failure path gets exercised on purpose rather than only in theory:

```js
window.reviewAskDemo.select("email"); // "text" or "email"
window.reviewAskDemo.pick("j2");      // j1, j2 or j3
window.reviewAskDemo.run();           // walk the timeline
window.reviewAskDemo.reset();         // back to a fresh demo
window.reviewAskDemo.clock;           // the millisecond marks the steps land on
```

## Enabling GitHub Pages

Pushing to `main` runs `.github/workflows/deploy.yml`, which uploads the
repository root and publishes it. There is one manual step the first time, in
the repository settings: **Settings, then Pages, then Source, then "GitHub
Actions"**. Without it the workflow runs and the deploy step has nowhere to
put the site.

## Layout

```
review-ask/
├── index.html                the owner console
├── ask.html                  the homeowner page, mobile first
├── styles.css                shared styles, on the contractor lane tokens
├── data.js                   sample jobs, default wording, the blocked phrases
├── app.js                    the console simulation
├── ask.js                    the homeowner page behaviour
├── assets/
│   ├── logo.svg              32x32 mark, a speech bubble with one star
│   ├── favicon.svg           the same mark, as the tab icon
│   └── banner.svg            1200x300 README banner
├── CONVENTIONS.md            repository rules, including no AI attribution
└── .github/workflows/
    ├── deploy.yml            uploads the repository root to Pages
    └── no-ai-attribution.yml fails the build on any AI credit line
```

## Security notes

Both pages carry a Content-Security-Policy meta tag as the first element in
`head`, with `default-src 'none'`. Only same-origin scripts and styles load,
`connect-src` is `'none'`, and `form-action` is `'none'`. There is no inline
script, no inline `style` attribute and no inline event handler anywhere,
because the policy forbids all three.

Everything that reaches either page is built with `createElement` and
`textContent`. There is no `innerHTML`, `outerHTML`, `insertAdjacentHTML`,
`document.write`, `eval`, `new Function` or string `setTimeout` in this
repository. Saved templates are treated as untrusted: parsed inside a
`try`/`catch`, accepted only as strings, capped at 600 characters each, and
dropped back to the shipped default on any mismatch.

The `?job=` parameter on the homeowner page is matched against the three known
ids and never echoed. An unknown or missing value falls back to the generic
wording.

One thing a meta tag cannot do: `frame-ancestors` is header-only, and GitHub
Pages does not let you set response headers. So this repo cannot stop the
pages being framed. On a host that allows headers, add `frame-ancestors 'none'`
there.

## The data in the demo

Three invented jobs for a fictional shop, East County Comfort in El Cajon, the
same fictional shop as the Instant Lead Response demo. The names, the phone
numbers, the addresses and the jobs are all made up. The numbers sit inside the
555-0100 to 555-0199 block that exists for exactly this, and the addresses use
`example.com`, which is reserved for it.

The Google link is `https://search.google.com/local/writereview?placeid=SAMPLE_PLACE_ID`:
Google's real review-link shape with a placeholder id, so following it cannot
land on any real business. It is a constant, never built from anything typed
into the page, and labelled as a sample everywhere it appears.

## The rest of the chain

1. [Instant Lead Response](https://igorcsis.github.io/instant-lead-response/), respond fast
2. [Lead Follow-up](https://igorcsis.github.io/lead-followup/), follow up
3. [Ridgeview Remodeling](https://igorcsis.github.io/ridgeview-remodeling-demo/), win the job
4. Review Ask, ask for the review (you are here)

## License

[MIT](LICENSE).

Built by **Igor Lima**. Automation and web work for East County and San Diego
businesses. Portfolio: https://igorcsis.github.io/niftyai-portfolio/
