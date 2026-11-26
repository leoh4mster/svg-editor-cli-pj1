import { EditorSession } from "./application/EditorSession.js";
import { Cli } from "./cli/Cli.js";
import { CommandLineParser } from "./cli/CommandLineParser.js";
import { EditorHost } from "./host/EditorHost.js";

const host = new EditorHost(line => process.stderr.write(`${line}\n`));
const args = process.argv.slice(2);
const builtinsOnly = args.length === 1 && args[0] === "--no-plugins";
if (args.length && !builtinsOnly && !(args.length === 2 && args[0] === "--config")) {
  process.stderr.write("error: usage: svg-editor [--no-plugins | --config <file>]\n");
  process.exitCode = 1;
} else {
  const code = args.length ? [] : (await import("./host/codePlugins.js")).codePlugins;
  await host.start(code, args[1]);
  const cli = new Cli(host.commands, new CommandLineParser(), new EditorSession(),
    process.stdin, process.stdout, process.stderr, process.stdin.isTTY === true && process.stdout.isTTY === true);
  await cli.run();
}
