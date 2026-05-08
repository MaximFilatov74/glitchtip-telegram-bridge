export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 500,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class UnauthorizedError extends AppError {
  constructor() {
    super("Invalid or missing webhook token", 401);
    this.name = "UnauthorizedError";
  }
}

export class TelegramError extends AppError {
  constructor(
    message: string,
    public readonly status = 502,
  ) {
    super(message, status);
    this.name = "TelegramError";
  }
}
