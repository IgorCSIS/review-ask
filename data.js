/*
 * Review Ask: the sample data, the default wording, and the rules list.
 *
 * Loaded first on both pages, so the owner console and the homeowner page
 * read the same jobs from the same place and cannot drift apart. Everything
 * in here is invented. The phone numbers sit inside the 555-0100 to 555-0199
 * block that exists for fiction, and the addresses use example.com, which is
 * reserved for exactly this.
 */

(function (global) {
  "use strict";

  /**
   * The sample shop. Same fictional business as the Instant Lead Response
   * demo, so Maria's AC job closes the loop between the two.
   */
  var COMPANY = {
    name: "East County Comfort",
    trade: "Heating and cooling",
    city: "El Cajon",
  };

  /**
   * Three finished jobs. `asked` is demo state and starts false on every
   * load, because progress lives in memory: a reload is a fresh demo.
   */
  var JOBS = [
    {
      id: "j1",
      first: "Maria",
      name: "Maria Lopez",
      job: "AC repair",
      city: "El Cajon",
      finished: "Today",
      phone: "(619) 555-0148",
      email: "maria.lopez@example.com",
    },
    {
      id: "j2",
      first: "Daniel",
      name: "Daniel Reyes",
      job: "Furnace tune-up",
      city: "Santee",
      finished: "Yesterday",
      phone: "(619) 555-0162",
      email: "daniel.reyes@example.com",
    },
    {
      id: "j3",
      first: "Karen",
      name: "Karen Whitfield",
      job: "Mini-split install",
      city: "La Mesa",
      finished: "Friday",
      phone: "(619) 555-0175",
      email: "karen.whitfield@example.com",
    },
  ];

  /*
   * Google's real review-link shape with a placeholder id in place of a real
   * one, so following it cannot land on anybody's actual business. It is a
   * constant: never built from a template, never built from a query string,
   * and labeled as a sample everywhere it appears.
   */
  var SAMPLE_REVIEW_URL =
    "https://search.google.com/local/writereview?placeid=SAMPLE_PLACE_ID";

  /** Where {review_link} points in the demo: the branded page, per job. */
  var ASK_PAGE_BASE = "igorcsis.github.io/review-ask/ask.html?job=";

  /**
   * Wording that would put a real shop on the wrong side of Google's policy.
   *
   * Two families: offering something in exchange for a review, and asking
   * only the customers expected to say something nice. Matched case
   * insensitively against saved templates. "free " keeps its trailing space
   * so "freezing" and "freedom" do not trip it.
   */
  var BLOCKED_PHRASES = [
    "gift card",
    "discount",
    "coupon",
    "% off",
    "free ",
    "raffle",
    "giveaway",
    "reward",
    "in exchange",
    "5-star",
    "5 star",
    "five star",
    "only if you",
    "if you were happy",
    "if you loved",
    "if you had a great",
  ];

  /** The placeholders a template may use. Anything else is left as typed. */
  var PLACEHOLDERS = ["first_name", "company", "job", "review_link"];

  /**
   * Default wording, per channel.
   *
   * The text templates carry an opt-out line because a real install sends
   * over a messaging account that has to honor STOP. The email bodies use
   * blank lines between paragraphs; the editor and the preview both keep
   * them, and the preview renders through textContent so a body can never
   * become markup.
   */
  var DEFAULT_TEMPLATES = {
    text: {
      ask:
        "Hi {first_name}, it's {company}. Thanks for having us out for the {job}. " +
        "If you have a minute, an honest Google review helps a small local shop a lot: " +
        "{review_link} Reply STOP to opt out.",
      reminder:
        "Hi {first_name}, {company} again. Quick reminder in case the link got buried: " +
        "{review_link} No pressure, and thanks either way.",
      thanks:
        "Thanks, {first_name}. We appreciate you taking the time. Call us anytime you need us. " +
        "{company}",
    },
    email: {
      askSubject: "Quick favor after your {job}",
      ask:
        "Hi {first_name},\n\n" +
        "Thanks for choosing {company} for your {job}. If you have a minute, an honest review " +
        "on Google helps your neighbors find a local shop they can trust.\n\n" +
        "Leave a review: {review_link}\n\n" +
        "Thanks,\n{company}",
      reminderSubject: "A quick reminder from {company}",
      reminder:
        "Hi {first_name},\n\n" +
        "Just a reminder in case our last note got buried. If you have a minute, here's the " +
        "link: {review_link}\n\n" +
        "No pressure either way. Thanks again for having us out.\n\n" +
        "{company}",
      thanksSubject: "Thank you from {company}",
      thanks:
        "Hi {first_name},\n\n" +
        "Thanks for taking the time. It means a lot to a small shop like ours. If anything " +
        "comes up with your {job}, call us.\n\n" +
        "{company}",
    },
  };

  /** Which template fields exist per channel, and how to label them. */
  var TEMPLATE_FIELDS = {
    text: [
      { key: "ask", label: "Review ask", counted: true },
      { key: "reminder", label: "Gentle reminder", counted: true },
      { key: "thanks", label: "Thank-you", counted: true },
    ],
    email: [
      { key: "askSubject", label: "Ask subject", counted: false },
      { key: "ask", label: "Ask body", counted: false },
      { key: "reminderSubject", label: "Reminder subject", counted: false },
      { key: "reminder", label: "Reminder body", counted: false },
      { key: "thanksSubject", label: "Thank-you subject", counted: false },
      { key: "thanks", label: "Thank-you body", counted: false },
    ],
  };

  /** Fields that have to carry {review_link} or the ask goes nowhere. */
  var LINK_REQUIRED = ["ask", "reminder"];

  /** localStorage key for saved template edits. */
  var STORAGE_KEY = "reviewAsk.v1";

  /** Longest a single saved template may be, in characters. */
  var MAX_TEMPLATE_CHARS = 600;

  /** Past this, a text message is likely to be split by the carrier. */
  var SOFT_TEXT_LIMIT = 320;

  global.ReviewAskData = {
    COMPANY: COMPANY,
    JOBS: JOBS,
    SAMPLE_REVIEW_URL: SAMPLE_REVIEW_URL,
    ASK_PAGE_BASE: ASK_PAGE_BASE,
    BLOCKED_PHRASES: BLOCKED_PHRASES,
    PLACEHOLDERS: PLACEHOLDERS,
    DEFAULT_TEMPLATES: DEFAULT_TEMPLATES,
    TEMPLATE_FIELDS: TEMPLATE_FIELDS,
    LINK_REQUIRED: LINK_REQUIRED,
    STORAGE_KEY: STORAGE_KEY,
    MAX_TEMPLATE_CHARS: MAX_TEMPLATE_CHARS,
    SOFT_TEXT_LIMIT: SOFT_TEXT_LIMIT,
  };
})(window);
