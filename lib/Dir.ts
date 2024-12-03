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
}
