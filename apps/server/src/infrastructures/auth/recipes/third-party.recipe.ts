import { ConfigService } from '@nestjs/config';
import ThirdParty from 'supertokens-node/recipe/thirdparty';
import { CommandBus } from '@nestjs/cqrs';
import { CreateUserCommand } from '@/application/user/commands/create-user.command';
import { deleteUser } from 'supertokens-node';
import { Result } from '@/shared/result';
import { User } from '@/domain/user/user.entity';
import { CreateProfileCommand } from '@/application/profile/commands/create-profile.command';
import { DeleteUserCommand } from '@/application/user/commands/delete-user.command';
import { CreateUserGhTokenCommand } from '@/application/github/commands/create-user-gh-token.command';
import { UpdateUserGhTokenCommand } from '@/application/github/commands/update-user-gh-token.command';

interface GithubUserInfo {
  user: {
    login: string;
    id: number;
    name: string | null;
    avatar_url: string;
    bio: string | null;
    location: string | null;
    company: string | null;
    html_url: string;
    twitter_username: string | null;
    blog: string | null;
  };
}

export const thirdPartyRecipe = ({
  configService,
  commandBus,
}: {
  configService: ConfigService;
  commandBus: CommandBus;
}) => {
  return ThirdParty.init({
    signInAndUpFeature: {
      providers: [
        {
          config: {
            thirdPartyId: 'github',
            clients: [
              {
                scope: [
                  'read:user',
                  'user:email',
                  'repo',
                  'write:repo_hook',
                  'admin:repo_hook',
                ],
                clientId: configService.get('GITHUB_CLIENT_ID') as string,
                clientSecret: configService.get(
                  'GITHUB_CLIENT_SECRET',
                ) as string,
              },
            ],
          },
        },
      ],
    },
    override: {
      functions: (originalImplementation) => {
        return {
          ...originalImplementation,
          signInUp: async (input) => {
            const response = await originalImplementation.signInUp(input);

            if (response.status === 'OK') {
              const githubUserInfo = response.rawUserInfoFromProvider
                .fromUserInfoAPI as GithubUserInfo | undefined;

              if (!githubUserInfo?.user) {
                if (response.createdNewRecipeUser) {
                  await deleteUser(response.user.id);
                }
                throw new Error(
                  'Failed to retrieve user information from GitHub.',
                );
              }
              const { user: githubUser } = githubUserInfo;
              const { id, emails } = response.user;
              if (response.createdNewRecipeUser) {
                try {
                  const createUserCommand = new CreateUserCommand(
                    id,
                    githubUser.login,
                    emails[0],
                  );

                  const socialLinksData: { type: string; url: string }[] = [];
                  if (githubUser.html_url) {
                    socialLinksData.push({
                      type: 'github',
                      url: githubUser.html_url,
                    });
                  }
                  if (githubUser.twitter_username) {
                    socialLinksData.push({
                      type: 'twitter',
                      url: `https://x.com/${githubUser.twitter_username}`,
                    });
                  }
                  if (githubUser.blog) {
                    socialLinksData.push({
                      type: 'website',
                      url: githubUser.blog,
                    });
                  }

                  const createProfileCommand = new CreateProfileCommand({
                    userId: id,
                    name: githubUser.name || githubUser.login,
                    avatarUrl: githubUser.avatar_url,
                    bio: githubUser.bio ?? '',
                    location: githubUser.location ?? '',
                    company: githubUser.company ?? '',
                    socialLinks: socialLinksData,
                    experiences: [],
                  });

                  const newUserResult: Result<User> =
                    await commandBus.execute(createUserCommand);
                  if (!newUserResult.success) {
                    console.log({ newUserResult });
                    await commandBus.execute(new DeleteUserCommand(id));

                    await deleteUser(id);
                    throw new Error('Failed to create user');
                  }

                  const newProfileResult: Result<any> =
                    await commandBus.execute(createProfileCommand);
                  if (!newProfileResult.success) {
                    await commandBus.execute(new DeleteUserCommand(id));
                    await deleteUser(id);
                    throw new Error(
                      `Failed to create profile: ${newProfileResult.error}`,
                    );
                  }

                  const accessToken = response?.oAuthTokens
                    .access_token as string;
                  if (typeof accessToken !== 'string') {
                    throw new Error('Invalid GitHub access token received');
                  }

                  const createUserGhTokenCommand = new CreateUserGhTokenCommand(
                    id,
                    String(githubUser.id),
                    accessToken,
                  );
                  await commandBus.execute(createUserGhTokenCommand);
                } catch (error) {
                  console.error('Error during sign up process:', error);
                  await deleteUser(id);
                }
              } else {
                const accessToken = response?.oAuthTokens
                  .access_token as string;
                if (typeof accessToken === 'string') {
                  const saveUserGhTokenCommand = new UpdateUserGhTokenCommand(
                    id,
                    String(githubUser.id),
                    accessToken,
                  );

                  await commandBus.execute(saveUserGhTokenCommand);
                }
              }
            }
            return response;
          },
        };
      },
    },
  });
};
