const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const https = require("https");

const RESTART_DELAY = 2000;

const platformMap = {
  linux: "tct-linux",
  win32: "tct-windows.exe",
  darwin: "tct-macos"
};

const binaryName = platformMap[process.platform] || "tct-linux";
const programPath = path.join(__dirname, binaryName);

const DOWNLOAD_URL =
  `https://github.com/i-tct/tct/releases/latest/download/${binaryName}`;

function downloadBinary() {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(programPath)) {
      return resolve();
    }

    console.log("Binary not found. Downloading...");

    const file = fs.createWriteStream(programPath);

    https.get(DOWNLOAD_URL, (res) => {
      if (res.statusCode !== 200) {
        return reject(new Error(`Download failed: ${res.statusCode}`));
      }

      res.pipe(file);

      file.on("finish", () => {
        file.close(() => {
          fs.chmodSync(programPath, 0o755);
          console.log("Download complete.");
          resolve();
        });
      });
    }).on("error", reject);
  });
}

let child = null;

function start() {
  console.log("Starting TCT...");

  child = spawn(programPath, [], {
    stdio: "inherit"
  });

  child.on("close", (code) => {
    console.log(`Process exited with code ${code}`);
    restart();
  });

  child.on("error", (err) => {
    console.error("Failed to start:", err);
    restart();
  });
}

function restart() {
  console.log(`Restarting in ${RESTART_DELAY / 1000}s...\n`);
  setTimeout(start, RESTART_DELAY);
}

async function main() {
  try {
    await downloadBinary();
    start();
  } catch (err) {
    console.error("Startup failed:", err);
    process.exit(1);
  }
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

function shutdown() {
  console.log("\nShutting down...");

  if (child) {
    child.kill("SIGTERM");
  }

  process.exit(0);
}

main();
