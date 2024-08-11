(function () {
  const vscode = acquireVsCodeApi();
  const commandCategoriesDiv = document.getElementById("commandCategories");

  for (const [category, commands] of Object.entries(categories)) {
    const section = document.createElement("div");
    section.className = "category-section";
    section.id = `${category.replace(/\s+/g, "")}Section`; // Create a unique ID for each section

    const header = document.createElement("h3");
    header.textContent = category;
    section.appendChild(header);

    commands.forEach((command) => {
      const button = document.createElement("button");
      button.className = "toolbar-button";
      button.textContent = command.title;
      button.setAttribute("data-command", command.id);
      button.setAttribute("title", `Execute: ${command.description}`); // Tooltip

      // Set button color based on category
      button.classList.add(`${category.replace(/\s+/g, "")}-button`);

      button.addEventListener("click", () => {
        console.log(`Button clicked: ${command.id}`); // Debug log
        vscode.postMessage({ command: command.id });
      });

      section.appendChild(button);
    });

    commandCategoriesDiv.appendChild(section);
  }
})();
