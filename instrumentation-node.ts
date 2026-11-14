import { purgeInactive } from "./lib/household";

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
