# cargo dockside

shortcuts for various [cargo] subcommands in vscode sidebar.

this is a fork of [vscode-cargo-toolset], the README file of the original
project can be found at [README.original.md](./README.original.md)

> [!NOTE]
> I created this fork mainly for personal use, I mostly only made small changes.
> I didn't change most of the internal ids, e.g. commands, sidebar views,
> configurations, etc will conflict with the original [vscode-cargo-toolset]
> extension.

to reduce the chance to confuse users, and also because I'm personally
using [vscodium], I plan to only publish this extension to http://open-vsx.org,
if you are a `vscode` user and interested in this extension, you can either
build it from source, or download prebuilt `.vsix` files directly from the
[github releases](https://github.com/nerditation/cargo-dockside/releases) page.


## what's different in this fork

here's a brief summary (which is probably incomplete and outdated):

- major UI tweaks
  - most custom button stylings are removed, use default button styles instead;
  - the size of buttons are reduced;
  - removed font settings, use whatever is the default of the editor;
- new cargo commands shortcuts
  - `cargo new --lib <PATH>`
  - `cargo new TMPDIR/playground-xxxx`
- command execution changes
  - run commands as `Task`s in special terminals;
    - `vscode-cargo-toolset` sends the command line to a "regular" terminal;
  - ability to spawn `cargo` directly, bypassing shells;
  - can run a "post command" after the command finished successfully;
    - e.g. after create new package, run `vscode.openFolder` to open it;

I urge anyone who wants to know the details to check the commit history.
I usually make git commits with small changes, because I like to review changes
manually, and small changesets are generally easier to understand.


## license

this extension is released under [the MIT license](./LICENSE).

SPDX-License-Identifier: MIT
<br/>
SPDX-PackageCopyrightText: Copyright 2024 Jalal Alizadeh, 2025 nerditaion


--------

[cargo]: https://doc.rust-lang.org/stable/cargo/
[vscode-cargo-toolset]: https://github.com/calalalizade/vscode-cargo-toolset
[vscodium]: https://github.com/VSCodium/vscodium/
