import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";

const validPlaceholderKind = {
  'new-dir': 'new-dir'
} as const;

type PlaceholderKind = keyof typeof validPlaceholderKind | undefined;

interface PlaceholderSpec {
  kind: PlaceholderKind,
  name: string,
  description: string,
}

interface Command {
  id: string;
  title: string;
  /**
   * to be able to bypass the shell and run `cargo` directly, the command line
   * needs to be split into individual arguments. if this field is a `string`,
   * it will be splitted by space.
   */
  cargoCommand: string | string[];
  description: string;
  placeholders?: PlaceholderSpec[] | { [key: string]: string }; // New field for placeholders
  /**
   * this command does not need a workspace to be opened, i.e. it does not
   * depend on the current working directory. examples include:
   * - cargo login
   * - cargo new (with absolute path)
   */
  noWorkspaceNeeded?: boolean,
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
    .forEach(({ id, cargoCommand, description, placeholders, noWorkspaceNeeded }: Command) => {
      if (placeholders && !Array.isArray(placeholders)) {
        placeholders = parse_placeholders(placeholders);
      }
      context.subscriptions.push(
        vscode.commands.registerCommand(id, async () => {
          if (placeholders) {
            const dictionary: Record<string, string> = {};
            for (const spec of placeholders) {
              const resolved = await resolve_placeholder(spec);
              if (!resolved) {
                vscode.window.showInformationMessage("canceled");
                return;
              }
              dictionary[spec.name] = resolved;
              if (typeof cargoCommand == 'string') {
                cargoCommand = cargoCommand.replaceAll(/<(.+)>/g, (_, name) => dictionary[name]);
              } else {
                cargoCommand = cargoCommand.map(s => s.replaceAll(/<(.+)>/g, (_, name) => dictionary[name]));
              }
            }
          }
          if (typeof cargoCommand == 'string') {
            await runRustCommand(cargoCommand.split(' '), noWorkspaceNeeded);
          } else {
            await runRustCommand(cargoCommand, noWorkspaceNeeded);
          }
        })
      );
    });
}

async function runRustCommand(args: string[], noWorkspaceNeeded?: boolean) {
  const workspaceFolder = vscode.workspace.workspaceFolders?.at(0);
  // NOTE to reader
  // the doc of `vscode.Task` says the `scope` argument of `vscode.TaskScope.Global`
  // is not supported, but from my experiments, this argument has not effect,
  // the task will run the same no matter what `scope` is. what does matter is,
  // however, if no workspace is open, you must specify the `cwd` option of
  // the execution (either ProcessExecution or ShellExecution), otherwise, vscode
  // will try to resolve the `${workspaceFoler}` variable and error out.
  let cwd;
  if (!workspaceFolder) {
    // CAUTION: intentional double negative, read slowly and carefully
    if (!noWorkspaceNeeded && "Continue" != await vscode.window.showWarningMessage("No workspace folder found, continue?", "Continue")) {
      return;
    }
    cwd = process.cwd();
  }
  const cargoCmdPrefix = vscode.workspace
    .getConfiguration("rust-toolbar")
    .get("cargoCmdPrefix", "cargo");
  let exe;
  if (vscode.workspace.getConfiguration("rust-toolbar").get("useShell", true)) {
    exe = new vscode.ShellExecution(`${cargoCmdPrefix} ${args.map(s => `"${s}"`).join(' ')}`, { cwd })
  } else {
    // TODO: proper command line parsing, including quotations, escapes, etc
    const argv = [...`${cargoCmdPrefix}`.split(' '), ...args];
    const argv0 = argv.shift()!;
    exe = new vscode.ProcessExecution(argv0, argv, { cwd })
  }
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

function parse_kind(input: string): PlaceholderKind {
  return validPlaceholderKind[input as keyof typeof validPlaceholderKind]
}

function parse_spec(key: string, description: string): PlaceholderSpec {
  const match = key.match(/<([-_a-zA-Z]+)(:([-_a-zA-Z]+))?>/);
  if (match) {
    const [_0, name, _1, kind] = match;
    return {
      name,
      kind: parse_kind(kind),
      description,
    }
  } else {
    throw `invalid placeholder '${key}'`
  }

}

function parse_placeholders(placeholders: { [key: string]: string }) {
  return Object.entries(placeholders).map(([key, value]) => parse_spec(key, value))
}

async function resolve_placeholder(placeholder: PlaceholderSpec) {
  const { kind, name, description } = placeholder;
  switch (kind) {
    case 'new-dir': {
      const cwd = vscode.workspace.workspaceFolders?.at(0)?.uri.fsPath ?? process.cwd();
      let input = await vscode.window.showInputBox({
        title: `placeholder <${name}> : new directory will be created`,
        prompt: `for relative path, cwd is: '${cwd}'`,
        placeHolder: description,
      });
      if (input) {
        if (!path.isAbsolute(input)) {
          input = path.join(cwd, input);
        }
        input = path.normalize(input);
      }
      return input;
    }
    default: {
      console.log(`todo: untyped placeholder: ${name}`);
      return await vscode.window.showInputBox({
        title: name,
        placeHolder: description,
      });
    }
  }
}
