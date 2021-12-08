#!/usr/bin/env node
import "source-map-support/register";
import { App } from "@aws-cdk/core";
import { EDAWorkshopStack } from "../lib/eda-workshop-stack";

const app = new App();
new EDAWorkshopStack(app, "EDAWorkshopStack-gblusthe", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});
