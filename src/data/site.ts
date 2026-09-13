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
  'Tech Lead for a payment and merchant-acquiring backend serving roughly 500,000 active users of the Jenius consumer app and about 2,000 active merchants on QRIS, at p99 latency under 500 ms and an unexpected error rate under 2.5%. I lead backend delivery end to end — scope, design review, and release — across Node.js, Python, Apache Kafka, MongoDB, Redis, OpenShift, and Jenkins.';

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
    challenge: 'Own backend delivery for a live payment and merchant-acquiring platform where a correctness mistake is a customer-money problem, and team composition changes from project to project.',
    solution: 'Lead backend scope, design review, and release readiness end to end — setting the review bar, failure behaviour, and the interfaces other teams build on. Team size flexes with the project rather than being fixed.',
    impact: 'Backend serving roughly 500,000 active Jenius users and about 2,000 active QRIS merchants, held at p99 latency under 500 ms and an unexpected error rate under 2.5%. Two product releases shipped in 2025 and 2026.',
    tech: ['Node.js', 'Kafka', 'MongoDB', 'Redis', 'OpenShift', 'Jenkins'],
  },
  {
    when: '2023 – 2024',
    role: 'Backend Developer',
    org: 'PT Bank SMBC Indonesia — Jenius',
    challenge: 'New-account activation required a video call or a branch visit, and switching phones required contacting support to unlink the old device.',
    solution: 'Built on face-based verification of the profile rather than the device, layered with password and OTP, plus the non-face fallback path and the device lifecycle states around it.',
    impact: 'Face recognition shipped as a public feature for faster activation and self-service device unlink, removing a support dependency for device moves.',
    tech: ['Node.js', 'MongoDB', 'OpenCV'],
  },
  {
    when: 'Oct 2021 – 2022',
    role: 'IT Trainee',
    org: 'PT Bank SMBC Indonesia — Jenius',
    challenge: 'Entry into production banking engineering without prior professional software experience.',
    solution: 'Delivered supporting engineering work under review while building backend fundamentals.',
    impact: 'Progressed to Backend Developer after one year.',
    tech: [],
  },
];

export const education = [
  { title: 'B.Sc. Physics', org: 'Universitas Lampung', when: '2015 – 2021', detail: 'GPA 3.61/4.00' },
];

export const principles = [
  ['Correctness outranks convenience', 'In payment flows, a wrong but fast answer is the worst outcome. I would rather make a state explicit than guess at it.'],
  ['Fail loudly, fail visibly', 'A silent failure in a money path costs more than a loud one. Error behaviour gets designed, not discovered.'],
  ['Read the code before you ship it', 'A release is not done until someone on-call can debug it from the logs and traces alone.'],
  ['Measure, then argue', 'A physics degree taught me to settle design debates with numbers from production, not with strong opinions.'],
];
