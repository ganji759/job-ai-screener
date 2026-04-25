import mongoose from "mongoose";

const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/job_ai_screener";

await mongoose.connect(uri);
const db = mongoose.connection.db;

const total = await db.collection("applicants").countDocuments({});
const jobs = await db.collection("jobs").countDocuments({});
const screenings = await db.collection("screenings").countDocuments({});

const byStatus = await db.collection("applicants").aggregate([
  { $group: { _id: "$status", n: { $sum: 1 } } },
]).toArray();

const bySource = await db.collection("applicants").aggregate([
  { $group: { _id: "$source", n: { $sum: 1 } } },
]).toArray();

const byJob = await db.collection("applicants").aggregate([
  { $group: { _id: "$jobId", n: { $sum: 1 } } },
  { $sort: { n: -1 } },
  { $limit: 10 },
]).toArray();

const latest = await db.collection("applicants")
  .find({}, { projection: { "profile.firstName": 1, "profile.lastName": 1, "profile.title": 1, status: 1, source: 1, createdAt: 1, originalFileName: 1 } })
  .sort({ createdAt: -1 })
  .limit(5)
  .toArray();

console.log("DB               :", db.databaseName);
console.log("Total applicants :", total);
console.log("Total jobs       :", jobs);
console.log("Total screenings :", screenings);
console.log("By status        :", byStatus);
console.log("By source        :", bySource);
console.log("By job (top 10)  :", byJob);
console.log("Latest 5         :");
console.table(latest.map((a) => ({
  name: `${a.profile?.firstName ?? ""} ${a.profile?.lastName ?? ""}`.trim(),
  title: a.profile?.title ?? "",
  status: a.status,
  source: a.source,
  file: a.originalFileName ?? "",
  createdAt: a.createdAt,
})));

await mongoose.disconnect();
