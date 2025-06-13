import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { Project } from '@/domain/project/project.entity';
import {
  PROJECT_REPOSITORY_PORT,
  ProjectRepositoryPort,
} from '@/application/project/ports/project.repository.port';
import { Result } from '@/shared/result';
import { IQuery } from '@nestjs/cqrs';
import { ProjectFilterInputsDto } from '@/application/dto/inputs/filter-project-input';

export class FindProjectByFiltersQuery implements IQuery {
  constructor(public readonly filters: ProjectFilterInputsDto) {}
}

@QueryHandler(FindProjectByFiltersQuery)
export class FindProjectByFiltersHandler
  implements IQueryHandler<FindProjectByFiltersQuery>
{
  constructor(
    @Inject(PROJECT_REPOSITORY_PORT)
    private readonly projectRepo: ProjectRepositoryPort,
  ) {}

  async execute(
    query: FindProjectByFiltersQuery,
  ): Promise<Result<Project[] | null>> {
    const projects = await this.projectRepo.findProjectByFilters(query.filters);
    if (projects.success) {
      return Result.ok(projects.value);
    }
    return Result.fail(projects.error);
  }
}
