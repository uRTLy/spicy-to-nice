export class FeedbackGenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FeedbackGenerationError";
  }
}
