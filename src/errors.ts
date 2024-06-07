export class RetryableError extends Error {}

export class ParseError extends RetryableError {}

export class TimeoutError extends Error {}
