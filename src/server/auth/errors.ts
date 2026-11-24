import "server-only";

/**
 * Domain errors (01-conventions § Server patterns). The `action()` wrapper turns
 * these into an `ActionResult`; anything else becomes a generic failure.
 */
export type AppErrorCode = "UNAUTHENTICATED" | "FORBIDDEN" | "NOT_FOUND" | "CONFLICT" | "INVALID";

export class AppError extends Error {
  readonly code: AppErrorCode;

  constructor(code: AppErrorCode, message: string) {
    super(message);
    this.name = "AppError";
    this.code = code;
  }
}
