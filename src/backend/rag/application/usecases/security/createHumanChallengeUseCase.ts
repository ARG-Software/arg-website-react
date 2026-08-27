export class CreateHumanChallengeUseCase {
  constructor(private readonly humanVerification: { createChallenge(): Promise<unknown> }) {}

  execute(): Promise<unknown> {
    return this.humanVerification.createChallenge();
  }
}
