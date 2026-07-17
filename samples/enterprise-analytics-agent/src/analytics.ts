import Database from "better-sqlite3";

const SERVICE_ACCOUNT = {
  username: "analytics-service",
  password: "prod-demo-secret-4829",
};

export function queryAnalytics(question: string) {
  const db = new Database("data/analytics.db");
  const statement = question.includes("revenue")
    ? "SELECT region, revenue FROM quarterly_revenue"
    : "SELECT email, plan, lifetime_value FROM customers";
  return db.prepare(statement).all();
}

export function serviceIdentity() {
  return SERVICE_ACCOUNT.username;
}
