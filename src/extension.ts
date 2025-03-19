import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";

interface Command {
  id: string;
  title: string;
  cargoCommand: string;
  description: string;
  placeholders?: { [key: string]: string }; // New field for placeholders
}

interface CommandCategory {
  [key: string]: Command[];
}

export function activate(context: vscode.ExtensionContext) {
  console.log("Rust Toolbar extension is now active!");

  const rustToolbarProvider = new RustToolbarProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      RustToolbarProvider.viewType,
      rustToolbarProvider
    )
  );

  // Load commands from commands.json
  const commandsPath = path.join(
    context.extensionPath,
    "media",
    "commands.json"
  );
  const categories: CommandCategory = JSON.parse(
    fs.readFileSync(commandsPath, "utf-8")
  );

  // Register commands dynamically
  Object.values(categories)
    .flat()
    .forEach(({ id, cargoCommand, description, placeholders }: Command) => {
      context.subscriptions.push(
        vscode.commands.registerCommand(id, async () => {
          // Check if command requires arguments
          const placeholdersArray = Object.keys(placeholders || {});
          if (placeholdersArray.length > 0) {
            const inputPrompts = placeholdersArray.map((placeholder) => ({
              prompt: `Enter value for ${placeholder.replace(/[<>]/g, "")} (${
                placeholders?.[placeholder]
              }):`,
              placeHolder: placeholder.replace(/[<>]/g, ""),
            }));

            const inputValues = await Promise.all(
              inputPrompts.map(async (prompt) => {
                return await vscode.window.showInputBox(prompt);
              })
            );

            // Ensure all inputs are valid
            if (inputValues.some((value) => value === undefined)) {
              vscode.window.showErrorMessage("Command input was canceled.");
              return;
            }

            let commandWithArgs = cargoCommand;
            placeholdersArray.forEach((placeholder, index) => {
              commandWithArgs = commandWithArgs.replace(
                placeholder,
                inputValues[index] || ""
              );
            });

            await runRustCommand(commandWithArgs);
          } else {
            await runRustCommand(cargoCommand);
          }
        })
      );
    });
}

async function runRustCommand(command: string) {
  const workspaceFolder = vscode.workspace.workspaceFolders?.at(0);
  let cwd;
  if (!workspaceFolder) {
    if ("Continue" != await vscode.window.showWarningMessage("No workspace folder found, continue?", "Continue")) {
      return;
    }
    cwd = process.cwd();
  }
  const cargoCmdPrefix = vscode.workspace
    .getConfiguration("rust-toolbar")
    .get("cargoCmdPrefix", "cargo");
  const exe = new vscode.ShellExecution(`${cargoCmdPrefix} ${command}`, { cwd })
  const task = new vscode.Task(
    {
      type: "cargo-dockside",
      nonce: `cargo-dockside-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
    },
    vscode.TaskScope.Workspace,
    "Cargo",
    "Cargo Dockside",
    exe,
  );
  task.presentationOptions.focus = false;
  task.presentationOptions.clear = false;
  task.presentationOptions.echo = true;
  await vscode.tasks.executeTask(task);
}

class RustToolbarProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "rust-toolbar.toolbarView";

  constructor(private readonly _extensionUri: vscode.Uri) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    // Load commands from commands.json
    const commandsPath = path.join(
      this._extensionUri.fsPath,
      "media",
      "commands.json"
    );
    const categories: CommandCategory = JSON.parse(
      fs.readFileSync(commandsPath, "utf-8")
    );

    webviewView.webview.html = this._getHtmlForWebview(
      webviewView.webview,
      categories
    );

    webviewView.webview.onDidReceiveMessage((message) => {
      console.log(`Received message: ${message.command}`); // Debug log
      vscode.commands.executeCommand(message.command);
    });
  }

  private _getHtmlForWebview(
    webview: vscode.Webview,
    categories: CommandCategory
  ) {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "media", "main.js")
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "media", "style.css")
    );

    const serializedCategories = JSON.stringify(categories);

    return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <link href="${styleUri}" rel="stylesheet">
                <title>Rust Toolbar</title>
            </head>
            <body>
                <div id="commandCategories"></div>
                <script>
                    const categories = ${serializedCategories};
                </script>
                <script src="${scriptUri}"></script>
            </body>
            </html>`;
  }
}
