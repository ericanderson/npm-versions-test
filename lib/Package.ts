import chalk from "chalk";
import { diff } from "jest-diff";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { Dir } from "./Dir.js";

export class Package extends Dir {
  static async create(packageDir: string, name: string, version: string) {
    await fs.mkdir(packageDir);
    await fs.writeFile(
      path.join(packageDir, "package.json"),
      JSON.stringify({
        name,
        version,
        dependencies: {},
        peerDependencies: {},
        devDependencies: {},
      }),
      "utf-8",
    );

    return new Package(name, packageDir);
  }

  name: string;
  packageJsonPath: string;

  private constructor(name: string, packageDir: string) {
    super(packageDir);
    this.name = name;
    this.packageJsonPath = path.join(this.path, "package.json");
  }

  setPackageVersion = async (version: string) => {
    await this.editPackageJson((packageJson) => {
      packageJson.version = version;
    });
  };

  editPackageJson = async (
    callback: (packageJson: any) => void,
  ) => {
    console.log();
    console.log(
      chalk.bold(`Editing package.json for ${chalk.cyan(this.name)}`),
    );
    const packageJson = await this.readPackageJson();
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
        contextLines: 1,
        omitAnnotationLines: true,
      }),
    );
    await this.writePackageJson(packageJson);
  };

  writePackageJson = async (packageJson: any) => {
    await fs.writeFile(
      this.packageJsonPath,
      JSON.stringify(packageJson, null, 2),
    );
  };

  readPackageJson = async (): Promise<
    { name: string; version: string } & Record<string, unknown>
  > => {
    const packageJson = JSON.parse(
      await fs.readFile(this.packageJsonPath, "utf-8"),
    );
    return packageJson;
  };
}
