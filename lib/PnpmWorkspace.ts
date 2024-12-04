import chalk from "chalk";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { Dir } from "./Dir.js";
import { Package } from "./Package.js";

export class PnpmWorkspace extends Dir {
  static async create(workspaceDir: string) {
    const ret = new PnpmWorkspace(workspaceDir);
    await ret.#init();

    return ret;
  }

  constructor(workspaceDir: string) {
    super(workspaceDir);
  }

  #init = async () => {
    await fs.mkdir(this.path);
    await fs.writeFile(
      path.join(this.path, "package.json"),
      JSON.stringify({
        name: "root",
        private: true,
        dependencies: {},
      }),
    );
    await fs.writeFile(
      path.join(this.path, "pnpm-workspace.yaml"),
      `packages:
  - packages/*`,
    );

    await fs.mkdir(path.join(this.path, "packages"));
    await fs.writeFile(
      path.join(this.path, ".npmrc"),
      `registry=http://localhost:4873/
  //localhost:4873/:_authToken="ZmQ3NmRjYTk5ZDY2MjUwZWQ3YjE5OTM0YzY3MTdjYjk6MGM4MGFjMDgxZDU2MjM="
  `,
      "utf-8",
    );

    await this.exec(
      `pnpm config set store-dir "${path.join(this.path, ".pnpm-store")}"`,
    );

    await this.exec(
      `pnpm config set cache-dir "${path.join(this.path, ".pnpm-cache")}"`,
    );

    await this.pnpmInstall();
  };

  pnpmInstall = async () => {
    await this.execAndPrint("pnpm install");
    // console.log();
    // console.log(chalk.bold("pnpm install"));
    // const { stdout, stderr } = await this.exec("pnpm install");

    // if (stdout && stdout.length > 0) {
    //   console.log("> " + stdout.replace(/\n/g, "\n> "));
    // }
    // if (stderr && stderr.length > 0) {
    //   console.error(chalk.red(stderr));
    // }
  };

  makePackage = async (name: string, version: string) => {
    return Package.create(
      path.join(this.path, "packages", name),
      name,
      version,
    );
  };

  publish = async () => {
    try {
      console.log();
      console.log(chalk.bold("Publishing..."));

      const out = await this.exec("pnpm publish -r");

      console.log(out.stdout);
    } catch (e) {
      console.error("Failed to publish");
      console.error(e);
      throw e;
    }
  };
}
