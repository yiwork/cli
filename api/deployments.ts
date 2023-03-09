import { client } from "./client.ts";

export const deployments = {
  list: client("/deployments").get,
  create: client("/deployments").post,
  get: client("/deployments/{id}").get,
  upsert: client("/deployments").post,
  delete: client("/deployments/{id}").delete,
};

export const deploymentRuns = {
  get: client("/deployments/{id}/runs").get,
};
