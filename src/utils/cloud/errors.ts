export class ProvisioningError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown
  ) {
    super(message);
    this.name = 'ProvisioningError';
  }
}
