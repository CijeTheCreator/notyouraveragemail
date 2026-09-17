/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as agentmail from "../agentmail.js";
import type * as auth from "../auth.js";
import type * as http from "../http.js";
import type * as messages from "../messages.js";
import type * as pipeline_actionCards from "../pipeline/actionCards.js";
import type * as pipeline_authDiscoveryAgent from "../pipeline/authDiscoveryAgent.js";
import type * as pipeline_cancellationAgent from "../pipeline/cancellationAgent.js";
import type * as pipeline_classifier from "../pipeline/classifier.js";
import type * as pipeline_domainReputation from "../pipeline/domainReputation.js";
import type * as pipeline_orchestrator from "../pipeline/orchestrator.js";
import type * as pipeline_otp from "../pipeline/otp.js";
import type * as pipeline_otpHandler from "../pipeline/otpHandler.js";
import type * as pipeline_subscriptionCancellation from "../pipeline/subscriptionCancellation.js";
import type * as pipeline_subscriptionHandler from "../pipeline/subscriptionHandler.js";
import type * as seed from "../seed.js";
import type * as seedSubscriptions from "../seedSubscriptions.js";
import type * as testCheckout from "../testCheckout.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  agentmail: typeof agentmail;
  auth: typeof auth;
  http: typeof http;
  messages: typeof messages;
  "pipeline/actionCards": typeof pipeline_actionCards;
  "pipeline/authDiscoveryAgent": typeof pipeline_authDiscoveryAgent;
  "pipeline/cancellationAgent": typeof pipeline_cancellationAgent;
  "pipeline/classifier": typeof pipeline_classifier;
  "pipeline/domainReputation": typeof pipeline_domainReputation;
  "pipeline/orchestrator": typeof pipeline_orchestrator;
  "pipeline/otp": typeof pipeline_otp;
  "pipeline/otpHandler": typeof pipeline_otpHandler;
  "pipeline/subscriptionCancellation": typeof pipeline_subscriptionCancellation;
  "pipeline/subscriptionHandler": typeof pipeline_subscriptionHandler;
  seed: typeof seed;
  seedSubscriptions: typeof seedSubscriptions;
  testCheckout: typeof testCheckout;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  agent: import("@convex-dev/agent/_generated/component.js").ComponentApi<"agent">;
};
