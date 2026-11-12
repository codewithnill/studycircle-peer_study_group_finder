// this file holds every fake word list and setting the seed uses.
// keeping them here means the other seed files hold logic only, and the data is easy to edit.
// safety: all data in this file is fake. no real person, email, or password is used.
// no imports are needed. this file only holds plain values.

// ---------- accounts ----------

// the fixed admin email. the ".test" ending is reserved for tests, so it can never be a real address.
export const ADMIN_EMAIL = 'admin@studycircle.test';

// the name shown for the admin account.
export const ADMIN_NAME = 'Demo Admin';

// how many students the seed creates.
export const STUDENT_COUNT = 30;

// the end part of every student email, for example student01@studycircle.test.
export const STUDENT_EMAIL_DOMAIN = 'studycircle.test';

// safety: this demo password is public in git on purpose. it is only safe because the guards
// stop the seed from running anywhere except a local development database.
export const DEMO_STUDENT_PASSWORD = 'Student@12345';

// how much work bcrypt does per password. 10 is a common, safe balance of speed and strength.
export const BCRYPT_ROUNDS = 10;

// ---------- levels and subjects ----------

// the shape of one level row.
export interface LevelSeed {
  name: string;
  description: string;
  sortOrder: number;
}

// the three levels. sortOrder makes "Beginner" show first in menus.
export const LEVELS: readonly LevelSeed[] = [
  { name: 'Beginner', description: 'New to the topic, starting from chapter 1.', sortOrder: 1 },
  { name: 'Intermediate', description: 'Knows the basics and wants to practise harder problems.', sortOrder: 2 },
  { name: 'Advanced', description: 'Comfortable with the topic and preparing for tough exam questions.', sortOrder: 3 },
];

// the shape of one subject row.
export interface SubjectSeed {
  name: string;
  category: string;
  courseCode: string;
}

// twelve fake subjects. the course codes are made up.
export const SUBJECTS: readonly SubjectSeed[] = [
  { name: 'Data Structures', category: 'Computer Science', courseCode: 'CSC2210' },
  { name: 'Algorithms', category: 'Computer Science', courseCode: 'CSC3215' },
  { name: 'Database Systems', category: 'Computer Science', courseCode: 'CSC3218' },
  { name: 'Operating Systems', category: 'Computer Science', courseCode: 'CSC3240' },
  { name: 'Calculus I', category: 'Mathematics', courseCode: 'MAT1101' },
  { name: 'Linear Algebra', category: 'Mathematics', courseCode: 'MAT2205' },
  { name: 'Probability and Statistics', category: 'Mathematics', courseCode: 'STA2101' },
  { name: 'Physics I', category: 'Physics', courseCode: 'PHY1101' },
  { name: 'Digital Logic Design', category: 'Electrical Engineering', courseCode: 'EEE2103' },
  { name: 'Financial Accounting', category: 'Business', courseCode: 'ACC1101' },
  { name: 'Microeconomics', category: 'Economics', courseCode: 'ECO1101' },
  { name: 'Technical Writing', category: 'English', courseCode: 'ENG2201' },
];

// two or three fake topics for each subject. the key must match the subject name exactly.
export const SUBJECT_TOPICS: Readonly<Record<string, readonly string[]>> = {
  'Data Structures': ['Linked lists and stacks', 'Trees and graphs', 'Hash tables'],
  Algorithms: ['Sorting and searching', 'Dynamic programming', 'Greedy methods'],
  'Database Systems': ['SQL joins', 'Normalization', 'Transactions'],
  'Operating Systems': ['Process scheduling', 'Memory management'],
  'Calculus I': ['Limits and continuity', 'Derivatives', 'Integration basics'],
  'Linear Algebra': ['Matrices and determinants', 'Eigenvalues'],
  'Probability and Statistics': ['Probability rules', 'Distributions', 'Hypothesis tests'],
  'Physics I': ['Newton laws', 'Work and energy'],
  'Digital Logic Design': ['Boolean algebra', 'Flip-flops and counters'],
  'Financial Accounting': ['Journal entries', 'Balance sheet basics'],
  Microeconomics: ['Supply and demand', 'Market structures'],
  'Technical Writing': ['Report structure', 'Clear sentences'],
};

// ---------- students ----------

// thirty fake first names.
export const FIRST_NAMES: readonly string[] = [
  'Anika', 'Rafi', 'Tania', 'Imran', 'Nusrat', 'Sabbir', 'Mithila', 'Farhan', 'Priya', 'Tanvir',
  'Lamia', 'Arif', 'Sadia', 'Rakib', 'Jannat', 'Omar', 'Maliha', 'Shakil', 'Ritu', 'Nabil',
  'Samira', 'Fahim', 'Tasnim', 'Asif', 'Ishrat', 'Zubair', 'Mou', 'Hasan', 'Rumana', 'Siam',
];

// thirty fake last names. the seed pairs the two lists in a fixed way, so no two students share a full name.
export const LAST_NAMES: readonly string[] = [
  'Rahman', 'Hossain', 'Akter', 'Islam', 'Chowdhury', 'Ahmed', 'Khan', 'Sarker', 'Mia', 'Begum',
  'Das', 'Roy', 'Karim', 'Uddin', 'Alam', 'Sultana', 'Haque', 'Mondal', 'Talukder', 'Biswas',
  'Sheikh', 'Khatun', 'Bhuiyan', 'Majumder', 'Paul', 'Barua', 'Mahmud', 'Jahan', 'Kabir', 'Nahar',
];

// fake departments for the student profiles.
export const DEPARTMENTS: readonly string[] = ['CSE', 'EEE', 'BBA', 'English', 'Economics', 'Mathematics', 'Physics'];

// short fake bios. some students get none, so profiles look natural.
export const STUDENT_BIOS: readonly string[] = [
  'First-year student. Looking for a calm group to revise with.',
  'I learn best by explaining topics to others.',
  'Prefer evening study sessions and short breaks.',
  'Trying to improve my problem solving before the exams.',
  'Happy to share notes and past questions.',
  'Studying part time, so weekends work best for me.',
  'Like small groups where everyone speaks.',
  'Retaking a course and want steady practice.',
];

// ---------- groups ----------

// the end part of each group title, for example "Data Structures — Midterm Prep".
export const GROUP_TITLE_SUFFIXES: readonly string[] = [
  'Midterm Prep',
  'Final Exam Prep',
  'Weekly Practice',
  'Problem Solving Circle',
  'Concept Review',
  'Quiz Practice',
];

// longer write-ups for the group description.
export const GROUP_DESCRIPTIONS: readonly string[] = [
  'We meet to solve past questions together and explain the hard parts to each other. Come prepared with one problem you got stuck on.',
  'A relaxed group that goes through one chapter per meeting. Everyone takes a turn to teach a small part.',
  'Focused exam preparation. We share summaries, quiz each other, and keep a simple study plan.',
  'A friendly circle for steady practice. No pressure, but please attend regularly and tell the group if you cannot come.',
  'We work through examples first and theory second. Good for students who learn by doing.',
  'Small group with clear rules: be on time, be kind, and share what you learn.',
];

// places for in-person groups and sessions.
export const CAMPUS_LOCATIONS: readonly string[] = [
  'Library, second floor study room',
  'Cafeteria, corner table',
  'Building B, Room 204',
  'Student Center, quiet lounge',
  'Library, group study room 3',
  'Building A, Room 112',
];

// the base of the fake online meeting links. example.com is reserved for examples, so it never leads to a real meeting.
export const MEETING_LINK_BASE = 'https://meet.example.com/';

// ---------- join requests ----------

// short notes a student writes when asking to join.
export const JOIN_REQUEST_MESSAGES: readonly string[] = [
  'I am in the same section and need help with the hard chapters.',
  'I can join the evening sessions. Please let me in.',
  'I missed two lectures and want to catch up with a group.',
  'I studied this topic last term and can help others too.',
  'Looking for steady practice before the midterm.',
  'My friends are not in this course, so I would like to study with you.',
];

// reasons a leader gives when rejecting a request.
export const REJECT_NOTES: readonly string[] = [
  'Sorry, the group focuses on a different chapter this month.',
  'We need people who can attend on weekdays. Please try another group.',
  'The group is nearly full and we are keeping the last seat for a classmate.',
];

// ---------- sessions and reviews ----------

// names for study sessions.
export const SESSION_TITLES: readonly string[] = [
  'Past paper practice',
  'Chapter review',
  'Problem solving hour',
  'Quiz and discussion',
  'Doubt clearing session',
  'Mock exam run',
];

// reasons a leader gives when cancelling a session.
export const CANCEL_REASONS: readonly string[] = [
  'The room was not available.',
  'Many members have another class that day.',
  'The leader is unwell. We will pick a new time.',
];

// short review comments. some reviews have no comment.
export const REVIEW_COMMENTS: readonly string[] = [
  'Clear explanations and a good pace.',
  'Helpful session. I finally understood the topic.',
  'Started late, but the content was useful.',
  'Great practice questions.',
  'A bit crowded, but I learned a lot.',
  'Well organised. Please share the notes next time.',
];

// ---------- chat and posts ----------

// short chat lines for the group chat.
export const CHAT_LINES: readonly string[] = [
  'Hi everyone, is the next session still on?',
  'Yes, same time as last week.',
  'Can someone share the notes from chapter 3?',
  'I will upload them later today.',
  'I am stuck on question 4. Any hint?',
  'Try drawing the steps on paper first. It helped me.',
  'Thanks, that makes sense now.',
  'Please bring your calculators tomorrow.',
  'I might be ten minutes late.',
  'No problem, we will start with the easy part.',
  'Does anyone have the past paper from last year?',
  'Good session today. See you all next week.',
  'Remember to read the next chapter before we meet.',
  'Can we move the session one hour later?',
  'Works for me.',
  'I can bring snacks this time.',
];

// titles for group posts.
export const POST_TITLES: readonly string[] = [
  'Rules for this group',
  'Plan for this month',
  'Please read before the next session',
  'Useful resources',
  'Exam week schedule',
];

// bodies for group posts. the position matches the title list above.
export const POST_BODIES: readonly string[] = [
  'Be on time, be kind, and tell the group early if you cannot come.',
  'We will cover one chapter per week and finish with a mock quiz.',
  'Please solve the first five questions on your own before we meet.',
  'Past papers and summary notes are shared in the files section.',
  'Sessions move to the library during exam week. Check the session list for times.',
];