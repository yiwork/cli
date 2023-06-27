import { command } from "../../zcli.ts";
import { open } from "../../lib/open.ts";
import { env } from "../../env.ts";

/**
 * This variable is automatically generated by `zcli add`. Do not remove this
 * or change its name unless you're no longer using `zcli add`.
 */
const subCommands: ReturnType<typeof command>[] = [];

export const signup = command("signup", {
  short: "Sign up for a Paperspace account.",
  long: `
    This command opens the Paperspace signup page in your browser.
  `,
  commands: subCommands,
}).run(function* () {
  yield "Opening Paperspace in your browser...";
  open(new URL("/sign-up", env.get("PAPERSPACE_CONSOLE_URL")) + "");
});
