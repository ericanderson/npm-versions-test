import * as fs from "node:fs/promises";
import * as path from "path";
import { runServer } from "verdaccio";

export const VERDACCIO_PORT = 4873;

export async function startVerdaccio(workingDir: string) {
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
    verdaccio.listen(VERDACCIO_PORT, () => {
      resolve(verdaccio);
    });
  });
}
