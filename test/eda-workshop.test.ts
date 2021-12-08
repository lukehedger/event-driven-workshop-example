import { Template } from "@aws-cdk/assertions";
import { App } from "@aws-cdk/core";
import { EDAWorkshopStack } from "../lib/eda-workshop-stack";

test("API Gateway Created", () => {
  const app = new App();

  const stack = new EDAWorkshopStack(app, "EDAWorkshopStack-Test");

  const template = Template.fromStack(stack);

  template.hasResourceProperties("AWS::ApiGateway::RestApi", {
    Name: "EDAWorkshopAPI-gblusthe",
  });
});
