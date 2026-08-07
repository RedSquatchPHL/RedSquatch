// Static teaching content for the User Story Evaluation Game and the
// Acceptance Criteria Matching Challenge. Each round has exactly one
// `correct: true` option; every other option is flawed in a DISTINCT,
// named way so a wrong pick teaches a specific pattern rather than just
// "no, try again."

export interface StoryOption {
  id: string;
  text: string;
  correct: boolean;
  flaw?: string; // short label for the flaw type, shown on the wrong-pick explanation
  explanation: string;
}

export interface StoryRound {
  id: string;
  theme: string;
  options: StoryOption[];
}

export const USER_STORY_ROUNDS: StoryRound[] = [
  {
    id: 'login',
    theme: 'Authentication',
    options: [
      {
        id: 'login-correct',
        correct: true,
        text: 'As a returning customer, I want to log in with my email and password so that I can access my saved order history without re-entering my details.',
        explanation: 'Clear role, a concrete action, and a benefit tied to real value — small enough to estimate and testable as pass/fail (INVEST: Negotiable, Valuable, Estimable, Testable).',
      },
      {
        id: 'login-vague',
        correct: false,
        flaw: 'Untestable',
        text: 'As a user, I want the login to be easy and fast so that I have a good experience.',
        explanation: '"Easy and fast" has no measurable pass/fail condition — nobody can write acceptance criteria for it without inventing requirements the story never stated.',
      },
      {
        id: 'login-compound',
        correct: false,
        flaw: 'Compound / not Small',
        text: 'As a customer, I want to log in, update my profile, and manage my payment methods so that I can control my account.',
        explanation: 'Three independent features bundled into one story — each needs its own sizing, its own acceptance criteria, and could ship on a different sprint.',
      },
      {
        id: 'login-no-value',
        correct: false,
        flaw: 'Missing value clause',
        text: 'As a customer, I want a "Remember Me" checkbox on the login form.',
        explanation: 'Names a UI element, not a goal — there\'s no "so that," so nobody can judge whether this is worth building or what "done" looks like.',
      },
    ],
  },
  {
    id: 'filter',
    theme: 'Product Search',
    options: [
      {
        id: 'filter-correct',
        correct: true,
        text: 'As a shopper, I want to filter products by price range so that I can quickly find items within my budget.',
        explanation: 'User-voiced, one behavior, and a real reason a shopper cares — easy to write a handful of acceptance criteria against.',
      },
      {
        id: 'filter-technical',
        correct: false,
        flaw: 'Implementation-prescriptive',
        text: 'As a shopper, I want the product filter to use an indexed SQL query on the price column so that results load in under 200ms.',
        explanation: 'The "so that" describes a technical performance metric, not user value — and it locks in a specific implementation before anyone has agreed that\'s the right approach.',
      },
      {
        id: 'filter-system-voice',
        correct: false,
        flaw: 'Not user-voiced',
        text: 'As a system, I want to cache filtered search results so that server load is reduced.',
        explanation: 'The role is "a system," not a human persona — this is a legitimate technical task, but it isn\'t a user story because no user\'s need is being represented.',
      },
      {
        id: 'filter-epic',
        correct: false,
        flaw: 'Epic-scale, not Small',
        text: 'As a shopper, I want to browse, filter, sort, compare, and purchase products all from one seamless page so that I never leave the app.',
        explanation: 'Five distinct capabilities stacked into a single sentence — this is an epic that needs to be broken into several small, independently deliverable stories.',
      },
    ],
  },
  {
    id: 'notify',
    theme: 'Notifications',
    options: [
      {
        id: 'notify-correct',
        correct: true,
        text: 'As a project manager, I want to receive an email notification when a task is marked overdue so that I can follow up with the assignee promptly.',
        explanation: 'Specific trigger (task goes overdue), specific channel (email), and a clear business reason — testable without any guesswork.',
      },
      {
        id: 'notify-vague',
        correct: false,
        flaw: 'Untestable',
        text: 'As a user, I want better notifications so that I stay informed.',
        explanation: '"Better" and "stay informed" define no trigger, no channel, and no observable outcome — there\'s nothing here to verify.',
      },
      {
        id: 'notify-unbounded',
        correct: false,
        flaw: 'Unbounded scope',
        text: 'As a user, I want notifications to look nice and be customizable in every possible way so that everyone is happy.',
        explanation: '"Every possible way" and "everyone is happy" can never be satisfied or falsified — a story needs a boundary you can actually finish.',
      },
      {
        id: 'notify-no-value',
        correct: false,
        flaw: 'Missing value clause',
        text: 'As a user, I want a bell icon with a red badge in the top-right corner.',
        explanation: 'Describes a UI widget, not a need — with no "so that," there\'s no way to tell whether this solves a real problem or just adds clutter.',
      },
    ],
  },
  {
    id: 'reporting',
    theme: 'Reporting',
    options: [
      {
        id: 'reporting-correct',
        correct: true,
        text: 'As a finance analyst, I want to export the monthly expense report to CSV so that I can import it into our budgeting spreadsheet.',
        explanation: 'One export, one format, one clear downstream use — small enough to build and verify in a single pass.',
      },
      {
        id: 'reporting-compound',
        correct: false,
        flaw: 'Compound / not Small',
        text: 'As a finance analyst, I want to export reports to CSV, PDF, and Excel, and schedule them to email automatically, and archive old reports so that reporting is fully automated.',
        explanation: 'At least three separate features (multi-format export, scheduling, archiving) — each deserves its own story with its own acceptance criteria.',
      },
      {
        id: 'reporting-vague',
        correct: false,
        flaw: 'Untestable',
        text: 'As a finance analyst, I want reporting to be more flexible so that I can do my job better.',
        explanation: '"More flexible" and "do my job better" aren\'t acceptance conditions — nobody, including the analyst, could say definitively when this is done.',
      },
      {
        id: 'reporting-system-voice',
        correct: false,
        flaw: 'Not user-voiced',
        text: 'As the reporting service, I want to batch-generate PDFs nightly via a cron job so that files are pre-rendered.',
        explanation: 'A backend implementation task wearing a user-story template — the role isn\'t a person with a need, it\'s the system describing its own mechanics.',
      },
    ],
  },
  {
    id: 'a11y',
    theme: 'Accessibility',
    options: [
      {
        id: 'a11y-correct',
        correct: true,
        text: 'As a visually impaired user, I want all form fields to have proper ARIA labels so that I can navigate and complete forms using a screen reader.',
        explanation: 'A specific persona, a specific technical need tied to a real barrier, and a benefit that\'s straightforward to verify with a screen reader.',
      },
      {
        id: 'a11y-vague',
        correct: false,
        flaw: 'Untestable',
        text: 'As a user, I want the site to be more accessible so that everyone can use it.',
        explanation: '"More accessible" names no specific barrier or standard — there\'s no way to write a pass/fail check against it as written.',
      },
      {
        id: 'a11y-no-value',
        correct: false,
        flaw: 'Implementation without rationale',
        text: 'As a developer, I want to add alt="" to every image tag.',
        explanation: 'Prescribes a specific (and here, actually wrong — empty alt text hides meaningful images from screen readers) implementation with no user need driving it, and the role isn\'t an end user at all.',
      },
      {
        id: 'a11y-epic',
        correct: false,
        flaw: 'Epic-scale, not Small',
        text: 'As a user with any disability, I want the entire website to meet WCAG AAA compliance across every page and feature so that no one is ever excluded.',
        explanation: 'A worthy goal, but it\'s an epic spanning the whole site — it needs to be broken into many small, page- or component-level stories to be deliverable.',
      },
    ],
  },
];

export interface ACOption {
  id: string;
  criteria: string[];
  correct: boolean;
  flaw?: string;
  explanation: string;
}

export interface ACRound {
  id: string;
  story: string;
  options: ACOption[];
}

export const AC_ROUNDS: ACRound[] = [
  {
    id: 'login',
    story: 'As a returning customer, I want to log in with my email and password so that I can access my saved order history.',
    options: [
      {
        id: 'login-ac-correct',
        correct: true,
        criteria: [
          'Given a registered customer on the login page, when they enter a valid email and password and submit, then they are redirected to their account dashboard showing order history.',
          'Given a registered customer enters an incorrect password, when they submit, then an inline error states "Incorrect email or password" and the password field is cleared.',
          'Given a customer enters an email that isn\'t registered, when they submit, then the same generic error message is shown (no indication of whether the email exists).',
        ],
        explanation: 'Covers the happy path and two distinct failure modes, each with a Given/When/Then that\'s directly testable — including a security-conscious detail (no account enumeration).',
      },
      {
        id: 'login-ac-happy-only',
        correct: false,
        flaw: 'Missing negative case',
        criteria: [
          'Given a registered customer enters valid credentials, when they submit, then they are logged in and see the dashboard.',
        ],
        explanation: 'Only the happy path is specified — the story\'s behavior on a wrong password or unregistered email is left completely undefined.',
      },
      {
        id: 'login-ac-vague',
        correct: false,
        flaw: 'Untestable / fluff',
        criteria: [
          'The login process should be quick and easy to use.',
          'Users should feel confident their data is safe.',
        ],
        explanation: 'No Given/When/Then, no trigger, no observable outcome — "quick," "easy," and "feel confident" can\'t be checked off by a tester.',
      },
      {
        id: 'login-ac-implementation',
        correct: false,
        flaw: 'Implementation detail',
        criteria: [
          'The login button shall be styled with a copper gradient background (#b87333) and 8px border radius.',
          'The password field shall use <input type="password">.',
        ],
        explanation: 'Describes visual and markup implementation, not a business-observable behavior — this belongs in a design spec, not an acceptance criterion for this story.',
      },
    ],
  },
  {
    id: 'filter',
    story: 'As a shopper, I want to filter products by price range so that I can quickly find items within my budget.',
    options: [
      {
        id: 'filter-ac-correct',
        correct: true,
        criteria: [
          'Given a shopper on the product listing page, when they set a minimum and maximum price and apply the filter, then only products within that range are displayed.',
          'Given a shopper sets a minimum price higher than the maximum, when they apply the filter, then an inline validation message appears and no filter is applied.',
          'Given a shopper clears the price filter, when the page updates, then the full unfiltered product list is shown again.',
        ],
        explanation: 'Happy path, an invalid-input edge case, and the reset behavior are all specified — nothing about the feature is left to guesswork.',
      },
      {
        id: 'filter-ac-offtopic',
        correct: false,
        flaw: 'Off-topic',
        criteria: [
          'Given a shopper is on the homepage, when they click "Shop Now", then they are taken to the product listing page.',
        ],
        explanation: 'Tests navigation to the listing page, not price filtering at all — it doesn\'t verify anything the story actually promises.',
      },
      {
        id: 'filter-ac-vague',
        correct: false,
        flaw: 'Untestable / fluff',
        criteria: [
          'The filter should return relevant results quickly.',
          'Filtering should feel intuitive.',
        ],
        explanation: '"Relevant," "quickly," and "intuitive" aren\'t measurable without criteria this AC never defines.',
      },
      {
        id: 'filter-ac-happy-only',
        correct: false,
        flaw: 'Missing negative case',
        criteria: [
          'Given a shopper sets a valid price range, when they apply it, then matching products are shown.',
        ],
        explanation: 'Never specifies what happens with an invalid range (min > max) or zero matching results — both are real states a tester would hit immediately.',
      },
    ],
  },
  {
    id: 'notify',
    story: 'As a project manager, I want to receive an email notification when a task is marked overdue so that I can follow up with the assignee promptly.',
    options: [
      {
        id: 'notify-ac-correct',
        correct: true,
        criteria: [
          'Given a task\'s due date has passed and it\'s still incomplete, when the nightly overdue check runs, then the assigned project manager receives an email listing the task name, assignee, and days overdue.',
          'Given a task is completed before its due date, when the overdue check runs, then no email is sent for that task.',
          'Given a project manager has disabled overdue notifications in settings, when the check runs, then no email is sent to that manager.',
        ],
        explanation: 'Specifies the trigger, the content of the notification, and two conditions where the system must correctly stay silent — a tester can verify every line.',
      },
      {
        id: 'notify-ac-vague',
        correct: false,
        flaw: 'Untestable / fluff',
        criteria: [
          'Project managers should be notified about overdue tasks in a timely and helpful manner.',
        ],
        explanation: '"Timely and helpful" defines no channel, no content, and no trigger — this is a restatement of the story, not an acceptance criterion.',
      },
      {
        id: 'notify-ac-implementation',
        correct: false,
        flaw: 'Implementation detail',
        criteria: [
          'The system shall run a cron job at 00:00 UTC using node-cron and query the tasks table via an indexed due_date column.',
        ],
        explanation: 'Describes how the feature is built, not what a project manager observes — it also isn\'t testable from the outside without reading the code.',
      },
      {
        id: 'notify-ac-happy-only',
        correct: false,
        flaw: 'Missing negative case',
        criteria: [
          'Given a task is overdue, when the check runs, then an email is sent to the project manager.',
        ],
        explanation: 'Never addresses the "already completed" or "notifications disabled" cases — both are real scenarios the story implies but this AC leaves unspecified.',
      },
    ],
  },
  {
    id: 'reporting',
    story: 'As a finance analyst, I want to export the monthly expense report to CSV so that I can import it into our budgeting spreadsheet.',
    options: [
      {
        id: 'reporting-ac-correct',
        correct: true,
        criteria: [
          'Given a finance analyst on the monthly report page, when they click "Export CSV", then a file downloads with one row per expense (date, category, amount, vendor).',
          'Given no expenses are recorded for the selected month, when the analyst clicks "Export CSV", then a CSV with only the header row downloads (no error).',
          'Given an export is already in progress, when the analyst clicks "Export CSV" again, then the button is disabled until the first download completes.',
        ],
        explanation: 'Happy path, an empty-data edge case, and a duplicate-action edge case — the kind of scenarios a real user would actually hit are all covered.',
      },
      {
        id: 'reporting-ac-offtopic',
        correct: false,
        flaw: 'Off-topic',
        criteria: [
          'Given a finance analyst is logged in, when they navigate to Settings, then they can change their display name.',
        ],
        explanation: 'Has nothing to do with exporting a report — this AC doesn\'t verify anything the story is asking for.',
      },
      {
        id: 'reporting-ac-vague',
        correct: false,
        flaw: 'Untestable / fluff',
        criteria: [
          'The export feature should be reliable and produce accurate data.',
        ],
        explanation: '"Reliable" and "accurate" aren\'t bad goals, but without a Given/When/Then a tester has no concrete case to check against.',
      },
      {
        id: 'reporting-ac-happy-only',
        correct: false,
        flaw: 'Missing negative case',
        criteria: [
          'Given a finance analyst clicks "Export CSV", then a CSV file downloads with the month\'s expense data.',
        ],
        explanation: 'Doesn\'t say what happens with zero expenses that month or a double-click — both are edge cases a real export button will hit.',
      },
    ],
  },
];
