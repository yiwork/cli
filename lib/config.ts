import {
  parse,
  stringify,
} from "https://deno.land/std@0.171.0/encoding/yaml.ts";
import { z } from "https://deno.land/x/zod@v3.20.2/mod.ts";
import * as obj from "https://esm.sh/object-path-immutable@4.1.2";
import { env } from "./env.ts";
import * as credentials from "./credentials.ts";
import { logger } from "./logger.ts";
import { bold } from "./ansi.ts";
import { closest } from "./util.ts";

/**
 * Load the config file
 */
export async function read() {
  try {
    Deno.statSync(CONFIG_PATH);
  } catch (_err) {
    logger.warning(`No config file found at "${CONFIG_PATH}".`);
    return await schema.parseAsync({
      team: null,
    });
  }

  try {
    const config = parse(await Deno.readTextFile(CONFIG_PATH));
    return await schema.parseAsync(config);
  } catch (_err) {
    logger.warning(
      `Config file at "${CONFIG_PATH}" is invalid. Using defaults.`,
    );

    const nextConfig = await schema.parseAsync({
      team: null,
    });

    await write(nextConfig);
    return nextConfig;
  }
}

/**
 * Write the config file
 *
 * @param config - The config to write to the file
 */
export async function write(config: z.infer<typeof schema>) {
  try {
    Deno.statSync(CONFIG_DIR);
  } catch (_err) {
    logger.warning(
      `No config directory found. Creating one: "${CONFIG_DIR}".`,
    );
    await Deno.mkdir(CONFIG_DIR, { recursive: true });
  }

  config = await schema.parseAsync(config);
  logger.info(`Writing config: "${CONFIG_PATH}".`);
  await Deno.writeTextFile(
    CONFIG_PATH,
    stringify(config),
    {
      mode: 0o600,
    },
  );
}

/**
 * Get the config value for a given path
 *
 * @param path - The path to get the value for
 */
export async function get<Path extends ConfigPaths>(
  path: Path,
): Promise<TypeFromPath<Config, Path>> {
  const config = await read();
  return obj.get(config, path);
}

/**
 * Set the value for a given path in the config file
 *
 * @param path - The path to set the value for
 * @param value - The value to set for the path
 */
export async function set<Path extends ConfigPaths>(
  path: Path,
  value: TypeFromPath<Config, Path>,
) {
  const config = await read();
  return await write(obj.set(config, path, value));
}

/**
 * Remove a key from the config file
 *
 * @param path - The path to remove
 */
export async function remove<Path extends ConfigPaths>(path: Path) {
  const config = await read();
  return await write(obj.del(config, path));
}

/**
 * Clear the config file
 */
export async function clear() {
  return await write(
    await schema.parseAsync({
      team: null,
    }),
  );
}

export const schema = z.object({
  version: z.literal(1).default(1),
  team: z
    .string()
    .transform(async (value): Promise<string | null> => {
      if (await credentials.get(value)) {
        return value;
      }

      const teams = await credentials.list();

      logger.critical(
        `Team "${value}" was not found in your credentials file. Retaining current team.`,
      );

      const didYouMeanValue = closest(teams, value);
      const didYouMean = didYouMeanValue
        ? `\n\nDid you mean ${bold(didYouMeanValue)}?`
        : "";

      throw new ConfigError(
        `A team named "${value}" was not found in your credentials file. ${didYouMean}
Are you logged in? Try running "${bold("pspace login")}" first.`,
      );
    })
    .describe("The name of the current team.")
    .nullable()
    .default(null),
});

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export const paths = getKeys(schema).filter((key) =>
  key !== "version"
) as ConfigPaths[];

export type Config = z.infer<typeof schema>;
export type ConfigPaths = Exclude<
  Exclude<NestedPaths<Config>, undefined>,
  "version"
>;

const CONFIG_DIR = `${env.get("HOME")}/.paperspace`;
export const CONFIG_PATH = `${CONFIG_DIR}/config.yml`;

// deno-lint-ignore no-explicit-any
function getKeys(obj: z.ZodObject<any>): string[] {
  return Object.keys(obj.shape)
    .map((key) => {
      const nestedObj = obj.shape[key]?.isOptional()
        ? obj.shape[key]._def.innerType
        : obj.shape[key];

      if ("shape" in nestedObj) {
        return getKeys(nestedObj).map((subKey: string) => `${key}.${subKey}`);
      }

      return key;
    })
    .flat();
}

type Primitive = string | number | symbol;

type GenericObject = Record<Primitive, unknown>;

type Join<
  L extends Primitive | undefined,
  R extends Primitive | undefined,
> = L extends string | number ? R extends string | number ? `${L}.${R}`
  : L
  : R extends string | number ? R
  : undefined;

type Union<
  L extends unknown | undefined,
  R extends unknown | undefined,
> = L extends undefined ? R extends undefined ? undefined
  : R
  : R extends undefined ? L
  : L | R;

/**
 * NestedPaths
 * Get all the possible paths of an object
 * @example
 * type Keys = NestedPaths<{ a: { b: { c: string } }>
 * // 'a' | 'a.b' | 'a.b.c'
 */
export type NestedPaths<
  T extends GenericObject,
  Prev extends Primitive | undefined = undefined,
  Path extends Primitive | undefined = undefined,
> = {
  [K in keyof T]: T[K] extends GenericObject
    ? NestedPaths<T[K], Union<Prev, Path>, Join<Path, K>>
    : Union<Union<Prev, Path>, Join<Path, K>>;
}[keyof T];

/**
 * TypeFromPath
 * Get the type of the element specified by the path
 * @example
 * type TypeOfAB = TypeFromPath<{ a: { b: { c: string } }, 'a.b'>
 * // { c: string }
 */
export type TypeFromPath<
  T extends GenericObject,
  Path extends string, // Or, if you prefer, NestedPaths<T>
> = {
  [K in Path]: K extends keyof T ? T[K]
    : K extends `${infer P}.${infer S}`
      ? T[P] extends GenericObject ? TypeFromPath<T[P], S>
      : never
    : never;
}[Path];