export const dummyTranscript = [
  { time: "0:00", text: "Welcome to this comprehensive MongoDB tutorial..." },
  /* ... etc ... */
];

export const dummyFlashcards = [
  {
    front: "What is MongoDB?",
    back: "MongoDB is a document-oriented NoSQL...",
  },
  /* ... etc ... */
];

export const dummySummary = [
  "This MongoDB tutorial provides a comprehensive introduction...",
  /* ... etc ... */
];

export const dummyTakeaways = [
  "MongoDB uses a flexible, document-based data model",
  /* ... etc ... */
];

export const dummyQuiz = [
  {
    question: "What is the primary data structure in MongoDB?",
    options: ["Table", "Document", "Graph", "Key-Value Pair"],
    correctAnswer: 1,
    explanation: "MongoDB stores data in flexible, JSON-like documents.",
  },
  /* ... etc ... */
];

export const dummyMindMap = {
  nodes: [
    { key: 1, text: "MongoDB Basics", category: "root" },
    { key: 2, text: "Documents", category: "section" },
    { key: 3, text: "Collections", category: "section" },
    { key: 4, text: "Databases", category: "section" },
    { key: 5, text: "BSON Format", category: "topic" },
    { key: 6, text: "Schema Design", category: "topic" },
    { key: 7, text: "Sharding", category: "topic" }
  ],
  links: [
    { from: 1, to: 2 },
    { from: 1, to: 3 },
    { from: 1, to: 4 },
    { from: 2, to: 5 },
    { from: 3, to: 6 },
    { from: 4, to: 7 }
  ]
};
