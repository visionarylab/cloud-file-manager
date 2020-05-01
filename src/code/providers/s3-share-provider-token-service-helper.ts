import ClientOAuth2 from "client-oauth2";
import { TokenServiceClient, S3Resource } from "@concord-consortium/token-service";
import * as AWS from "aws-sdk";

// Copied from the Token-Service repo. see @concord-consortium/token-service
// This file provides simple recipes showing how to use TokenServiceClient
// and how to get other necessary prerequisites (auth in Portal, firebase JWT).

const PORTAL_AUTH_PATH = "/auth/oauth_authorize";

const getURLParam = (name: string) => {
  const url = (self || window).location.href;
  name = name.replace(/[[]]/g, "\\$&");
  const regex = new RegExp(`[#?&]${name}(=([^&#]*)|&|#|$)`);
  const results = regex.exec(url);
  if (!results) return null;
  return decodeURIComponent(results[2].replace(/\+/g, " "));
};

export const authorizeInPortal = (portalUrl: string, oauthClientName: string) => {
  const portalAuth = new ClientOAuth2({
    clientId: oauthClientName,
    redirectUri: window.location.origin + window.location.pathname + window.location.search,
    authorizationUri: `${portalUrl}${PORTAL_AUTH_PATH}`
  });
  // Redirect
  window.location.href = portalAuth.token.getUri();
};

export const readPortalAccessToken = (): string => {
  // No error handling to keep the code minimal.
  return getURLParam("access_token") || "";
};

export const getFirebaseJwt = (portalUrl: string, portalAccessToken: string, firebaseAppName: string): Promise<string> => {
  const authHeader = { Authorization: `Bearer ${portalAccessToken}` };
  const firebaseTokenGettingUrl = `${portalUrl}/api/v1/jwt/firebase?firebase_app=${firebaseAppName}`;
  return fetch(firebaseTokenGettingUrl, { headers: authHeader })
    .then(response => response.json())
    .then(json => json.token)
};

interface ICreateFile {
  filename: string;
  fileContent: string;
  firebaseJwt?: string;
  tokenServiceEnv: "dev" | "staging";
}
export const createFile = async ({ filename, fileContent, firebaseJwt, tokenServiceEnv }: ICreateFile) => {
  // This function optionally accepts firebaseJWT. There are three things that depend on authentication method:
  // - TokenServiceClient constructor arguments. If user should be authenticated during every call to the API, provide `jwt` param.
  // - createResource call. If user is not authenticated, "readWriteToken" accessRule type must be used. Token Service will generate and return readWriteToken.
  // - getCredentials call. If user is not authenticated, readWriteToken needs to be provided instead.
  const anonymous = !firebaseJwt;

  const client = anonymous ? new TokenServiceClient({ env: tokenServiceEnv }) : new TokenServiceClient({ env: tokenServiceEnv, jwt: firebaseJwt })
  const resource: S3Resource = await client.createResource({
    tool: "example-app",
    type: "s3Folder",
    name: "test file" + filename,
    description: "test file",
    accessRuleType: anonymous ? "readWriteToken" : "user"
  }) as S3Resource;
  console.log("new resource:", resource);

  // Note that if your file ever needs to get updated, this token MUST BE (SECURELY) SAVED.
  let readWriteToken = "";
  if (anonymous) {
    readWriteToken = client.getReadWriteToken(resource) || "";
    console.log("read write token:", readWriteToken);
  }

  const credentials = anonymous ? await client.getCredentials(resource.id, readWriteToken) :  await client.getCredentials(resource.id);
  console.log("credentials:", credentials);

  // S3 configuration is based both on resource and credentials info.
  const { bucket, region } = resource;
  const { accessKeyId, secretAccessKey, sessionToken } = credentials;
  const s3 = new AWS.S3({ region, accessKeyId, secretAccessKey, sessionToken });
  const publicPath = client.getPublicS3Path(resource, filename);

  const result = await s3.upload({
    Bucket: bucket,
    Key: publicPath,
    Body: fileContent,
    ContentType: "text/html",
    ContentEncoding: "UTF-8",
    CacheControl: "no-cache"
  }).promise();
  console.log(result);

  return {
    publicUrl: client.getPublicS3Url(resource, filename),
    resourceId: resource.id,
    readWriteToken
  };
};

interface IUpdateFileArgs {
  filename: string;
  newFileContent: string;
  resourceId: string;
  firebaseJwt?: string;
  readWriteToken?: string;
  tokenServiceEnv: "dev" | "staging";
}
export const updateFile = async ({ filename, newFileContent, resourceId, firebaseJwt, readWriteToken, tokenServiceEnv}: IUpdateFileArgs) => {
  // This function accepts either firebaseJWT or readWriteToken. There are only two things that depend on authentication method:
  // - TokenServiceClient constructor arguments. If user should be authenticated during every call to the API, provide `jwt` param.
  // - getCredentials call. If user is not authenticated, readWriteToken needs to be provided instead.
  const anonymous = !firebaseJwt && readWriteToken;

  const client = anonymous ? new TokenServiceClient({ env: tokenServiceEnv }) : new TokenServiceClient({ env: tokenServiceEnv, jwt: firebaseJwt })
  const resource: S3Resource = await client.getResource(resourceId) as S3Resource;
  console.log("get resource:", resource);

  const credentials = anonymous ? await client.getCredentials(resource.id, readWriteToken) : await client.getCredentials(resource.id);
  console.log("credentials:", credentials);

  // S3 configuration is based both on resource and credentials info.
  const { bucket, region } = resource;
  const { accessKeyId, secretAccessKey, sessionToken } = credentials;
  const s3 = new AWS.S3({ region, accessKeyId, secretAccessKey, sessionToken });
  const publicPath = client.getPublicS3Path(resource, filename);

  const result = await s3.upload({
    Bucket: bucket,
    Key: publicPath,
    Body: newFileContent,
    ContentType: "text/html",
    ContentEncoding: "UTF-8",
    CacheControl: "no-cache"
  }).promise();
  console.log(result);
};

export const getAllResources = async (firebaseJwt: string, amOwner: boolean, tokenServiceEnv: "dev" | "staging") => {
  const client = new TokenServiceClient({ jwt: firebaseJwt, env: tokenServiceEnv });
  const resources = await client.listResources({
    type: "s3Folder",
    tool: "example-app",
    amOwner: amOwner ? "true" : "false"
  });
  console.log(resources);
};