import chalk from "chalk";
import { exec } from "node:child_process";
import { promisify } from "node:util";

export const execAsync = promisify(exec);

export class Dir {
  public readonly path: string;

  constructor(dir: string) {
    this.path = dir;
  }

  public exec = async (command: string) => {
    return await execAsync(command, { cwd: this.path });
  };

  public execAndPrint = async (command: string) => {
    console.log();
    console.log(chalk.bold(`Running ${chalk.blue(command)}`));
    console.log(chalk.gray(`cwd: ${this.path}`));
    const { stdout, stderr } = await this.exec(command);

    if (stdout && stdout.length > 0) {
      console.log(chalk.bold("> ") + stdout.replace(/\n/g, chalk.bold("\n> ")));
    }
    if (stderr && stderr.length > 0) {
      console.error(chalk.red(stderr));
    }
  };
}
