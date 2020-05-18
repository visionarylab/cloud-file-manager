import ClientOAuth2 from "client-oauth2";
import { TokenServiceClient, S3Resource } from "@concord-consortium/token-service";
import * as AWS from "aws-sdk";
import {
  PORTAL_AUTH_PATH,
  DEFAULT_MAX_AGE_SECONDS,
  getTokenServiceEnv,
  TOKEN_SERVICE_TOOL_NAME,
  TOKEN_SERVICE_TOOL_TYPE,
  S3_SHARED_DOC_PATH_LEGACY,
  S3_SHARED_DOC_PATH_NEW
} from './config'

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
  maxAge?: number;
}

export const createFile = async ({ filename, fileContent, firebaseJwt, maxAge=DEFAULT_MAX_AGE_SECONDS }: ICreateFile) => {
  // This function optionally accepts firebaseJWT. There are three things that depend on authentication method:
  // - TokenServiceClient constructor arguments. If user should be authenticated during every call to the API, provide `jwt` param.
  // - createResource call. If user is not authenticated, "readWriteToken" accessRule type must be used. Token Service will generate and return readWriteToken.
  // - getCredentials call. If user is not authenticated, readWriteToken needs to be provided instead.
  const anonymous = !firebaseJwt;

  const client = anonymous
    ? new TokenServiceClient({ env: getTokenServiceEnv() })
    : new TokenServiceClient({ env: getTokenServiceEnv(), jwt: firebaseJwt })
  const resource: S3Resource = await client.createResource({
    tool: TOKEN_SERVICE_TOOL_NAME,
    type: TOKEN_SERVICE_TOOL_TYPE,
    name: filename,
    description: "Document created by CFM",
    accessRuleType: anonymous ? "readWriteToken" : "user"
  }) as S3Resource;

  // Note that if your file ever needs to get updated, this token MUST BE (SECURELY) SAVED.
  let readWriteToken = "";
  if (anonymous) {
    readWriteToken = client.getReadWriteToken(resource) || "";
  }

  const credentials = anonymous
    ? await client.getCredentials(resource.id, readWriteToken)
    : await client.getCredentials(resource.id);


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
    CacheControl: `max-age=${maxAge}`
    // TODO IMPORTANT: Set the `max-age` parameter here
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
  maxAge?: number;
}
export const updateFile = async ({
  filename, newFileContent, resourceId, firebaseJwt, readWriteToken, maxAge=DEFAULT_MAX_AGE_SECONDS}: IUpdateFileArgs) => {
  // This function accepts either firebaseJWT or readWriteToken. There are only two things that depend on authentication method:
  // - TokenServiceClient constructor arguments. If user should be authenticated during every call to the API, provide `jwt` param.
  // - getCredentials call. If user is not authenticated, readWriteToken needs to be provided instead.
  const anonymous = !firebaseJwt && readWriteToken;

  const client = anonymous
    ? new TokenServiceClient({ env: getTokenServiceEnv() })
    : new TokenServiceClient({ env: getTokenServiceEnv(), jwt: firebaseJwt })

  const resource: S3Resource = await client.getResource(resourceId) as S3Resource;
  const credentials = anonymous
    ? await client.getCredentials(resource.id, readWriteToken)
    : await client.getCredentials(resource.id);

  // S3 configuration is based both on resource and credentials info.
  const { bucket, region } = resource;
  const { accessKeyId, secretAccessKey, sessionToken } = credentials;
  const s3 = new AWS.S3({ region, accessKeyId, secretAccessKey, sessionToken });
  const publicPath = client.getPublicS3Path(resource, filename);
  const publicUrl = client.getPublicS3Url(resource, filename);
  const result = await s3.upload({
    Bucket: bucket,
    Key: publicPath,
    Body: newFileContent,
    ContentType: "text/html",
    ContentEncoding: "UTF-8",
    CacheControl: `max-age=${maxAge}`
  }).promise();
  return {
    result,
    bucket,
    publicPath,
    publicUrl
  }
};

const getBaseDocumentUrl = () => {
  const stagingBase = "https://token-service-files.concordqa.org"
  const productionBase = "https://models-resources.concord.org"
  const base = getTokenServiceEnv() === "production"
    ? productionBase
    : stagingBase
  return base
}

export const getModernUrl = (documentId: string, filename:string) => {
  const path = S3_SHARED_DOC_PATH_NEW
  return `${getBaseDocumentUrl()}/${path}/${documentId}/${filename}`
}

export const getLegacyUrl = (documentId: string) => {
  const path = S3_SHARED_DOC_PATH_LEGACY
  return `${getBaseDocumentUrl()}/${path}/${documentId}`
};

// When would we do this?
export const getAllResources = async (firebaseJwt: string, amOwner: boolean) => {
  const client = new TokenServiceClient({ jwt: firebaseJwt, env: getTokenServiceEnv() });
  const resources = await client.listResources({
    type: "s3Folder",
    tool: TOKEN_SERVICE_TOOL_NAME,
    amOwner: amOwner ? "true" : "false"
  });
  console.log(resources);
};