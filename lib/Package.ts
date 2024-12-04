import chalk from "chalk";
import { diff } from "jest-diff";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { Dir } from "./Dir.js";

export class Package extends Dir {
  static async create(packageDir: string, name: string, version: string) {
    await fs.mkdir(packageDir, { recursive: true });
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

  constructor(name: string, packageDir: string) {
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

export class SoloNpmPackage extends Package {
  static async create(
    packageDir: string,
    name: string,
    version: string,
  ) {
    await fs.mkdir(packageDir, { recursive: true });
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

    await fs.writeFile(
      path.join(packageDir, ".npmrc"),
      `registry=http://localhost:4873/
  //localhost:4873/:_authToken="ZmQ3NmRjYTk5ZDY2MjUwZWQ3YjE5OTM0YzY3MTdjYjk6MGM4MGFjMDgxZDU2MjM="
  `,
      "utf-8",
    );

    return new SoloNpmPackage(name, packageDir);
  }

  private constructor(name: string, packageDir: string) {
    super(name, packageDir);
  }
}
