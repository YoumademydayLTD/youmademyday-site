// One error type for every expected failure, so handlers throw and the router answers with clear JSON.
export type ErrorCode = "bad_request" | "unauthorized" | "forbidden" | "not_found" | "too_many_requests" | "payload_too_large" | "upstream_error" | "internal";

const STATUS: Record<ErrorCode, number> = {
  bad_request: 400,
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  payload_too_large: 413,
  too_many_requests: 429,
  upstream_error: 502,
  internal: 500,
};

export class HttpError extends Error {
  readonly code: ErrorCode;
  constructor(code: ErrorCode, message: string) {
    super(message);
    this.code = code;
  }
  get status(): number { return STATUS[this.code]; }
}
