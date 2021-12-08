import {
  Aws,
  Construct,
  RemovalPolicy,
  Stack,
  StackProps,
} from "@aws-cdk/core";
import {
  Integration,
  IntegrationType,
  JsonSchemaType,
  JsonSchemaVersion,
  Model,
  RequestValidator,
  RestApi,
} from "@aws-cdk/aws-apigateway";
import {
  EventField,
  EventBus,
  Rule,
  RuleTargetInput,
} from "@aws-cdk/aws-events";
import {
  CloudWatchLogGroup,
  SfnStateMachine,
} from "@aws-cdk/aws-events-targets";
import {
  Role,
  PolicyDocument,
  PolicyStatement,
  ServicePrincipal,
} from "@aws-cdk/aws-iam";
import { LogGroup } from "@aws-cdk/aws-logs";
import { Bucket } from "@aws-cdk/aws-s3";
import {
  JsonPath,
  StateMachine,
  StateMachineType,
  TaskInput,
} from "@aws-cdk/aws-stepfunctions";
import {
  CallAwsService,
  EventBridgePutEvents,
} from "@aws-cdk/aws-stepfunctions-tasks";

export class EDAWorkshopStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const eventBus = new EventBus(this, "EDAWorkshopBus-gblusthe", {
      eventBusName: "EDAWorkshopBus-gblusthe",
    });

    const logGroup = new LogGroup(this, "EDAWorkshopBusLogGroup-gblusthe", {
      logGroupName: `EDAWorkshopBusLogGroup-gblusthe-${new Date().getTime()}`,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    new Rule(this, "EDAWorkshopBusLogGroupRule-gblusthe", {
      eventBus: eventBus,
      eventPattern: {
        detailType: ["WishlistReceived"],
      },
      ruleName: "EDAWorkshopBusLogGroupRule-gblusthe",
      targets: [new CloudWatchLogGroup(logGroup)],
    });

    const legoGiftStateMachine = new StateMachine(
      this,
      "EDAWorkshopLegoGiftStateMachine-gblusthe",
      {
        definition: new EventBridgePutEvents(this, "PutLegoGiftEvent", {
          entries: [
            {
              eventBus: EventBus.fromEventBusArn(
                this,
                "EDAWorkshopCentralBus-gblusthe",
                "arn:aws:events:eu-central-1:157983949820:event-bus/event-driven-elves"
              ),
              detail: TaskInput.fromObject({
                legoSet: JsonPath.stringAt("$.legoSKU"),
                giftTo: JsonPath.stringAt("$.from"),
              }),
              detailType: "GiftRequested",
              source: "elf-luke",
            },
          ],
        }),
        stateMachineName: "EDAWorkshopLegoGiftStateMachine-gblusthe",
        stateMachineType: StateMachineType.EXPRESS,
        tracingEnabled: true,
      }
    );

    new Rule(this, "EDAWorkshopLegoGiftRule-gblusthe", {
      eventBus: eventBus,
      eventPattern: {
        detail: {
          gift: ["lego"],
        },
        detailType: ["WishlistReceived"],
        source: ["workshop.eda"],
      },
      ruleName: "EDAWorkshopLegoGiftRule-gblusthe",
      targets: [
        new SfnStateMachine(legoGiftStateMachine, {
          input: RuleTargetInput.fromObject({
            from: EventField.fromPath("$.detail.from"),
            legoSKU: EventField.fromPath("$.detail.legoSKU"),
          }),
        }),
      ],
    });

    const centralBucket = Bucket.fromBucketArn(
      this,
      "EDAWorkshopCentralBucket-gblusthe",
      "arn:aws:s3:::event-driven-elves"
    );

    const surpriseGiftStateMachine = new StateMachine(
      this,
      "EDAWorkshopSurpriseGiftStateMachine-gblusthe",
      {
        definition: new CallAwsService(this, "PutSurpriseGiftObject", {
          action: "putObject",
          iamAction: "s3:*",
          iamResources: [centralBucket.arnForObjects("*")],
          parameters: {
            Body: TaskInput.fromObject({ giftTo: JsonPath.stringAt("$.from") }),
            Bucket: centralBucket.bucketName,
            Key: JsonPath.stringAt("$.from"),
            Tagging: "source=elf-luke",
          },
          service: "s3",
        }),
        stateMachineName: "EDAWorkshopSurpriseGiftStateMachine-gblusthe",
        stateMachineType: StateMachineType.EXPRESS,
        tracingEnabled: true,
      }
    );

    new Rule(this, "EDAWorkshopSurpriseGiftRule-gblusthe", {
      eventBus: eventBus,
      eventPattern: {
        detail: {
          gift: ["surprise"],
        },
        detailType: ["WishlistReceived"],
        source: ["workshop.eda"],
      },
      ruleName: "EDAWorkshopSurpriseGiftRule-gblusthe",
      targets: [
        new SfnStateMachine(surpriseGiftStateMachine, {
          input: RuleTargetInput.fromObject({
            from: EventField.fromPath("$.detail.from"),
          }),
        }),
      ],
    });

    const apiRole = new Role(this, "EDAWorkshopAPIRole-gblusthe", {
      assumedBy: new ServicePrincipal("apigateway"),
      inlinePolicies: {
        putEvents: new PolicyDocument({
          statements: [
            new PolicyStatement({
              actions: ["events:PutEvents"],
              resources: [eventBus.eventBusArn],
            }),
          ],
        }),
      },
    });

    const api = new RestApi(this, "EDAWorkshopAPI-gblusthe", {
      deployOptions: {
        tracingEnabled: true,
      },
    });

    const dearSanta = api.root.addResource("dear-santa");

    const dearSantaRequestValidator = new RequestValidator(
      this,
      "EDAWorkshopRequestValidator-gblusthe",
      {
        restApi: api,
        requestValidatorName: "EDAWorkshopRequestValidator-gblusthe",
        validateRequestBody: true,
      }
    );

    const dearSantaRequestModel = new Model(
      this,
      "EDAWorkshopRequestModel-gblusthe",
      {
        contentType: "application/json",
        modelName: "WishlistRequestModelgblusthe",
        restApi: api,
        schema: {
          schema: JsonSchemaVersion.DRAFT7,
          title: "Wishlist",
          type: JsonSchemaType.OBJECT,
          properties: {
            from: {
              description: "Name of wishlist creator",
              type: JsonSchemaType.STRING,
            },
            gift: {
              description: "Type of gift on the wishlist",
              type: JsonSchemaType.STRING,
              enum: ["lego", "surprise"],
            },
            legoSKU: {
              description: "LEGO product ID",
              type: JsonSchemaType.STRING,
            },
          },
          required: ["from", "gift"],
        },
      }
    );

    dearSanta.addMethod(
      "POST",
      new Integration({
        type: IntegrationType.AWS,
        uri: `arn:aws:apigateway:${Aws.REGION}:events:path//`,
        integrationHttpMethod: "POST",
        options: {
          credentialsRole: apiRole,
          requestParameters: {
            "integration.request.header.X-Amz-Target": "'AWSEvents.PutEvents'",
            "integration.request.header.Content-Type":
              "'application/x-amz-json-1.1'",
          },
          requestTemplates: {
            "application/json": JSON.stringify({
              Entries: [
                {
                  Detail: "$util.escapeJavaScript($input.body)",
                  DetailType: "WishlistReceived",
                  EventBusName: eventBus.eventBusName,
                  Source: "workshop.eda",
                },
              ],
            }),
          },
          integrationResponses: [
            {
              statusCode: "200",
              responseTemplates: {
                "application/json": "",
              },
            },
          ],
        },
      }),
      {
        methodResponses: [{ statusCode: "200" }],
        requestModels: { "application/json": dearSantaRequestModel },
        requestValidator: dearSantaRequestValidator,
      }
    );
  }
}
