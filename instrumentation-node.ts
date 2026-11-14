import { purgeInactive } from "./lib/household";
import { checkMasterKey } from "./lib/crypto";

// A missing or malformed MASTER_KEY would otherwise only show up as failing requests.
try {
  checkMasterKey();
} catch (err) {
  console.error("FATAL: MASTER_KEY is missing or invalid. Household data cannot be read or written.", err);
}

// Delete households inactive for 30 days: now and then every hour.
function run() {
  try {
    purgeInactive();
  } catch (err) {
    console.error("purgeInactive failed", err);
  }
}

run();
setInterval(run, 60 * 60 * 1000).unref();
