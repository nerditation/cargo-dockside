const { writeFileSync } = require("fs");
const { join } = require("path");

// Load commands.json
const commandsByCategory = require("./media/commands.json");

// Load package.json
const packageJsonPath = join(__dirname, "package.json");
const packageJson = require(packageJsonPath);

// Create an array to hold all commands
let allCommands = packageJson.contributes.commands;
let definedCommands = Object.fromEntries(allCommands.map(c=>[c.command, true]));

// Iterate over each category in commands.json
for (const category in commandsByCategory) {
  if (Array.isArray(commandsByCategory[category])) {
    for (const command of commandsByCategory[category]) {
      if (!definedCommands[command.id]) {
        allCommands.push({
          command: command.id,
          title: `Cargo Dockside: ${command.title}`,
        })
      }
    }
  }
}

// Update the contributes.commands section in package.json
packageJson.contributes.commands = allCommands;

// Write the updated package.json back to disk
writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

console.log("package.json updated successfully!");
