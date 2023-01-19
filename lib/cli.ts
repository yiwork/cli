import { z } from "https://deno.land/x/zod@v3.20.2/mod.ts";
import {
  ArgumentValue,
  Command,
  CompletionsCommand,
  EnumType,
  ValidationError,
} from "https://deno.land/x/cliffy@v0.25.7/command/mod.ts";
import {
  Input,
  prompt,
  Secret,
  Toggle,
} from "https://deno.land/x/cliffy@v0.25.7/prompt/mod.ts";
import { open } from "https://deno.land/x/open@v0.0.5/index.ts";
import { Table } from "https://deno.land/x/cliffy@v0.25.7/table/mod.ts";
import * as obj from "https://esm.sh/object-path-immutable@4.1.2";
import openEditor from "https://esm.sh/open-editor@4.0.0";

import { formattedVersion } from "./version.ts";
import * as credentials from "./credentials.ts";
import * as config from "./config.ts";
import { bold, colors, warn } from "./ansi.ts";
import { act } from "./act.ts";
import { select } from "./select.ts";
import { gqlFetch } from "./client.ts";
import {
  ListProjectsDocument,
  OrderDirection,
  ProjectOrderField,
  ViewerDocument,
} from "./paperspace-graphql.ts";
import * as project from "./projects/index.ts";
import { pollCmd } from "./poll.ts";

const DOCS_ENDPOINT = "https://docs.paperspace.com";

export const cli = new Command()
  .name("pspace")
  .usage(`<command> [options] `)
  .version(formattedVersion)
  .description(
    `
    A CLI for using the Paperspace API. Read the full documentation at "${DOCS_ENDPOINT}/cli".
    `,
  )
  .globalType("url", zodType(z.string().url()))
  .globalOption(
    "--api-key <api-key:string>",
    `The Paperspace API key to use for authenticating requests.`,
  )
  .globalOption(
    "--api-url <api-url:url>",
    `The URL for the Paperspace API. Defaults to "https://api.paperspace.com/graphql".`,
  )
  .globalOption("--debug", `Enable debug logging.`)
  .globalOption("--json", `Display the output as JSON.`)
  .globalEnv(
    "PAPERSPACE_API_KEY=<value:string>",
    `The Paperspace API key to use for authenticating requests.`,
  )
  .globalEnv(
    "PAPERSPACE_API_URL=<value:string>",
    `The URL for the Paperspace API. Defaults to "https://api.paperspace.com/graphql"."`,
    {
      hidden: true,
    },
  )
  .globalEnv("DEBUG=<value:boolean>", `Enable debug logging.`, {
    required: false,
    hidden: true,
  })
  .globalEnv("NO_COLOR=<value:boolean>", `Disable colors in the output.`)
  .action(() => {
    cli.showHelp();
  });

/**
 * Custom types
 */

function zodType(schema: z.ZodSchema) {
  return ({ name, value }: ArgumentValue) => {
    try {
      return schema.parse(value);
    } catch (err) {
      if (err instanceof z.ZodError) {
        throw new ValidationError(
          `Argument "${name}" is invalid: ${err.issues[0].message}`,
          {
            exitCode: 1,
          },
        );
      }

      throw err;
    }
  };
}

/**
 * Commands
 * @see https://cliffy.io/docs@v0.25.7/command/commands
 */

/**
 * Deployments
 */
cli
  .command(
    "deployment, d",
    new Command()
      .command("init")
      .action(() => {
        console.log("init");
      })
      .command("create")
      .action(act.ifLoggedIn(() => {
        console.log("create");
        return { value: "" };
      }))
      .command("update")
      .action(act.ifLoggedIn(() => {
        console.log("update");
        return { value: "" };
      }))
      .command("delete")
      .action(act.ifLoggedIn(() => {
        console.log("delete");
        return { value: "" };
      }))
      .command("list")
      .action(act.ifLoggedIn(() => {
        console.log("list");
        return { value: "" };
      }))
      .command("get")
      .action(act.ifLoggedIn(() => {
        console.log("get");
        return { value: "" };
      })),
  )
  .description(`Effortlessly deploy ML apps to Paperspace.`)
  .action(function () {
    this.showHelp();
  });

/**
 * Machines
 */
cli
  .command(
    "machine, vm",
    new Command()
      .command("init")
      .action(() => {
        console.log("init");
      })
      .command("create")
      .action(act.ifLoggedIn(() => {
        console.log("create");
        return { value: "" };
      }))
      .command("update")
      .action(act.ifLoggedIn(() => {
        console.log("update");
        return { value: "" };
      }))
      .command("delete")
      .action(act.ifLoggedIn(() => {
        console.log("delete");
        return { value: "" };
      }))
      .command("list")
      .action(act.ifLoggedIn(() => {
        console.log("list");
        return { value: "" };
      }))
      .command("get")
      .action(act.ifLoggedIn(() => {
        console.log("get");
        return { value: "" };
      })),
  )
  .action(function () {
    this.showHelp();
  });

/**
 * Projects
 */
cli
  .command(
    "project, p",
    new Command()
      .command("create")
      .arguments(`[name:string]`)
      .option(
        "--link",
        "Link the current directory to the project. (default: false)",
      )
      .action(act.ifLoggedIn(async (_opt, name) => {
        if (!name) {
          const values = await prompt([
            {
              name: "name",
              type: Input,
              prefix: "",
              message: "Project name:",
              validate(value) {
                return z.string().min(1).max(128).safeParse(value).success
                  ? true
                  : "Must be between 1 and 128 characters.";
              },
            },
            {
              name: "link",
              type: Toggle,
              prefix: "",
              message:
                "Do you want to link the current directory to the project?",
              default: true,
            },
          ]);

          name = values.name!;
        }

        return await project.create({ name });
      }))
      .command("update")
      .arguments("<id:string>")
      .option("--name <name:string>", "The new name for the project.")
      .action(act.ifLoggedIn(async (opt, argId) => {
        let name = opt.name;
        const id = argId;

        if (!opt.name) {
          const values = await prompt([
            {
              name: "name",
              type: Input,
              prefix: "",
              message: "Project name:",
              validate(value) {
                return z.string().min(1).max(128).safeParse(value).success
                  ? true
                  : "Must be between 1 and 128 characters.";
              },
            },
          ]);

          name = values.name!;
        }

        return await project.update({ id, name });
      }))
      .command("delete")
      .action(act.ifLoggedIn(() => {
        console.log("delete");
        return { value: "" };
      }))
      .command("list")
      .option(
        "--next <count:number>",
        "Return the next <count> results after the cursor.",
      )
      .option("--after <cursor:string>", "Return results after this cursor.")
      .type("sort-by", new EnumType(ProjectOrderField))
      .option("--sort <sort-by:sort-by>", "Sort the results by this field.", {
        default: "dtCreated",
      })
      .option("--asc", "Order the results ascending.", { conflicts: ["desc"] })
      .option("--desc", "Order the results descending.", { conflicts: ["asc"] })
      .option("--fields <fields:string[]>", "Return only these fields.", {
        collect: true,
      })
      .action(act.ifLoggedIn(async (opt) => {
        const fields = opt.fields?.flat().map((field) => field.trim()) as any;

        return await project.list({
          fields,
          after: opt.after,
          first: opt.next,
          orderBy: {
            field: (opt.sort as ProjectOrderField) ?? "dtCreated",
            direction: opt.asc ? OrderDirection.Asc : OrderDirection.Desc,
          },
        });
      }))
      .command("get")
      .arguments("[id:string]")
      .option("--fields <fields:string[]>", "Return only these fields.", {
        collect: true,
      })
      .option(
        "--poll [interval:string]",
        `Poll the server for updates. Defaults to "3s".`,
      )
      .action(
        act.ifLoggedIn(async (opt, id) => {
          const fields = opt.fields?.flat().map((field) => field.trim()) as any;

          if (!id) {
            const suggestions = await gqlFetch(ListProjectsDocument, {
              first: 100,
            });

            id = await select({
              message: "Select a project",
              options: suggestions.projects.nodes.map((p) => ({
                name: `${p.name} (${p.id})`,
                value: p.id,
              })),
              search: true,
              searchLabel: "| 🔍",
              info: true,
            });
          }

          if (opt.poll) {
            return {
              value: await pollCmd(
                async () => await project.get({ id: id!, fields }),
                opt,
              ),
            };
          } else {
            return await project.get({ id, fields });
          }
        }),
      ),
  )
  .description(`Manage your Paperspace Gradient projects.`)
  .action(function () {
    this.showHelp();
  });

/**
 * Login
 */
cli
  .command(
    "login",
    `
    Log in to the CLI using your Paperspace API key or by opening the web console.
    `,
  )
  .arguments("[api-key:string]")
  .action(act(async (_opt, apiKey) => {
    if (!apiKey) {
      open(`https://console.paperspace.com/account/api`);

      apiKey = await Secret.prompt({
        message: "Enter an API key:",
        prefix: "",
      });
    }

    const { viewer } = await gqlFetch(ViewerDocument, {}, { apiKey });
    const team = viewer?.team?.namespace;

    if (!team) {
      throw new ValidationError("Invalid API key.");
    }

    await credentials.set(team, apiKey);
    await config.set("team", team);
    return { value: `Logged in to team "${bold(team)}"` };
  }));

/** */
cli
  .command(
    "logout",
    `
    Log out of the CLI for the current team, a specific team, or all teams.
    `,
  )
  .arguments("[team:string]")
  .option("--all", "Log out of all teams.")
  .action(act(async (_opt, team) => {
    if (_opt.all) {
      await config.set("team", null);
      await credentials.clear();
      return { value: `Logged out of all teams` };
    }

    const currentTeam = await config.get("team");

    if (team) {
      if (team === currentTeam) {
        await config.set("team", null);
      }

      await credentials.remove(team);
      return { value: `Logged out of team "${bold(team)}"` };
    }

    if (currentTeam) {
      await config.set("team", null);
      await credentials.remove(currentTeam);
      return { value: `Logged out of team "${bold(currentTeam)}"` };
    }

    return { value: "" };
  }));

/**
 * Sign up
 */
cli
  .command(
    "signup",
    `
  Sign up for a Paperspace account.
  `,
  )
  .action(() => {
    open(`https://console.paperspace.com/signup`);
  });

/**
 * Config
 */
cli
  .command(
    "config",
    new Command()
      .command("set")
      .description(
        `
        Set a configuration value at a given path.
        `,
      )
      .example(`Set the team to "my-team"`, "pspace config set team my-team")
      .type("key", new EnumType(config.paths))
      .arguments("[key:key] [value:string]")
      .action(
        act(async (_opt, key, value) => {
          if (!key) {
            if (!key) {
              key = await select({
                message: "Select a key to set the value for:",
                options: config.paths,
              });
            }
          }

          if (!value) {
            value = await Input.prompt({
              prefix: "",
              message: "Enter a new value:",
              suggestions: key === "team" ? await credentials.list() : [],
              list: true,
              info: true,
              validate(value) {
                return !!value.trim() || "Required";
              },
            });
          }

          try {
            await config.set(key, value);
          } catch (err) {
            if (err instanceof z.ZodError) {
              throw new config.ConfigError(
                `${warn(`Invalid value for "${key}"`)}\n${
                  err.issues[0].message
                }`,
              );
            }
          }

          const parsedValue = await config.get(key);
          return { value: parsedValue };
        }),
      )
      .command("get")
      .description(
        `
        Get a configuration value at a given path.
        `,
      )
      .example(`Get the current team`, "pspace config get team")
      .type("key", new EnumType(config.paths))
      .arguments("[key:key]")
      .action(
        act(async (_opt, key) => {
          if (!key) {
            key = await select({
              message: "Select a key to get the value for:",
              options: config.paths,
            });
          }
          const value = await config.get(key);
          return { value };
        }),
      )
      .command("delete")
      .description(
        `
        Delete a configuration value at a given path.
        `,
      )
      .example(`Delete the current team`, "pspace config delete team")
      .type("key", new EnumType(config.paths))
      .arguments("<key:key>")
      .action(async (_opt, key) => {
        await config.remove(key);
      })
      .command("list")
      .description(
        `
        List all configuration values with their paths.
        `,
      )
      .action(
        act(async () => {
          const json = await config.read();

          const table = new Table().header([
            colors.blue("Key"),
            colors.blue("Value"),
          ]).body(
            config.paths.reduce((acc, key) => {
              acc.push([colors.italic(key), obj.get(json, key)]);
              return acc;
            }, [] as [string, string][]),
          );

          return {
            human: table.padding(4).toString(),
            json,
          };
        }),
      )
      .command("open")
      .description(
        `
        Open the configuration file in a "nano" editor.
        `,
      )
      .action(() => {
        openEditor([config.CONFIG_PATH], { editor: "nano" });
      }),
  )
  .description(
    `
    Manage global configuration values stored in: "${config.CONFIG_PATH}".
    `,
  )
  .action(function () {
    this.showHelp();
  });

/**
 * Adds a command to generate completions for various shells
 */
cli.command("completions", new CompletionsCommand());

/**
 * Console
 */
cli
  .command(
    "console",
    `
    Open the Paperspace web console.
    `,
  )
  .action(() => {
    open(`https://console.paperspace.com/`);
  });

/**
 * Docs
 */
cli
  .command(
    "docs",
    `
    Open Paperspace documention in your default browser.
    `,
  )
  .type(
    "docsPage",
    new EnumType(
      [
        "d",
        "nb",
        "vm",
        "deployment",
        "notebook",
        "machine",
      ] as const,
    ),
  )
  .arguments("[page:docsPage]")
  .action((_opt, page) => {
    const url = new URL(DOCS_ENDPOINT);

    if (page) {
      url.pathname = {
        d: "/gradient/deployments/",
        deployment: "/gradient/deployments/",
        nb: "/gradient/notebooks/",
        notebook: "/gradient/notebooks/",
        vm: "/core/compute/",
        machine: "/core/compute/",
      }[page] ?? "/";
    }

    open(url + "");
  });

/**
 * Adds a command to upgrade the CLI
 */
// cli.command(
//   "upgrade",
//   new UpgradeCommand({ provider: ["choco", "brew", "curl", "scoop"] }),
// );

// async function checkVersion() {
//   const mainCommand = cli.getMainCommand();
//   const upgradeCommand = mainCommand.getCommand("upgrade");
//   const latestVersion = await upgradeCommand.getLatestVersion();
//   const currentVersion = mainCommand.getVersion();

//   if (currentVersion === latestVersion) {
//     return;
//   }

//   const versionHelpText =
//     `(New version available: ${latestVersion}. Run '${mainCommand.getName()} upgrade' to upgrade to the latest version!)`;
//   console.log(warn(versionHelpText));
// }
