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
        vscode.postMessage({ command: command.id });
      };

      section.appendChild(button);
    });

    commandCategoriesDiv.appendChild(section);
  }

  // sending deltas is not worth the complexity, just re-populate the buttons
  window.addEventListener("message", (m) => {
    const message = m.data;
    // load persisted collapsed states
    if (message.collapsed) {
      for (const section_id in message.collapsed) {
        if (message.collapsed[section_id]) {
          document.querySelector(`#${section_id}`).classList.add('collapsed');
        }
      }
      return;
    }
    // load persisted command history
    const saved_command_executions = message.history;
    const buttons = saved_command_executions.map((execution) => {
      const button = document.createElement("button");
      button.className = "toolbar-button";
      button.textContent = execution.title;
      button.setAttribute("data-command", execution.command_id);
      button.setAttribute("title", `Execute: ${execution.resolved_args.join(' ')}`); // Tooltip

      button.onclick = () => {
        console.log(`Button clicked: ${execution.id}`); // Debug log
        vscode.postMessage({ command: execution.command_id, args: execution.resolved_args });
      };
      return button;
    });
    recent_commands_section.replaceChildren(recent_commands_header, ...buttons);
  });

  document.querySelectorAll('.category-section h3').forEach((header) => {
    header.onclick = function () {
      const section = this.parentElement;
      vscode.postMessage({
        toggle: section.id,
      });
      section.classList.toggle("collapsed");
    }
  })
})();
