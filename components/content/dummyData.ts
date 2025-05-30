export const dummyTranscript = [
  { time: "0:00", text: "Welcome to this comprehensive GitHub tutorial. In this video, we'll explore everything you need to know about version control with Git and GitHub." },
  { time: "1:30", text: "GitHub is a cloud-based platform that hosts Git repositories and provides collaboration tools for developers." },
  { time: "3:15", text: "Let's start by creating a new repository and understanding the basic Git workflow." },
  { time: "5:45", text: "Pull requests are a key feature of GitHub that allow you to propose changes to a codebase." }
];

export const dummyFlashcards = [
  {
    front: "What is GitHub?",
    back: "GitHub is a cloud-based hosting service that lets you manage Git repositories. It provides features like access control, collaboration tools, bug tracking, and more.",
  },
  {
    front: "What is a pull request?",
    back: "A pull request is a method of submitting contributions to a project. It lets you notify team members that you've completed a feature or fixed an issue.",
  },
  {
    front: "What is a fork in GitHub?",
    back: "A fork is a copy of a repository that allows you to freely experiment with changes without affecting the original project.",
  },
  {
    front: "What is Git?",
    back: "Git is a distributed version control system that tracks changes in source code during software development.",
  }
];

export const dummySummary = [
  "This GitHub tutorial provides a comprehensive introduction to version control with Git and the collaborative features of GitHub.",
  "The video covers repository creation, branching strategies, pull requests, and code review processes.",
  "Key GitHub features like Issues, Actions, and Projects are explained with practical examples.",
  "Best practices for team collaboration and maintaining clean commit history are also discussed."
];

export const dummyQuiz = [
  {
    question: "What is the main purpose of GitHub?",
    options: ["Code hosting only", "Version control and collaboration", "Database management", "Web hosting"],
    correctAnswer: 1,
    explanation: "GitHub is primarily a platform for version control and collaboration, allowing developers to work together on projects.",
  },
  {
    question: "What command creates a local copy of a remote repository?",
    options: ["git push", "git clone", "git commit", "git branch"],
    correctAnswer: 1,
    explanation: "The 'git clone' command creates a local copy of a remote repository on your computer.",
  },
  {
    question: "What is a GitHub Action?",
    options: ["A pull request", "A branch protection rule", "An automated workflow", "A code review"],
    correctAnswer: 2,
    explanation: "GitHub Actions are automated workflows that can be triggered by events in your repository, like pushing code or opening a pull request.",
  }
];

export const dummyMindMap = {
  nodes: [
    { key: 1, text: "GitHub Essentials", category: "root" },
    { key: 2, text: "Repositories", category: "section" },
    { key: 3, text: "Collaboration", category: "section" },
    { key: 4, text: "CI/CD", category: "section" },
    { key: 5, text: "Forks & Clones", category: "topic" },
    { key: 6, text: "Pull Requests", category: "topic" },
    { key: 7, text: "GitHub Actions", category: "topic" },
    { key: 8, text: "Issues", category: "topic" },
    { key: 9, text: "Branches", category: "topic" },
    { key: 10, text: "Code Reviews", category: "topic" }
  ],
  links: [
    { from: 1, to: 2 },
    { from: 1, to: 3 },
    { from: 1, to: 4 },
    { from: 2, to: 5 },
    { from: 2, to: 9 },
    { from: 3, to: 6 },
    { from: 3, to: 8 },
    { from: 3, to: 10 },
    { from: 4, to: 7 }
  ]
};
