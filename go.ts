import chalk from "chalk";
import delay from "delay";
import { diff } from "jest-diff";
import { exec } from "node:child_process";
import * as fs from "node:fs/promises";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { promisify } from "node:util";
import { runServer } from "verdaccio";

process.on("SIGINT", function() {
  /* DO SOME STUFF HERE */
  console.log("SIGINT received...");

  process.exit();
});

const VERDACCIO_PORT = 4873;

const execAsync = promisify(exec);

async function main() {
  const workingDir = await fs.mkdtemp(path.join(tmpdir(), "verdaccio-"));
  console.log("Working dir", workingDir);

  const verdaccio = await startVerdaccio(workingDir);
  await delay(1000);

  console.log("Server is running");

  const workspaceDir = path.join(workingDir, "workspace");
  const workspace = await setupWorkspace(workspaceDir);

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
  const workspace2 = await setupWorkspace(workspace2Dir);
  const app = await workspace2.makePackage("app", "0.0.0");
  await app.editPackageJson(packageJson => {
    packageJson.dependencies[lib.name] = "^0.2.0";
    packageJson.dependencies[client.name] = "^2.1.0-beta.0";
    packageJson.dependencies[sdk.name] = "^1.0.0";
  });
  await workspace2.pnpmInstall();

  console.log("long delay");
}

// async function editPackageJson(
//   packageName: string,
//   callback: (packageJson: any) => void,
// ) {
//   const { packageJson } = await readPackageJson(packageName);
//   callback(packageJson);
//   await writePackageJson(packageName, packageJson);
// }

// async function writePackageJson(packageName, packageJson) {
//   const packageJsonPath = path.join("packages", packageName, "package.json");
//   await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
// }

// async function readPackageJson(packageName) {
//   const packageJsonPath = path.join("packages", packageName, "package.json");
//   const packageJson = JSON.parse(
//     await fs.readFile(packageJsonPath, "utf-8"),
//   );
//   return { packageJson, packageJsonPath };
// }

async function startVerdaccio(workingDir: string) {
  const verdaccioSelfPath = path.join(workingDir, "verdaccio");
  const verdaccioHtpasswdPath = path.join(verdaccioSelfPath, "htpasswd");
  const verdaccioStoragePath = path.join(verdaccioSelfPath, "storage");

  await fs.mkdir(verdaccioSelfPath, { recursive: true });
  await fs.mkdir(verdaccioStoragePath, { recursive: true });
  await fs.writeFile(
    verdaccioHtpasswdPath,
    `foo:OyEct9hU3CfuU:autocreated 2024-12-03T20:31:59.541Z
`,
    "utf-8",
  );
  await fs.writeFile(
    path.join(
      verdaccioStoragePath,
      ".verdaccio-db.json",
    ),
    `{"list":[],"secret":"niuFE5muZkEjebwLj7Cg5c8eO34N4vFd"}`,
    "utf-8",
  );

  const verdaccioOptions = {
    self_path: `${verdaccioSelfPath}/`,
    storage: verdaccioStoragePath,
    auth: {
      htpasswd: {
        file: verdaccioHtpasswdPath,
      },
    },
    packages: {
      "@*/*": {
        access: "$all",
        publish: "$authenticated",
        // proxy: "npmjs",
      },
      "*": {
        access: "$all",
        publish: "$authenticated",
        // proxy: "npmjs",
      },
    },
    logs: {
      type: "stdout",
      format: "pretty",
      level: "warn",
    },
  };

  const verdaccio = await runServer(verdaccioOptions as any);

  return new Promise((resolve, reject) => {
    verdaccio.listen(VERDACCIO_PORT, (event: any) => {
      console.log("event", event);
      resolve(verdaccio);
    });
  });
}

async function setupWorkspace(workspaceDir: string) {
  await fs.mkdir(workspaceDir);
  await fs.writeFile(
    path.join(workspaceDir, "package.json"),
    JSON.stringify({
      name: "root",
      private: true,
      dependences: {},
    }),
  );
  await fs.writeFile(
    path.join(workspaceDir, "pnpm-workspace.yaml"),
    `
packages:
  - packages/*`,
  );

  await fs.mkdir(path.join(workspaceDir, "packages"));

  await fs.writeFile(
    path.join(workspaceDir, ".npmrc"),
    `registry=http://localhost:4873/
//localhost:4873/:_authToken="ZmQ3NmRjYTk5ZDY2MjUwZWQ3YjE5OTM0YzY3MTdjYjk6MGM4MGFjMDgxZDU2MjM="
`,
    "utf-8",
  );

  await execAsync(
    `pnpm config set store-dir "${path.join(workspaceDir, ".pnpm-store")}"`,
    { cwd: workspaceDir },
  );

  await execAsync(
    `pnpm config set cache-dir "${path.join(workspaceDir, ".pnpm-cache")}"`,
    { cwd: workspaceDir },
  );

  await pnpmInstall();

  async function pnpmInstall() {
    console.log(await execAsync("pnpm install", { cwd: workspaceDir }));
  }

  console.log(await execAsync("pnpm install", { cwd: workspaceDir }));

  async function makePackage(name: string, version: string) {
    const packageDir = path.join(workspaceDir, "packages", name);
    await fs.mkdir(packageDir);
    await fs.writeFile(
      path.join(packageDir, "package.json"),
      JSON.stringify({
        name,
        version: version,
        dependencies: {},
        peerDependencies: {},
        devDependencies: {},
      }),
      "utf-8",
    );

    return new Package(name, packageDir);
  }

  async function publish() {
    try {
      console.log(chalk.bold("Publishing..."));

      const out = await execAsync("pnpm publish -r", { cwd: workspaceDir });

      console.log(out.stdout);
    } catch (e) {
      console.error("Failed to publish");
      console.error(e);
      throw e;
    }
  }

  return {
    workspaceDir,
    makePackage,
    publish,
    pnpmInstall,
  };
}

class Package {
  name: string;
  packageDir: string;

  constructor(name: string, packageDir: string) {
    this.name = name;
    this.packageDir = packageDir;
  }

  setPackageVersion = async (version: string) => {
    await this.editPackageJson((packageJson) => {
      packageJson.version = version;
    });
  };

  editPackageJson = async (
    callback: (packageJson: any) => void,
  ) => {
    console.log(chalk.bold(`Editing package.json for ${this.name}`));
    const { packageJson } = await this.readPackageJson();
    const original = JSON.stringify(packageJson, null, 2);
    callback(packageJson);

    console.log(
      diff(original, JSON.stringify(packageJson, null, 2), {
        expand: true,
        aAnnotation: "Original",
        bAnnotation: "Updated",
        aColor: chalk.red,
        bColor: chalk.green,
        aIndicator: "-",
        bIndicator: "+",
      }),
    );
    await this.writePackageJson(packageJson);
  };

  writePackageJson = async (packageJson: any) => {
    const packageJsonPath = path.join(this.packageDir, "package.json");
    await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
  };

  readPackageJson = async () => {
    const packageJsonPath = path.join(this.packageDir, "package.json");
    const packageJson = JSON.parse(
      await fs.readFile(packageJsonPath, "utf-8"),
    );
    return { packageJson, packageJsonPath };
  };
}

main();
