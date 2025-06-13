import { TechStackDto } from '@/presentation/project/dto/TechStackDto.request';

export class CreateTeamMemberCommand {
  constructor(
    public readonly userId: string,
    public readonly roleTitle: string,
    public readonly description: string,
    public readonly skillSet: TechStackDto[],
    public readonly isFilled: boolean,
  ) {}
}
