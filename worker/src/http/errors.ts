// One error type for every expected failure, so handlers throw and the router answers with clear JSON.
export type ErrorCode =
  | "bad_request"
  | "unknown_item"
  | "kind_closed"
  | "origin_forbidden"
  | "unauthorized"
  | "login_required"
  | "not_entitled"
  | "conflict"
  | "not_found"
  | "payload_too_large"
  | "catalog_out_of_sync"
  | "payment_provider_error"
  | "internal";

const STATUS: Record<ErrorCode, number> = {
  bad_request: 400,
  unknown_item: 404,
  kind_closed: 403,
  origin_forbidden: 403,
  unauthorized: 401,
  login_required: 401,
  not_entitled: 403,
  conflict: 409,
  not_found: 404,
  payload_too_large: 413,
  catalog_out_of_sync: 500,
  payment_provider_error: 502,
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
