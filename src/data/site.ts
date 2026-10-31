// Single source of truth for both the site and the /cv print route.
export const site = {
  name: 'Nevalen Aginda Prasetyo',
  role: 'Tech Lead',
  email: 'nevalenaginda10@gmail.com',
  location: 'Jakarta, Indonesia',
  linkedin: 'https://linkedin.com/in/nevalen-aginda-prasetyo-57ba3a120',
  github: 'https://github.com/nevalenaginda',
};

export const summary =
  'Tech Lead for the payment and merchant-acquiring backend behind Jenius, serving roughly 500,000 active users and about 2,000 active QRIS merchants at p99 latency under 500 ms and an unexpected error rate under 2.5%. I lead backend delivery from scope and design review through release, working with Node.js, Python, Apache Kafka, MongoDB, Redis, OpenShift, and Jenkins.';

export const metrics = [
  ['~500k', 'active users of the Jenius consumer app'],
  ['~2,000', 'active merchant businesses on QRIS'],
  ['< 500 ms', 'p99 latency'],
  ['< 2.5%', 'unexpected error rate'],
  ['~5 yrs', 'professional experience'],
  ['3', 'product releases'],
];

export const skills = [
  { group: 'Languages', items: [['Node.js', 'Daily use'], ['Python', 'Daily use']] },
  { group: 'Backend', items: [['Apache Kafka', 'Daily use'], ['Redis', 'Working knowledge'], ['Distributed systems design', 'Practice area'], ['Performance testing', 'Daily use']] },
  { group: 'Database', items: [['MongoDB', 'Daily use']] },
  { group: 'Cloud & Platform', items: [['OpenShift', 'Working knowledge']] },
  { group: 'DevOps', items: [['Jenkins', 'Working knowledge']] },
  { group: 'Tools & Other', items: [['OpenCV', 'Working knowledge'], ['Backend delivery leadership', 'Practice area'], ['AI exploration', 'Learning']] },
];

export const experience = [
  {
    when: 'Oct 2024 – present',
    role: 'Tech Lead',
    org: 'PT Bank SMBC Indonesia — Jenius',
    challenge: 'Deliver backend changes on a live payment and merchant-acquiring platform where errors affect customer funds, with a team that changes from project to project.',
    solution: 'Lead backend scope, design review, and release readiness. Set review standards, define failure handling, and agree on the interfaces other teams depend on.',
    impact: 'The backend serves roughly 500,000 active Jenius users and about 2,000 active QRIS merchants at p99 latency under 500 ms and an unexpected error rate under 2.5%. Shipped two product releases, in 2025 and 2026.',
    tech: ['Node.js', 'Kafka', 'MongoDB', 'Redis', 'OpenShift', 'Jenkins'],
  },
  {
    when: '2023 – 2024',
    role: 'Backend Developer',
    org: 'PT Bank SMBC Indonesia — Jenius',
    challenge: 'Activating a new account required a video call or a branch visit, and moving to a new phone required contacting support to unlink the old device.',
    solution: 'Built backend support for face verification of the user profile, combined with password and OTP, including a fallback path for users who cannot complete face verification and the device lifecycle states around it.',
    impact: 'Face recognition launched publicly for faster account activation and self-service device unlink, so users no longer need support to change phones.',
    tech: ['Node.js', 'MongoDB', 'OpenCV'],
  },
  {
    when: 'Oct 2021 – 2022',
    role: 'IT Trainee',
    org: 'PT Bank SMBC Indonesia — Jenius',
    challenge: 'Joined a production banking team with no prior professional software experience.',
    solution: 'Took on supporting engineering tasks under code review while learning backend fundamentals.',
    impact: 'Promoted to Backend Developer after one year.',
    tech: [],
  },
];

export const education = [
  { title: 'B.Sc. Physics', org: 'Universitas Lampung', when: '2015 – 2021', detail: 'GPA 3.61/4.00' },
];

export const principles = [
  ['Correctness first', 'In payment flows, a fast but wrong result is the worst outcome. Every state should be explicit rather than inferred.'],
  ['Visible failures', 'A silent failure in a payment path costs more than a visible one, so error handling is designed up front.'],
  ['Operable releases', 'A release is ready when the on-call engineer can diagnose it from logs and traces alone.'],
  ['Decisions backed by data', 'My physics background taught me to settle design questions with production measurements rather than opinion.'],
];

// ARIS-1, the astronaut robot on the home page. Its four inspectable parts each stand for one
// system module below, so inspecting a part and scanning a module card tell the same story.
export type Part = 'visor' | 'reactor' | 'manipulator' | 'thruster';

const level = (name: string) => skills.flatMap((group) => group.items).find(([n]) => n === name)?.[1] ?? '';
const mod = (code: string, name: string, role: string, part: Part, items: string[], say: string) =>
  ({ code, name, role, part, items: items.map((item) => [item, level(item)] as const), say });

// The skills above, regrouped into the module names of the ARIS-1 brief. Levels come from `skills`.
export const modules = [
  mod('MOD-01', 'Titanium Armor Frame', 'Core runtime', 'manipulator', ['Node.js', 'Python'],
    'Titanium Armor Frame. The core runtime: Node.js and Python, both in daily use for payment and merchant backends.'),
  mod('MOD-02', 'Quantum Neural Core', 'Design and leadership', 'visor', ['Distributed systems design', 'Backend delivery leadership', 'OpenCV', 'AI exploration'],
    'Quantum Neural Core. Distributed systems design and backend delivery leadership are practice areas. OpenCV is working knowledge, and AI is still being explored.'),
  mod('MOD-03', 'Fusion Reactor Cell', 'Event streaming and data', 'reactor', ['Apache Kafka', 'MongoDB', 'Redis'],
    'Fusion Reactor Cell. Apache Kafka and MongoDB in daily use, with Redis as working knowledge.'),
  mod('MOD-04', 'Sub-Space Telemetry', 'Platform, delivery and performance', 'thruster', ['OpenShift', 'Jenkins', 'Performance testing'],
    'Sub-Space Telemetry. Performance testing in daily use, with OpenShift and Jenkins as working knowledge.'),
];

export const parts: Record<Part, { label: string; module: string; say: string }> = {
  visor: { label: 'Visor', module: 'Quantum Neural Core', say: 'Visor online. Multi-spectral optics link to the Quantum Neural Core: systems design, delivery leadership, and computer vision.' },
  reactor: { label: 'Reactor', module: 'Fusion Reactor Cell', say: 'Reactor at full output. The Fusion Reactor Cell runs on Apache Kafka, MongoDB, and Redis.' },
  manipulator: { label: 'Manipulator', module: 'Titanium Armor Frame', say: 'Manipulator arm engaged. The Titanium Armor Frame is built from Node.js and Python.' },
  thruster: { label: 'Thruster', module: 'Sub-Space Telemetry', say: 'Thrusters firing. Sub-Space Telemetry covers OpenShift, Jenkins, and performance testing.' },
};

// Solar flight mode: each body is a waypoint for one section of the page.
export const waypoints = [
  { id: 'sun', name: 'Sun', section: 'viewport', title: 'Core profile', brief: 'Tech Lead for the payment and merchant-acquiring backend behind Jenius, about five years in.' },
  { id: 'earth', name: 'Earth', section: 'contact', title: 'Home base: Jakarta', brief: 'Open to mentoring and technical collaboration. Email, LinkedIn, and GitHub are on the comms terminal.' },
  { id: 'mars', name: 'Mars', section: 'missions', title: 'Deployed missions', brief: 'Three product releases in production: Pay on Schedule, Bisniskit, and face recognition.' },
  { id: 'jupiter', name: 'Jupiter', section: 'specs', title: 'System architecture', brief: 'Four modules: Node.js and Python, Kafka and MongoDB, OpenShift and Jenkins, and systems design.' },
  { id: 'saturn', name: 'Saturn', section: 'log', title: 'Flight log', brief: 'From IT trainee in 2021 to Tech Lead in 2024, all on the Jenius platform.' },
] as const;
export type Waypoint = (typeof waypoints)[number]['id'];
