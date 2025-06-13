export class ProjectResponseDto {
  id: string | null;
  title: string;
  description: string;
  link: string | null;
  ownerId: string;
  createdAt?: Date;
  updatedAt?: Date;
  techStacks: { id: string }[];
  projectMembers: { userId: string }[];
  projectRoles: object[];
}
