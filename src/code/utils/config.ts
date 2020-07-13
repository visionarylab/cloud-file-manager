export type EnvironmentNameType = "dev" | "staging" | "production"

export const getTokenServiceEnv = () =>  (process.env["TOKEN_SERVICE_ENV"] || "production") as EnvironmentNameType
export const DEFAULT_MAX_AGE_SECONDS = 60
export const TOKEN_SERVICE_TOOL_NAME = "cfm-shared"
export const TOKEN_SERVICE_TOOL_TYPE = "s3Folder"
export const S3_SHARED_DOC_PATH_LEGACY = "legacy-document-store"
