(function () {
  const vscode = acquireVsCodeApi();

  // Use the categories variable passed from the extension
  const commandCategoriesDiv = document.getElementById("commandCategories");

  for (const [category, commands] of Object.entries(categories)) {
    const section = document.createElement("div");
    section.className = "command-section";

    const header = document.createElement("h2");
    header.textContent = category;
    section.appendChild(header);

    commands.forEach((command) => {
      const button = document.createElement("button");
      button.className = "toolbar-button";
      button.textContent = command.title;
      button.setAttribute("data-command", command.id);
      button.setAttribute("title", `Execute: ${command.description}`); // Tooltip

      button.addEventListener("click", () => {
        console.log(`Button clicked: ${command.id}`); // Debug log
        vscode.postMessage({ command: command.id });
      });

      section.appendChild(button);
    });

    commandCategoriesDiv.appendChild(section);
  }
})();
