const { writeFileSync } = require("fs");
const { join } = require("path");

// Load commands.json
const commandsByCategory = require("./media/commands.json");

// Load package.json
const packageJsonPath = join(__dirname, "package.json");
const packageJson = require(packageJsonPath);

// Create an array to hold all commands
let allCommands = [];

// Iterate over each category in commands.json
for (const category in commandsByCategory) {
  if (Array.isArray(commandsByCategory[category])) {
    allCommands = allCommands.concat(
      commandsByCategory[category].map((command) => ({
        command: command.id,
        title: command.title,
      }))
    );
  }
}

// Update the contributes.commands section in package.json
packageJson.contributes.commands = allCommands;

// Write the updated package.json back to disk
writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

console.log("package.json updated successfully!");
