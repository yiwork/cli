import { colors } from "https://deno.land/x/cliffy@v0.25.7/ansi/mod.ts";

export const error = colors.bold.red;
export const warn = colors.bold.yellow;
export const info = colors.bold.cyan;
export const success = colors.bold.green;
export const bold = colors.bold;
export * from "https://deno.land/x/cliffy@v0.25.7/ansi/mod.ts";
export { default as strip } from "https://esm.sh/strip-ansi@7.0.1";
