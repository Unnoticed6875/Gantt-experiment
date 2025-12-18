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
