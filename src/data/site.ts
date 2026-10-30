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
