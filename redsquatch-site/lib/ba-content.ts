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
          'Given a customer lands on the dashboard after login, when the page loads, then their name appears in the header and their order history is visible.',
          'Given a customer checked "Remember Me" on a prior visit, when they return to the login page, then their email address is pre-filled.',
        ],
        explanation: 'Only the happy path is specified, three times over — the story\'s behavior on a wrong password or unregistered email is left completely undefined.',
      },
      {
        id: 'login-ac-vague',
        correct: false,
        flaw: 'Untestable / fluff',
        criteria: [
          'The login process should be quick and easy to use.',
          'Users should feel confident their data is safe.',
          'The experience should feel modern and trustworthy.',
        ],
        explanation: 'No Given/When/Then, no trigger, no observable outcome — "quick," "easy," and "feel confident" can\'t be checked off by a tester.',
      },
      {
        id: 'login-ac-implementation',
        correct: false,
        flaw: 'Implementation detail',
        criteria: [
          'The login button shall be styled with a copper gradient background (#b87333) and 8px border radius.',
          'The password field shall use <input type="password"> with autocomplete="current-password".',
          'The login form shall submit via a POST request to /api/auth/login using fetch with credentials: "include".',
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
          'Given a shopper is on the homepage, when they click "Shop Now", then they are taken to the product listing page with the default sort order applied.',
          'Given a shopper is on the product listing page, when they click the site logo, then they are returned to the homepage and any active filters are cleared.',
          'Given a shopper hovers over the main navigation menu, when a category is highlighted, then a dropdown of subcategories appears with icons and a "View All" link.',
        ],
        explanation: 'Tests navigation around the site, not price filtering at all — none of these three lines verify anything the story actually promises.',
      },
      {
        id: 'filter-ac-vague',
        correct: false,
        flaw: 'Untestable / fluff',
        criteria: [
          'The filter should return relevant results quickly.',
          'Filtering should feel intuitive.',
          'The filter experience should meet modern e-commerce standards.',
        ],
        explanation: '"Relevant," "quickly," and "intuitive" aren\'t measurable without criteria this AC never defines.',
      },
      {
        id: 'filter-ac-happy-only',
        correct: false,
        flaw: 'Missing negative case',
        criteria: [
          'Given a shopper sets a valid price range, when they apply it, then matching products are shown.',
          'Given matching products are shown, when the shopper scrolls, then results load in pages of 20.',
          'Given a shopper applies a price filter, when they also select a category, then both filters apply together.',
        ],
        explanation: 'All three lines stay on the happy path — never specifies what happens with an invalid range (min > max) or zero matching results, both real states a tester would hit immediately.',
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
          'The notification should be clear and easy to understand.',
          'Managers should feel on top of their team\'s overdue work.',
        ],
        explanation: '"Timely and helpful" defines no channel, no content, and no trigger — this is a restatement of the story, not an acceptance criterion.',
      },
      {
        id: 'notify-ac-implementation',
        correct: false,
        flaw: 'Implementation detail',
        criteria: [
          'The system shall run a cron job at 00:00 UTC using node-cron and query the tasks table via an indexed due_date column, batching results in groups of 500 to avoid connection pool exhaustion.',
          'The email shall be sent using the existing SMTP relay via the nodemailer library, with retries handled by a Bull queue backed by Redis.',
          'The overdue check shall be implemented as a separate microservice deployed alongside the main API, communicating over an internal channel secured with mutual TLS.',
        ],
        explanation: 'Describes how the feature is built, not what a project manager observes — it also isn\'t testable from the outside without reading the code.',
      },
      {
        id: 'notify-ac-happy-only',
        correct: false,
        flaw: 'Missing negative case',
        criteria: [
          'Given a task is overdue, when the check runs, then an email is sent to the project manager.',
          'Given the email is sent, when the manager opens it, then it displays the task name and days overdue.',
          'Given a manager clicks the link in the email, when the page loads, then they are taken directly to that task.',
        ],
        explanation: 'All three lines stay on the happy path — never addresses the "already completed" or "notifications disabled" cases, both real scenarios the story implies but this AC leaves unspecified.',
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
          'Given an analyst is on the Settings page, when they update their password, then a confirmation email is sent.',
          'Given an analyst is on any page, when they click their avatar, then a profile dropdown menu appears.',
        ],
        explanation: 'None of these three lines have anything to do with exporting a report — this AC doesn\'t verify anything the story is asking for.',
      },
      {
        id: 'reporting-ac-vague',
        correct: false,
        flaw: 'Untestable / fluff',
        criteria: [
          'The export feature should be reliable and produce accurate data.',
          'Exporting should feel fast and effortless.',
          'The report should look professional when opened.',
        ],
        explanation: '"Reliable" and "accurate" aren\'t bad goals, but without a Given/When/Then a tester has no concrete case to check against.',
      },
      {
        id: 'reporting-ac-happy-only',
        correct: false,
        flaw: 'Missing negative case',
        criteria: [
          'Given a finance analyst clicks "Export CSV", then a CSV file downloads with the month\'s expense data.',
          'Given the CSV downloads, when the analyst opens it, then column headers match the on-screen report.',
          'Given the export completes, when the analyst checks the filename, then it includes the report month and year.',
        ],
        explanation: 'All three lines stay on the happy path — doesn\'t say what happens with zero expenses that month or a double-click, both edge cases a real export button will hit.',
      },
    ],
  },
];

// Elicitation Technique Matcher: given a situation, pick the technique that
// actually fits — the wrong options are all real elicitation techniques too,
// just mismatched to this context, so a wrong pick teaches *when* a
// legitimate technique is still the wrong call.
export interface ElicitationOption {
  id: string;
  technique: string;
  correct: boolean;
  flaw?: string;
  explanation: string;
}

export interface ElicitationRound {
  id: string;
  scenario: string;
  options: ElicitationOption[];
}

export const ELICITATION_ROUNDS: ElicitationRound[] = [
  {
    id: 'legacy-claims',
    scenario: 'A 15-year veteran claims adjuster is the only person who understands how exceptions are handled in the legacy claims process — nothing about it is written down.',
    options: [
      {
        id: 'legacy-claims-interview',
        correct: true,
        technique: 'One-on-one Interview',
        explanation: 'Deep, undocumented expertise held by a single person calls for open-ended, exploratory questioning that can follow up in real time — exactly what a 1:1 interview is built for.',
      },
      {
        id: 'legacy-claims-survey',
        correct: false,
        flaw: 'Wrong tool for depth',
        technique: 'Survey / Questionnaire',
        explanation: 'Surveys collect shallow, structured answers from many people — they can\'t probe follow-up questions into one expert\'s undocumented mental model.',
      },
      {
        id: 'legacy-claims-focusgroup',
        correct: false,
        flaw: 'No group exists',
        technique: 'Focus Group',
        explanation: 'Focus groups synthesize a range of perspectives from multiple participants — there\'s only one person who knows this process, so there\'s no group dynamic to leverage.',
      },
      {
        id: 'legacy-claims-docs',
        correct: false,
        flaw: 'Nothing to analyze',
        technique: 'Document Analysis',
        explanation: 'The scenario states nothing about this process is written down — document analysis has no source material to work from here.',
      },
    ],
  },
  {
    id: 'cross-dept-conflict',
    scenario: 'Eight stakeholders from four departments have conflicting priorities for a new cross-functional system, and requirements can\'t be drafted until the conflicts are resolved.',
    options: [
      {
        id: 'cross-dept-workshop',
        correct: true,
        technique: 'Facilitated Requirements Workshop (JAD)',
        explanation: 'Getting every stakeholder in one room with a neutral facilitator surfaces disagreements immediately and lets them be negotiated live — the whole point of a JAD session.',
      },
      {
        id: 'cross-dept-interviews',
        correct: false,
        flaw: 'Conflicts surface too late',
        technique: 'Separate one-on-one Interviews',
        explanation: 'Interviewing each stakeholder alone produces eight separate wish lists — the conflicts only become visible afterward, during consolidation, when there\'s no room left to negotiate them face to face.',
      },
      {
        id: 'cross-dept-survey',
        correct: false,
        flaw: 'No real-time negotiation',
        technique: 'Survey / Questionnaire',
        explanation: 'A closed-ended survey can rank preferences, but it can\'t resolve an interpersonal trade-off between departments — that requires live discussion.',
      },
      {
        id: 'cross-dept-observation',
        correct: false,
        flaw: 'Off-topic technique',
        technique: 'Observation / Job Shadowing',
        explanation: 'Observation reveals how people actually work day to day — it doesn\'t address a dispute over stated priorities between department leads.',
      },
    ],
  },
  {
    id: 'warehouse-scanner',
    scenario: 'Warehouse pickers report that the new scanning app "slows them down," but when interviewed, none of them can explain exactly why.',
    options: [
      {
        id: 'warehouse-observation',
        correct: true,
        technique: 'Observation / Job Shadowing',
        explanation: 'Procedural, muscle-memory friction is often invisible to the people experiencing it — watching them scan in the actual warehouse catches the exact steps where they hesitate or backtrack, which interviews already failed to surface.',
      },
      {
        id: 'warehouse-survey',
        correct: false,
        flaw: 'Same articulation problem',
        technique: 'Survey / Questionnaire',
        explanation: 'If pickers couldn\'t articulate the friction out loud in an interview, a written survey won\'t extract it either — the problem is that the friction is tacit, not that the question format was wrong.',
      },
      {
        id: 'warehouse-docs',
        correct: false,
        flaw: 'No documentation exists',
        technique: 'Document Analysis',
        explanation: 'This is a hands-on physical workflow issue — there\'s no document that captures the tacit, in-the-moment friction pickers are experiencing.',
      },
      {
        id: 'warehouse-interview-again',
        correct: false,
        flaw: 'Already tried and failed',
        technique: 'Another round of Interviews',
        explanation: 'The scenario already tells you interviews didn\'t work — repeating the same technique that already failed to surface the cause isn\'t a fix.',
      },
    ],
  },
  {
    id: 'payment-preference',
    scenario: 'Before development starts, the team needs a quick read on which of three payment methods 5,000 existing app users would prefer.',
    options: [
      {
        id: 'payment-survey',
        correct: true,
        technique: 'Survey / Questionnaire',
        explanation: 'A large, dispersed population and a simple, structured, quantifiable question (pick one of three options) is exactly what surveys are efficient at scale for.',
      },
      {
        id: 'payment-interview',
        correct: false,
        flaw: 'Doesn\'t scale',
        technique: 'One-on-one Interview',
        explanation: 'Interviewing even a small fraction of 5,000 users would take far too long for what the team needs — a quick directional read, not deep individual insight.',
      },
      {
        id: 'payment-workshop',
        correct: false,
        flaw: 'Doesn\'t scale',
        technique: 'Facilitated Workshop',
        explanation: 'Workshops work for a small group of stakeholders in one room — you can\'t assemble 5,000 end users, and this question doesn\'t need live negotiation anyway.',
      },
      {
        id: 'payment-prototype',
        correct: false,
        flaw: 'Nothing to test yet',
        technique: 'Prototyping',
        explanation: 'Prototyping validates a specific design once options are narrowed down — nothing has been built yet, and the team just needs a preference signal first.',
      },
    ],
  },
  {
    id: 'vendor-api',
    scenario: 'The business needs to know exactly which fields an old vendor API returns before scoping a new integration. No one currently on the team has ever used this API, and the vendor is slow to respond.',
    options: [
      {
        id: 'vendor-api-docs',
        correct: true,
        technique: 'Document Analysis',
        explanation: 'With no one holding tacit knowledge of this API, the fastest reliable source of exact field-level facts is the artifacts themselves — API docs, sample response payloads, or logs from prior calls.',
      },
      {
        id: 'vendor-api-interview',
        correct: false,
        flaw: 'No one to interview',
        technique: 'One-on-one Interview',
        explanation: 'The scenario states no one on the team has ever used the API — there\'s no internal expert holding this knowledge to interview.',
      },
      {
        id: 'vendor-api-focusgroup',
        correct: false,
        flaw: 'No relevant group',
        technique: 'Focus Group',
        explanation: 'There\'s no group of end users to convene about an API\'s technical field structure — this is a factual, technical question, not a matter of opinion or experience.',
      },
      {
        id: 'vendor-api-brainstorm',
        correct: false,
        flaw: 'Wrong purpose',
        technique: 'Brainstorming',
        explanation: 'Brainstorming generates new ideas and options — it can\'t recover an existing, fixed technical specification that already exists somewhere.',
      },
    ],
  },
];

// MoSCoW Prioritization Challenge: classify every item in a small backlog
// into Must/Should/Could/Won't. Scored all-or-nothing per round (matches the
// existing correct:boolean progress contract) but every item gets its own
// explanation on submit, so a partial miss still teaches the specific
// distinction that was missed.
export type MoscowCategory = 'must' | 'should' | 'could' | 'wont';

export interface MoscowItem {
  id: string;
  text: string;
  category: MoscowCategory;
  rationale: string;
}

export interface MoscowRound {
  id: string;
  context: string;
  items: MoscowItem[];
}

export const MOSCOW_CATEGORY_LABELS: Record<MoscowCategory, string> = {
  must: 'Must Have',
  should: 'Should Have',
  could: 'Could Have',
  wont: "Won't Have (this time)",
};

export const MOSCOW_ROUNDS: MoscowRound[] = [
  {
    id: 'checkout-revamp',
    context: 'You\'re prioritizing the backlog for a checkout revamp on an e-commerce site, shipping next release.',
    items: [
      {
        id: 'checkout-card-flow',
        text: 'Support the existing credit card payment flow without regression',
        category: 'must',
        rationale: 'Core transactional capability — if it breaks, no orders can complete. There is no version of "done" for this release that ships without it.',
      },
      {
        id: 'checkout-delivery-date',
        text: 'Display an estimated delivery date on the checkout page',
        category: 'should',
        rationale: 'High customer value and likely reduces support tickets, but checkout still fully functions and orders still complete without it — important, not blocking.',
      },
      {
        id: 'checkout-multi-address',
        text: 'Let customers save multiple shipping addresses',
        category: 'could',
        rationale: 'A convenience improvement for a subset of repeat customers — low impact on the overall release if it slips.',
      },
      {
        id: 'checkout-crypto',
        text: 'Add a cryptocurrency payment option',
        category: 'wont',
        rationale: 'Explicitly out of scope for this release per stakeholder agreement — "won\'t" means deferred to a future release, not rejected as an idea.',
      },
    ],
  },
  {
    id: 'patient-portal',
    context: 'You\'re prioritizing the backlog for a hospital patient portal ahead of go-live.',
    items: [
      {
        id: 'portal-audit-log',
        text: 'Enforce HIPAA-compliant audit logging on every record view',
        category: 'must',
        rationale: 'A legal compliance requirement — the portal cannot legally go live without it, full stop.',
      },
      {
        id: 'portal-sms-reminder',
        text: 'Send an SMS appointment reminder 24 hours ahead',
        category: 'should',
        rationale: 'Meaningfully reduces costly no-shows and is high business value, but patients can still see appointments inside the portal without it — a workaround exists.',
      },
      {
        id: 'portal-dashboard-order',
        text: 'Let patients customize the order of dashboard widgets',
        category: 'could',
        rationale: 'Pure personalization with no functional impact — pleasant if there\'s time, invisible if cut.',
      },
      {
        id: 'portal-wearables',
        text: 'Integrate with wearable device health data',
        category: 'wont',
        rationale: 'Bigger in scope than a single release can absorb — flagged for a future phase rather than crammed into this one.',
      },
    ],
  },
  {
    id: 'hr-onboarding',
    context: 'You\'re prioritizing the backlog for an internal HR employee-onboarding tool.',
    items: [
      {
        id: 'hr-i9-esign',
        text: 'Collect I-9 and tax withholding forms electronically with e-signature',
        category: 'must',
        rationale: 'Legally required onboarding paperwork — a new employee cannot be lawfully onboarded without it.',
      },
      {
        id: 'hr-onboarding-buddy',
        text: 'Auto-assign an onboarding buddy based on department',
        category: 'should',
        rationale: 'Meaningfully improves new-hire experience and retention, but HR can still assign a buddy manually if it\'s not automated yet — a workaround exists.',
      },
      {
        id: 'hr-welcome-animation',
        text: 'Show a "welcome" animation on the employee\'s first login',
        category: 'could',
        rationale: 'A nice touch with zero functional impact on whether onboarding actually happens.',
      },
      {
        id: 'hr-multilanguage',
        text: 'Translate all onboarding forms into multiple languages',
        category: 'wont',
        rationale: 'Valuable once the company scales into new regions, but no current employees need it yet — deferred, not dismissed.',
      },
    ],
  },
  {
    id: 'fraud-alerts',
    context: 'You\'re prioritizing the backlog for a mobile banking app\'s new fraud-alert feature.',
    items: [
      {
        id: 'fraud-block-notify',
        text: 'Block a transaction and notify the user in real time when the fraud score exceeds threshold',
        category: 'must',
        rationale: 'This is the entire point of the feature — without it, "fraud alerts" prevents no fraud and has no value at all.',
      },
      {
        id: 'fraud-mark-legit',
        text: 'Let users mark a flagged transaction as "not fraud" to reduce future false positives',
        category: 'should',
        rationale: 'Significantly improves accuracy and user trust over time, but the core protection still works without it — it would just stay noisier for longer.',
      },
      {
        id: 'fraud-alert-sound',
        text: 'Let users choose the alert notification sound',
        category: 'could',
        rationale: 'A trivial preference with no bearing on protection or usability either way.',
      },
      {
        id: 'fraud-ml-scoring',
        text: 'Build predictive fraud scoring using on-device machine learning',
        category: 'wont',
        rationale: 'A large initiative requiring its own data-science workstream — correctly deferred rather than bolted onto this release.',
      },
    ],
  },
];

// BA Glossary: a fast-lookup companion to the full BABOK PDF — core terms a
// working BA is expected to recognize on sight, grouped so the reference
// panel can filter by category.
export interface GlossaryTerm {
  term: string;
  category: string;
  definition: string;
}

export const GLOSSARY_CATEGORIES = [
  'Knowledge Areas',
  'Elicitation',
  'Requirements',
  'Analysis & Prioritization',
  'Artifacts',
  'Process',
] as const;

export const GLOSSARY_TERMS: GlossaryTerm[] = [
  // Knowledge Areas (BABOK v3's six)
  { term: 'Business Analysis Planning & Monitoring', category: 'Knowledge Areas', definition: 'The knowledge area covering how BA work itself is planned, governed, and tracked — which stakeholders to engage, which techniques to use, and how BA performance is measured.' },
  { term: 'Elicitation & Collaboration', category: 'Knowledge Areas', definition: 'The knowledge area covering how information is drawn out of stakeholders and confirmed — interviews, workshops, observation, and the ongoing collaboration needed to keep that information accurate.' },
  { term: 'Requirements Life Cycle Management', category: 'Knowledge Areas', definition: 'The knowledge area covering how requirements are traced, maintained, prioritized, and approved from the moment they\'re captured until the solution retires.' },
  { term: 'Strategy Analysis', category: 'Knowledge Areas', definition: 'The knowledge area covering the case for change — current-state analysis, future-state definition, and the risk/value assessment that justifies a solution before it\'s built.' },
  { term: 'Requirements Analysis & Design Definition', category: 'Knowledge Areas', definition: 'The knowledge area covering how raw elicited information is structured, modeled, and turned into requirements and designs precise enough to build from.' },
  { term: 'Solution Evaluation', category: 'Knowledge Areas', definition: 'The knowledge area covering how a delivered solution is measured against the value it was meant to create, and what limitations or improvement opportunities remain.' },
  // Elicitation techniques
  { term: 'Elicitation', category: 'Elicitation', definition: 'The general term for any technique used to draw requirements, needs, or knowledge out of stakeholders — interviews, workshops, observation, surveys, and document analysis are all elicitation techniques.' },
  { term: 'JAD Session', category: 'Elicitation', definition: 'Joint Application Design — a structured, facilitated workshop that brings stakeholders together to define requirements collaboratively in real time, resolving conflicts live rather than after the fact.' },
  { term: 'Job Shadowing', category: 'Elicitation', definition: 'An observation technique where the analyst watches a stakeholder perform their actual work, useful for surfacing tacit or procedural knowledge the stakeholder can\'t easily put into words.' },
  { term: 'Document Analysis', category: 'Elicitation', definition: 'Reviewing existing artifacts — system documentation, API specs, old requirements, logs — as a source of requirements, especially useful when the people who built something are no longer around to ask.' },
  { term: 'Prototyping', category: 'Elicitation', definition: 'Building a low-fidelity or interactive mockup of a solution so stakeholders can react to something concrete, often surfacing requirements they couldn\'t articulate from a blank page.' },
  // Requirements
  { term: 'INVEST', category: 'Requirements', definition: 'A mnemonic for good user stories: Independent, Negotiable, Valuable, Estimable, Small, Testable. A story failing any letter is a signal it needs to be rewritten or split.' },
  { term: 'Given/When/Then', category: 'Requirements', definition: 'The Gherkin format for writing acceptance criteria as a precondition (Given), an action (When), and an expected result (Then) — structured so each line is independently testable.' },
  { term: 'Non-Functional Requirement', category: 'Requirements', definition: 'A requirement describing a quality of the system rather than a specific behavior — performance, security, availability, accessibility — as opposed to a functional requirement describing what the system does.' },
  { term: 'Business Requirements Document (BRD)', category: 'Requirements', definition: 'A document capturing the high-level business needs and objectives a solution must satisfy, written for stakeholders rather than developers — the "why," not the "how."' },
  { term: 'Functional Requirements Document (FRD)', category: 'Requirements', definition: 'A document detailing exactly what a system must do, specific enough for a development team to build against — the "what," derived from and traceable back to the BRD.' },
  { term: 'Definition of Done', category: 'Requirements', definition: 'The team\'s agreed checklist of conditions a piece of work must meet before it\'s considered complete — separate from a specific story\'s acceptance criteria, and applied uniformly across all work.' },
  { term: 'Scope Creep', category: 'Requirements', definition: 'The uncontrolled expansion of a project\'s requirements after work has begun, usually through small, individually-reasonable additions that were never formally approved against the original scope.' },
  // Analysis & Prioritization
  { term: 'MoSCoW', category: 'Analysis & Prioritization', definition: 'A prioritization technique sorting requirements into Must have, Should have, Could have, and Won\'t have (this time) — forcing an explicit conversation about what\'s truly non-negotiable versus merely desirable.' },
  { term: 'Kano Model', category: 'Analysis & Prioritization', definition: 'A framework classifying features by how they affect satisfaction: Basic (expected, causes dissatisfaction if missing), Performance (more is better, linear satisfaction), and Delighters (unexpected, disproportionately boost satisfaction).' },
  { term: 'Gap Analysis', category: 'Analysis & Prioritization', definition: 'Comparing the current state ("As-Is") to the desired future state ("To-Be") to identify exactly what must change — the difference between the two states defines the scope of work.' },
  { term: 'Root Cause Analysis (5 Whys)', category: 'Analysis & Prioritization', definition: 'Repeatedly asking "why" behind a stated problem, typically five times, to move past a symptom and reach the underlying cause a solution should actually target.' },
  { term: 'SWOT Analysis', category: 'Analysis & Prioritization', definition: 'A strategic assessment across Strengths, Weaknesses (internal) and Opportunities, Threats (external), used during strategy analysis to evaluate whether a proposed change is well-positioned to succeed.' },
  { term: 'SMART Criteria', category: 'Analysis & Prioritization', definition: 'A check for well-formed objectives: Specific, Measurable, Achievable, Relevant, Time-bound — commonly applied to business objectives and goals, distinct from INVEST which applies to user stories.' },
  // Artifacts
  { term: 'User Story', category: 'Artifacts', definition: 'A short, user-voiced statement of a need in the form "As a [role], I want [action], so that [benefit]" — a placeholder for a conversation about a requirement, not a complete specification on its own.' },
  { term: 'Acceptance Criteria', category: 'Artifacts', definition: 'The specific, testable conditions a user story must satisfy to be considered complete — the concrete definition of "done" for that one story, distinct from the team-wide Definition of Done.' },
  { term: 'Use Case', category: 'Artifacts', definition: 'A structured description of how an actor interacts with a system to achieve a goal, including the main success scenario and alternate/exception flows — more formal and complete than a single user story.' },
  { term: 'Traceability Matrix', category: 'Artifacts', definition: 'A document linking each requirement to its source (why it exists) and its downstream artifacts (design, test case, code) so the impact of any change can be assessed in both directions.' },
  { term: 'RACI Matrix', category: 'Artifacts', definition: 'A responsibility-assignment chart marking each person on a task as Responsible, Accountable, Consulted, or Informed — used to eliminate ambiguity about who actually decides versus who\'s just kept in the loop.' },
  { term: 'Wireframe', category: 'Artifacts', definition: 'A low-fidelity visual layout of a screen showing structure and placement without visual styling — used to validate flow and content before investing in full design.' },
  // Process
  { term: 'As-Is / To-Be', category: 'Process', definition: 'Paired models describing a process as it currently works (As-Is) and as it\'s intended to work after the change (To-Be) — the delta between them is the actual scope of the initiative.' },
  { term: 'Stakeholder', category: 'Process', definition: 'Anyone with an interest in or influence over the outcome of an initiative — not limited to end users; includes sponsors, regulators, support teams, and anyone whose work changes as a result.' },
  { term: 'Backlog Refinement', category: 'Process', definition: 'The ongoing activity of reviewing, clarifying, estimating, and reordering backlog items so they\'re ready to be pulled into an upcoming iteration — distinct from prioritization, which decides what order they belong in.' },
];
