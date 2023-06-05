import { asserts } from "../../../lib/asserts.ts";
import { loading } from "../../../lib/loading.ts";
import { input } from "../../../prompts/input.ts";
import { args, command, flags, z } from "../../../zcli.ts";
import { dataTable } from "../../../lib/data-table.ts";
import { fields } from "../../../flags.ts";
import { pickJson } from "../../../lib/pick-json.ts";
import { machineEvents } from "../../../api/machine-events.ts";

/**
 * This variable is automatically generated by `zcli add`. Do not remove this
 * or change its name unless you're no longer using `zcli add`.
 */
const subCommands: ReturnType<typeof command>[] = [];

export const get = command("get", {
  short: "Get a machine event",
  long: `
    Get a machine event from a team.
  `,
  commands: subCommands,
  args: args().tuple([
    z.string().describe("The ID of the machine event to get"),
  ]).optional(),
  flags: flags({
    fields,
  }),
  // We use command metadata in the `persistentPreRun` function to check if a
  // command requires an API key. If it does, we'll check to see if one is
  // set. If not, we'll throw an error.
  meta: {
    requireApiKey: true,
  },
}).run(
  async function* ({ args, flags }) {
    let [id] = args;

    if (!id) {
      id = await input("ID:", {
        filter: (v) => !!v.sequence.match(/[a-zA-Z0-9_-]/),
      });
      asserts(id, "A machine event ID is required");
    }

    const response = await loading(
      machineEvents.get({ id }),
    );

    asserts(response.ok, response);
    const result = response.data;

    if (flags.json) {
      yield pickJson(result, flags.fields);
    } else {
      for await (const line of dataTable([result], flags.fields)) {
        yield line;
      }
    }
  },
);
