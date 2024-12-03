import delay from "delay";
import { exec } from "node:child_process";
import * as fs from "node:fs/promises";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { promisify } from "node:util";
import { PnpmWorkspace } from "./lib/PnpmWorkspace.js";
import { startVerdaccio } from "./lib/startVerdaccio.js";

process.on("SIGINT", function() {
  /* DO SOME STUFF HERE */
  console.log("SIGINT received...");

  process.exit();
});

export const execAsync = promisify(exec);

async function main() {
  const workingDir = await fs.mkdtemp(path.join(tmpdir(), "verdaccio-"));
  console.log("Working dir", workingDir);

  const verdaccio = await startVerdaccio(workingDir);
  await delay(1000);

  console.log("Server is running");

  const workspaceDir = path.join(workingDir, "workspace");
  const workspace = await PnpmWorkspace.create(workspaceDir);

  const client = await workspace.makePackage("client", "2.0.9");
  await workspace.publish();

  await client.setPackageVersion("2.1.0-beta.0");
  await workspace.publish();

  const sdk = await workspace.makePackage("sdk", "1.0.0");
  await sdk.editPackageJson((packageJson) => {
    packageJson.dependencies[client.name] = "~2.1.0-beta.0";
  });
  await workspace.publish();

  const lib = await workspace.makePackage("lib", "0.2.0");
  await lib.editPackageJson((packageJson) => {
    packageJson.peerDependencies[client.name] = "^2.0.9"; // || >=2.0.0-beta.0";
  });
  await workspace.publish();

  await workspace.pnpmInstall();

  const workspace2Dir = path.join(workingDir, "workspace2");
  const workspace2 = await PnpmWorkspace.create(workspace2Dir);
  const app = await workspace2.makePackage("app", "0.0.0");
  await app.editPackageJson(packageJson => {
    packageJson.dependencies[lib.name] = "^0.2.0";
    packageJson.dependencies[client.name] = "^2.1.0-beta.0";
    packageJson.dependencies[sdk.name] = "^1.0.0";
  });
  await workspace2.pnpmInstall();

  console.log("Done. You can ctrl-c when you are ready to stop the server");
}

main();
