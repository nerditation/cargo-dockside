(function () {
  const vscode = acquireVsCodeApi();
  const commandCategoriesDiv = document.getElementById("commandCategories");

  const recent_commands_section = document.createElement("div");
  recent_commands_section.className = "category-section";
  recent_commands_section.id = `RecentCommandsSection`; // ID for "recent" section

  const recent_commands_header = document.createElement("h3");
  recent_commands_header.textContent = "Recent Commands";
  recent_commands_section.appendChild(recent_commands_header);

  commandCategoriesDiv.appendChild(recent_commands_section);

  function addToRecent(clicked) {
    // if already in recent list, remove it first
    for (let child = recent_commands_section.firstElementChild; child; child = child.nextElementSibling) {
      if (child.getAttribute("data-command") === clicked.getAttribute("data-command")) {
        recent_commands_section.removeChild(child);
        break;
      }
    }
    // if already have 5 commands in the recent list, pop the last one
    // childElementCount include the h3 header
    if (recent_commands_section.childElementCount === 1 + 5) {
      recent_commands_section.removeChild(recent_commands_section.lastElementChild);
    }
    // insert the button after the h3 header element, but there's no insertAfter()
    recent_commands_section.insertBefore(clicked, recent_commands_header.nextElementSibling);
  }

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

      button.onclick = () => {
        console.log(`Button clicked: ${command.id}`); // Debug log
        const cloned = button.cloneNode(true);
        cloned.onclick = button.onclick;
        addToRecent(cloned);
        vscode.postMessage({ command: command.id });
      };

      section.appendChild(button);
    });

    commandCategoriesDiv.appendChild(section);
  }
})();
