export type ErrorCode =
  | "AUTH_ERROR"
  | "CONFIG_ERROR"
  | "GRAPHQL_ERROR"
  | "HTTP_ERROR"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "UPLOAD_ERROR"
  | "UNKNOWN";

export class LinearError extends Error {
  constructor(
    message: string,
    public readonly code: ErrorCode = "UNKNOWN",
    public readonly help: string[] = [],
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "LinearError";
  }
}
