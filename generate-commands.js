import { writeFileSync } from "fs";
import { join } from "path";

import { map } from "./media/commands.json";

const packageJsonPath = join(__dirname, "package.json");
const packageJson = require(packageJsonPath);

packageJson.contributes.commands = map((command) => ({
  command: command.id,
  title: command.title,
}));

writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
