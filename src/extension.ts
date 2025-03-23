import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";

const validPlaceholderKind = {
  'new-dir': 'new-dir',
  os: 'os',
  nonce: 'nonce',
} as const;

// captures:
// - \0 is whole placeholder, e.g. `<PATH:new-dir>`
// - \1 is name, e.g. `PATH`
// - \2 is type attribute with colon, e.g. `:new-dir`
// - \3 is type without colon, e.g. `new-dir`
const PLACEHOLDER_PATTERN = /<([-_A-Za-z0-9]+)(:([-_A-Za-z0-9]+))?>/g;

type PlaceholderKind = keyof typeof validPlaceholderKind | undefined;

interface PlaceholderSpec {
  kind: PlaceholderKind,
  name: string,
  description?: string,
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
  /**
   * specify a command to run if the current command finished successfully
   */
  postCommand?: string | { id: string, prompt?: string, args?: any[] },
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
    .forEach(({ id, cargoCommand, description, placeholders, noWorkspaceNeeded, postCommand }: Command) => {
      if (placeholders && !Array.isArray(placeholders)) {
        placeholders = parse_placeholders(placeholders);
      }
      if (typeof postCommand === 'string') {
        postCommand = {
          id: postCommand
        };
      }
      context.subscriptions.push(
        vscode.commands.registerCommand(id, async () => {
          let args = Array.isArray(cargoCommand) ? [...cargoCommand] : cargoCommand.split(/\s+/);
          const post_args = postCommand?.args ? [...postCommand.args] : [];
          if (placeholders) {
            const dictionary: Record<string, string> = {};
            for (const spec of placeholders) {
              const resolved = await resolve_placeholder(spec);
              if (!resolved) {
                vscode.window.showInformationMessage("canceled");
                return;
              }
              dictionary[spec.name] = resolved;
            }
            args = args.map(s => s.replaceAll(PLACEHOLDER_PATTERN, (_, name) => dictionary[name]));
            post_args.forEach((arg, i) => {
              if (typeof arg === 'string') {
                post_args[i] = arg.replaceAll(PLACEHOLDER_PATTERN, (_, name) => dictionary[name]);
              }
            });
          }
          const exit_code = await runRustCommand(args, noWorkspaceNeeded);
          if (exit_code === 0 && postCommand) {
            // default action is continue, unless explicitly rejected by user
            if ('Rejected' !== await confirm(postCommand.prompt ?? "This command has a post-command, do you want to run it?")) {
              vscode.commands.executeCommand(postCommand.id, ...post_args);
            }
          }
        })
      );
    });

  // I can't parse the path into a `Uri`, but the builtin `vscode.openFoler`
  // requires the first argument to be `Uri`, not a string.
  // this command is not listed in package.json, so the description will be
  // nonsense.
  context.subscriptions.push(vscode.commands.registerCommand('cargo-dockside.--open-folder-wrapper', (path: string, opts?: any) => {
    return vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(path), opts);
  }));
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
    // default action is abort, unless explicitly approved by user
    if (!noWorkspaceNeeded && 'Approved' !== await confirm(`No workspace folder found, cwd is '${process.cwd()}', continue?`)) {
      vscode.window.showInformationMessage("No workspace is opened, command skipped");
      return;
    }
    cwd = process.cwd();
  }
  const cargoCmdPrefix = vscode.workspace
    .getConfiguration("rust-toolbar")
    .get("cargoCmdPrefix", "cargo");
  let exe;
  if (vscode.workspace.getConfiguration("rust-toolbar").get("useShell", true)) {
    exe = new vscode.ShellExecution(`${cargoCmdPrefix} ${args.map(s => `"${s}"`).join(' ')}`, { cwd });
  } else {
    // TODO: proper command line parsing, including quotations, escapes, etc
    const argv = [...`${cargoCmdPrefix}`.split(/\s+/), ...args].map(s => s.trim()).filter(s => s !== '');
    const argv0 = argv.shift()!;
    exe = new vscode.ProcessExecution(argv0, argv, { cwd });
  }
  const task_id = `cargo-dockside-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const task = new vscode.Task(
    {
      type: "cargo-dockside",
      task_id,
    },
    vscode.TaskScope.Workspace,
    "Cargo",
    "Cargo Dockside",
    exe,
  );
  task.presentationOptions.focus = false;
  task.presentationOptions.clear = false;
  task.presentationOptions.echo = true;
  return await new Promise<number | undefined>((resolve, reject) => {
    const disposable = vscode.tasks.onDidEndTaskProcess((e) => {
      if (e.execution.task.definition.task_id === task_id) {
        disposable.dispose();
        resolve(e.exitCode);
      }
    });
    vscode.tasks.executeTask(task);
  });
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
  return validPlaceholderKind[input as keyof typeof validPlaceholderKind];
}

function parse_spec(key: string, description: string): PlaceholderSpec {
  const [match] = key.matchAll(PLACEHOLDER_PATTERN);
  if (match) {
    const [_0, name, _1, kind] = match;
    return {
      name,
      kind: parse_kind(kind),
      description,
    };
  } else {
    // should this happened, it'd be a bug, in rust, I'd use a diverting
    // expression like `panic!()` or `unreachable!()`.
    // I use `throw` here just to satisfy the type checker
    // eslint-disable-next-line no-throw-literal
    throw `invalid placeholder '${key}'`;
  }

}

function parse_placeholders(placeholders: { [key: string]: string }) {
  return Object.entries(placeholders).map(([key, value]) => parse_spec(key, value));
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
    case 'nonce': {
      return `${Date.now()}`;
    }
    case 'os': {
      const f = (os as any)[name];
      try {
        return f();
      } catch (e) {
        console.log(`invalid placeholder '<${name}>': os`);
        return;
      }
    }
    case undefined: {
      console.log(`todo: untyped placeholder: ${name}`);
      return await vscode.window.showInputBox({
        title: name,
        placeHolder: description,
      });
    }
  }
}

type Confirmation = 'Approved' | 'Rejected' | 'Default';

type ConfirmationMode = 'quickpick' | 'notification' | 'silent';

async function confirm(prompt: string, button_label?: string): Promise<Confirmation> {
  switch (vscode.workspace.getConfiguration('rust-toolbar').get('confirmationMode', 'quickpick' as ConfirmationMode)) {
    case 'quickpick': {
      switch (await vscode.window.showQuickPick(
        ['Yes', 'No'],
        {
          title: prompt,
          canPickMany: false,
          placeHolder: 'cancelling is NOT the same as selecting "No", default action will be taken instead'
        }
      )) {
        case undefined:
          return 'Default';
        case 'Yes':
          return 'Approved';
        case 'No':
          return 'Rejected';
      }
    }
    case 'notification': {
      switch (await vscode.window.showInformationMessage(prompt, 'Yes', 'No')) {
        case undefined:
          return 'Default';
        case 'Yes':
          return 'Approved';
        case 'No':
          return 'Rejected';
      }
    }
    case 'silent': {
      return 'Default';
    }
  }
}
