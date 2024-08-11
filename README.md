# Rust Toolbar for VS Code

## Overview

The **Rust Toolbar** extension for Visual Studio Code provides a convenient toolbar for running common Rust commands directly from the editor. This extension streamlines your Rust development workflow by giving you easy access to essential Cargo commands through a custom toolbar.

![Extension Screenshot](https://github.com/calalalizade/vscode-cargo-toolset/blob/main/media/cargo-toolset.png)

## Features

- **Run Commands**: Quickly run your Rust code or build projects.
- **Build Commands**: Compile your Rust projects with various build options.
- **Check Commands**: Check for errors and run Clippy for linting.
- **Test Commands**: Run and manage your Rust tests.
- **Documentation Commands**: Generate and open documentation.
- **Package Commands**: Initialize new projects or update dependencies.
- **Rustup Commands**: Switch between Rust toolchains.
- **General Commands**: Access help and version information.

## Getting Started

1. **Install the Extension**

   - Open VS Code.
   - Go to the Extensions view by clicking on the Extensions icon in the Activity Bar on the side of the window or pressing `Ctrl+Shift+X`.
   - Search for **Rust Toolbar**.
   - Click **Install**.

2. **Open the Toolbar**

   - After installation, open the Rust Toolbar by clicking on the **Rust Toolbar** icon in the Activity Bar on the side of the window.

3. **Use the Toolbar**

   - The toolbar will display a list of commands categorized by their function (e.g., Run Commands, Build Commands).
   - Click on a button to execute the corresponding Cargo command.

## Commands

### Run Commands

- **Run Code**: Compiles and runs the current project.
- **Run Code (Quite)**: Compiles and runs the project with minimal output.

### Build Commands

- **Build**: Compiles the current project.
- **Build Release**: Compiles the project with optimizations for release.
- **Build Verbose**: Compiles with detailed output.
- **Clean**: Removes build artifacts.
- **Run Benchmarks**: Runs benchmarks for the current project.

### Check Commands

- **Check**: Checks the project for errors without producing a binary.
- **Check All**: Checks all packages in the workspace for errors.
- **Run Clippy**: Checks code for common mistakes and stylistic issues.

### Test Commands

- **Test Code**: Runs the tests in the current project.
- **Test All Code**: Runs tests for all packages in the workspace.
- **Test All (Including Ignored)**: Runs all tests, including ignored ones.
- **Test Documentation**: Runs tests written in documentation comments.
- **Test Without Running**: Compiles tests but doesn't execute them.

### Documentation Commands

- **Generate Documentation**: Generates documentation for the current project.
- **Open Documentation**: Generates documentation and opens it in the default web browser.
- **Generate Documentation Without Dependencies**: Generates documentation without including dependencies.

### Package Commands

- **Initialize New Project**: Creates a new Cargo project in the specified directory.
- **Create New Project**: Creates a new Cargo project in a new directory.
- **Update Cargo**: Updates dependencies to the latest versions.
- **Fetch Dependencies**: Downloads the dependencies for the project.

### Rustup Commands

- **Use Nightly**: Sets the project to use the nightly Rust toolchain.
- **Use Stable**: Sets the project to use the stable Rust toolchain.

### General Commands

- **Cargo Help**: Displays help information about Cargo.
- **Cargo Version**: Shows version information about Cargo.
- **Show Metadata**: Displays metadata about the current project and its dependencies.

## Troubleshooting

- **No Commands Displayed**: Ensure that you have a Rust project open and that the toolbar is properly initialized.
- **Command Not Working**: Check the command’s syntax and ensure that you have the necessary dependencies installed.

## Contributing

If you encounter any issues or have suggestions for improvements, please feel free to contribute to the extension's GitHub repository.

## License

This extension is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
