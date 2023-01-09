import { env } from "./env.ts";
import * as credentials from "./credentials.ts";
import * as config from "./config.ts";
import { strip } from "./ansi.ts";

/**
 * Logs a message to the console in the appropriate format based on the
 * CLI options.
 *
 * @param formats - Formats to print.
 * @param opt - Configuration options
 */
function print(
  formats: Formats,
  opt: {
    json: boolean;
  },
): void {
  if (opt?.json) {
    let json = "value" in formats ? formats.value : formats.json;

    if (typeof json === "string") {
      json = strip(json);
    }

    console.log(JSON.stringify(json, null, 2));
  } else {
    console.log("value" in formats ? formats.value : formats.human);
  }
}

/**
 * A higher order function that needs to be added to every action. This will also
 * print the return value of an action function in the appropriate format based on
 * the CLI options.
 *
 * @param fn - An action function that returns a `PrintsFormats` object.
 *
 * @example
 * ```ts
 * cli.action(act(async () => {
 *  return { value: "Hello World" }
 * }))
 * ```
 */
export function act<
  Fn extends (...args: any[]) => Formats | Promise<Formats>,
>(fn: Fn) {
  return async function action(...args: Parameters<Fn>): Promise<void> {
    const opt = args[0];

    if (opt.debug !== undefined) {
      env.set("DEBUG", opt.debug);
    }

    if (opt.apiKey) {
      env.set("PAPERSPACE_API_KEY", opt.apiKey);
    }

    if (opt.apiUrl) {
      env.set("PAPERSPACE_API_URL", opt.apiUrl);
    }

    if (!env.get("PAPERSPACE_API_KEY")) {
      const team = await config.get("team");

      if (team) {
        env.set("PAPERSPACE_API_KEY", await credentials.get(team));
      }
    }

    const formats = await fn(...args);
    print(formats, opt);
  };
}

type Formats =
  | {
    /**
     * A JSON-serializable value to print.
     */
    json: unknown;
    /**
     * A human-readable string to print.
     */
    human: unknown;
  }
  | {
    /**
     * A JSON-serializable value to print.
     */
    value: unknown;
  };