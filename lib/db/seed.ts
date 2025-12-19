import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  dependencies,
  features,
  groups,
  initiatives,
  markers,
  products,
  releases,
  schedulingRules,
  statuses,
  users,
} from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const client = postgres(connectionString);
const db = drizzle(client);

// Seed data
const seedStatuses = [
  { name: "Planned", color: "#6B7280" },
  { name: "In Progress", color: "#F59E0B" },
  { name: "Done", color: "#10B981" },
];

const seedUsers = [
  { name: "Sarah Chen", image: "https://i.pravatar.cc/150?u=sarah" },
  { name: "Marcus Johnson", image: "https://i.pravatar.cc/150?u=marcus" },
  { name: "Emily Rodriguez", image: "https://i.pravatar.cc/150?u=emily" },
  { name: "James Wilson", image: "https://i.pravatar.cc/150?u=james" },
];

const seedGroups = [
  { name: "User Experience Optimization" },
  { name: "Backend Infrastructure" },
  { name: "Mobile Platform" },
  { name: "Data Analytics" },
  { name: "Security Compliance" },
  { name: "Integration Services" },
];

const seedProducts = [
  { name: "Customer Portal" },
  { name: "Admin Dashboard" },
  { name: "Mobile Application" },
  { name: "API Gateway" },
];

const seedInitiatives = [
  { name: "Q1 Performance Sprint" },
  { name: "Customer Satisfaction Drive" },
];

const seedReleases = [
  { name: "v2.0 Major Release" },
  { name: "v2.1 Patch Release" },
  { name: "v3.0 Beta" },
];

const markerClassNames = [
  "bg-blue-100 text-blue-900",
  "bg-green-100 text-green-900",
  "bg-purple-100 text-purple-900",
  "bg-red-100 text-red-900",
  "bg-orange-100 text-orange-900",
  "bg-teal-100 text-teal-900",
];

const seedMarkerLabels = [
  "Sprint Planning",
  "Design Review",
  "Security Audit",
  "Release Deadline",
  "Stakeholder Demo",
  "Team Retrospective",
];

const featureNames = [
  "Implement user authentication flow",
  "Design responsive dashboard layout",
  "Optimize database query performance",
  "Add real-time notifications",
  "Create mobile navigation menu",
  "Build analytics reporting module",
  "Integrate payment gateway",
  "Develop API rate limiting",
  "Implement file upload system",
  "Create user preference settings",
  "Add multi-language support",
  "Build search functionality",
  "Implement caching layer",
  "Create automated testing suite",
  "Add accessibility features",
  "Build export functionality",
  "Implement audit logging",
  "Create admin user management",
  "Add two-factor authentication",
  "Build webhook integrations",
];

// Default scheduling rules (all disabled by default)
const seedSchedulingRules = [
  // Holiday rules
  {
    type: "holiday",
    name: "Skip Weekends",
    config: { weekdays: [0, 6] }, // Sunday=0, Saturday=6
    enabled: false,
  },
  {
    type: "holiday",
    name: "US Federal Holidays 2025",
    config: {
      dates: [
        "2025-01-01", // New Year's Day
        "2025-01-20", // MLK Day
        "2025-02-17", // Presidents' Day
        "2025-05-26", // Memorial Day
        "2025-06-19", // Juneteenth
        "2025-07-04", // Independence Day
        "2025-09-01", // Labor Day
        "2025-10-13", // Columbus Day
        "2025-11-11", // Veterans Day
        "2025-11-27", // Thanksgiving
        "2025-12-25", // Christmas
      ],
    },
    enabled: false,
  },
  {
    type: "holiday",
    name: "Christmas (Recurring)",
    config: { month: 12, day: 25, recurring: true },
    enabled: false,
  },
  {
    type: "holiday",
    name: "New Year's Day (Recurring)",
    config: { month: 1, day: 1, recurring: true },
    enabled: false,
  },
  // Slack rules
  {
    type: "slack",
    name: "1-Day Buffer",
    config: { days: 1 },
    enabled: false,
  },
  {
    type: "slack",
    name: "2-Day Buffer",
    config: { days: 2 },
    enabled: false,
  },
  {
    type: "slack",
    name: "1-Week Buffer",
    config: { days: 5 },
    enabled: false,
  },
  // Constraint rules (examples)
  {
    type: "constraint",
    name: "Fixed Deadlines",
    config: { constraintType: "fixed_end", featureIds: [] },
    enabled: false,
  },
  // Blackout rules
  {
    type: "blackout",
    name: "Year-End Freeze",
    config: { startDate: "2025-12-20", endDate: "2026-01-05" },
    enabled: false,
  },
  // Duration rules
  {
    type: "duration",
    name: "Minimum 1 Day",
    config: { minDays: 1 },
    enabled: false,
  },
  {
    type: "duration",
    name: "Maximum 30 Days",
    config: { maxDays: 30 },
    enabled: false,
  },
  // Alignment rules
  {
    type: "alignment",
    name: "Start on Mondays",
    config: { startDay: 1 }, // 1 = Monday
    enabled: false,
  },
  // Capacity rules
  {
    type: "capacity",
    name: "Max 3 per Owner",
    config: { maxConcurrent: 3, groupBy: "owner" },
    enabled: false,
  },
];

// Date helpers
function randomDateInRange(startOffset: number, endOffset: number): Date {
  const now = new Date();
  const start = new Date(now.getTime() + startOffset * 24 * 60 * 60 * 1000);
  const end = new Date(now.getTime() + endOffset * 24 * 60 * 60 * 1000);
  return new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime())
  );
}

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function seed() {
  console.log("Seeding database...");

  // Clear existing data (in reverse order of dependencies)
  console.log("Clearing existing data...");
  await db.delete(dependencies);
  await db.delete(features);
  await db.delete(markers);
  await db.delete(schedulingRules);
  await db.delete(statuses);
  await db.delete(users);
  await db.delete(groups);
  await db.delete(products);
  await db.delete(initiatives);
  await db.delete(releases);

  // Insert statuses
  const insertedStatuses = await db
    .insert(statuses)
    .values(seedStatuses)
    .returning();
  console.log(`Inserted ${insertedStatuses.length} statuses`);

  // Insert users
  const insertedUsers = await db.insert(users).values(seedUsers).returning();
  console.log(`Inserted ${insertedUsers.length} users`);

  // Insert groups
  const insertedGroups = await db.insert(groups).values(seedGroups).returning();
  console.log(`Inserted ${insertedGroups.length} groups`);

  // Insert products
  const insertedProducts = await db
    .insert(products)
    .values(seedProducts)
    .returning();
  console.log(`Inserted ${insertedProducts.length} products`);

  // Insert initiatives
  const insertedInitiatives = await db
    .insert(initiatives)
    .values(seedInitiatives)
    .returning();
  console.log(`Inserted ${insertedInitiatives.length} initiatives`);

  // Insert releases
  const insertedReleases = await db
    .insert(releases)
    .values(seedReleases)
    .returning();
  console.log(`Inserted ${insertedReleases.length} releases`);

  // Insert markers with dates
  const markersWithDates = seedMarkerLabels.map((label, index) => ({
    label,
    className: markerClassNames[index],
    date: randomDateInRange(-180, 180),
  }));
  const insertedMarkers = await db
    .insert(markers)
    .values(markersWithDates)
    .returning();
  console.log(`Inserted ${insertedMarkers.length} markers`);

  // Insert features
  const featureValues = featureNames.map((name) => {
    const startAt = randomDateInRange(-180, 90);
    const duration = Math.floor(Math.random() * 60) + 14; // 14-74 days
    const endAt = new Date(startAt.getTime() + duration * 24 * 60 * 60 * 1000);

    return {
      name,
      startAt,
      endAt,
      statusId: randomElement(insertedStatuses).id,
      ownerId: randomElement(insertedUsers).id,
      groupId: randomElement(insertedGroups).id,
      productId: randomElement(insertedProducts).id,
      initiativeId: randomElement(insertedInitiatives).id,
      releaseId: randomElement(insertedReleases).id,
    };
  });
  const insertedFeatures = await db
    .insert(features)
    .values(featureValues)
    .returning();
  console.log(`Inserted ${insertedFeatures.length} features`);

  // Insert dependencies (matching the pattern from roadmap/page.tsx)
  const dependencyColors = {
    blue: "#3b82f6",
    green: "#22c55e",
    purple: "#a855f7",
    orange: "#f97316",
    pink: "#ec4899",
    teal: "#14b8a6",
  };

  const dependencyValues = [
    // Chain 1: Features 0 -> 1 -> 2 (FS chain)
    {
      sourceId: insertedFeatures[0].id,
      targetId: insertedFeatures[1].id,
      type: "FS" as const,
    },
    {
      sourceId: insertedFeatures[1].id,
      targetId: insertedFeatures[2].id,
      type: "FS" as const,
    },
    // Chain 2: Features 3 -> 4 -> 5 (FS with blue color)
    {
      sourceId: insertedFeatures[3].id,
      targetId: insertedFeatures[4].id,
      type: "FS" as const,
      color: dependencyColors.blue,
    },
    {
      sourceId: insertedFeatures[4].id,
      targetId: insertedFeatures[5].id,
      type: "FS" as const,
      color: dependencyColors.blue,
    },
    // Start-to-Start: Features 6 and 7
    {
      sourceId: insertedFeatures[6].id,
      targetId: insertedFeatures[7].id,
      type: "SS" as const,
      color: dependencyColors.green,
    },
    // Finish-to-Finish: Features 8 and 9
    {
      sourceId: insertedFeatures[8].id,
      targetId: insertedFeatures[9].id,
      type: "FF" as const,
      color: dependencyColors.purple,
    },
    // Chain 3: Features 10 -> 11 -> 12 -> 13
    {
      sourceId: insertedFeatures[10].id,
      targetId: insertedFeatures[11].id,
      type: "FS" as const,
      color: dependencyColors.orange,
    },
    {
      sourceId: insertedFeatures[11].id,
      targetId: insertedFeatures[12].id,
      type: "FS" as const,
      color: dependencyColors.orange,
    },
    {
      sourceId: insertedFeatures[12].id,
      targetId: insertedFeatures[13].id,
      type: "FS" as const,
      color: dependencyColors.orange,
    },
    // Start-to-Finish: Features 14 and 15
    {
      sourceId: insertedFeatures[14].id,
      targetId: insertedFeatures[15].id,
      type: "SF" as const,
      color: dependencyColors.pink,
    },
    // Chain 4: Features 16 -> 17 -> 18 -> 19 (mixed types)
    {
      sourceId: insertedFeatures[16].id,
      targetId: insertedFeatures[17].id,
      type: "FS" as const,
      color: dependencyColors.teal,
    },
    {
      sourceId: insertedFeatures[17].id,
      targetId: insertedFeatures[18].id,
      type: "SS" as const,
      color: dependencyColors.teal,
    },
    {
      sourceId: insertedFeatures[18].id,
      targetId: insertedFeatures[19].id,
      type: "FF" as const,
      color: dependencyColors.teal,
    },
  ];

  const insertedDependencies = await db
    .insert(dependencies)
    .values(dependencyValues)
    .returning();
  console.log(`Inserted ${insertedDependencies.length} dependencies`);

  // Insert scheduling rules
  const insertedSchedulingRules = await db
    .insert(schedulingRules)
    .values(seedSchedulingRules)
    .returning();
  console.log(`Inserted ${insertedSchedulingRules.length} scheduling rules`);

  console.log("Seeding complete!");
}

seed()
  .catch((error) => {
    console.error("Seeding failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await client.end();
    process.exit(0);
  });
