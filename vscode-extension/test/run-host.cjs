const { runTests } = require("@vscode/test-electron");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

async function main() {
  const extension = path.resolve(__dirname, "..");
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), "pj1-svg-test-"));
  try {
    const sample = path.join(temp, "sample");
    await fs.cp(path.join(extension, "sample"), sample, { recursive: true });
    await runTests({
      vscodeExecutablePath: process.env.VSCODE_EXECUTABLE_PATH || undefined,
      extensionDevelopmentPath: extension,
      extensionTestsPath: path.join(extension, "dist/test/host.js"),
      launchArgs: [sample, "--disable-extensions",
        "--user-data-dir", path.join(temp, "profile"), "--extensions-dir", path.join(temp, "extensions")],
    });
  } finally {
    await fs.rm(temp, { recursive: true, force: true });
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
