import { MongoClient } from "mongodb";

let client;
let db;

export async function connect(uri, dbName) {
  client = new MongoClient(uri, { serverSelectionTimeoutMS: 8_000 });
  await client.connect();
  // Database name: explicit DB_NAME, else the one in the URI, else a default.
  db = client.db(dbName || undefined);
  if (db.databaseName === "test") db = client.db("thyrocare_up166");

  await Promise.all([
    db.collection("items").createIndex({ type: 1, order: 1 }),
    db.collection("items").createIndex({ code: 1 }),
    db.collection("team").createIndex({ order: 1 }),
    db.collection("faqs").createIndex({ order: 1 }),
    db.collection("leads").createIndex({ createdAt: -1 }),
    db.collection("leads").createIndex({ ref: 1 }, { unique: true }),
    db.collection("admins").createIndex({ username: 1 }, { unique: true }),
  ]);
  return db;
}

// Plain-English hint for the most common connection problems.
export function explainDbError(e) {
  const m = String(e?.message || e);
  if (/alert number 80|not authorized|whitelist|IP address/i.test(m))
    return "MongoDB Atlas refused this computer. Add its IP address in Atlas → Network Access (or allow 0.0.0.0/0 for hosting).";
  if (/bad auth|Authentication failed/i.test(m)) return "MongoDB username or password in MONGODB_URI is wrong.";
  if (/ENOTFOUND|querySrv|getaddrinfo/i.test(m)) return "Cannot find the MongoDB server. Check the internet connection and the MONGODB_URI address.";
  return "Cannot reach the database: " + m.split("\n")[0];
}

export const getDb = () => db;
export const col = (name) => db.collection(name);
export const closeDb = () => client?.close();

// Sequential, human-friendly references for leads: B-1001 (booking), P-1002 (prescription)…
export async function nextSeq(name) {
  const r = await col("counters").findOneAndUpdate({ _id: name }, { $inc: { seq: 1 } }, { upsert: true, returnDocument: "after" });
  return 1000 + r.seq;
}
