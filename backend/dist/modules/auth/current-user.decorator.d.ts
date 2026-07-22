import { User } from '../../entities/user.entity';
export interface RequestUser extends Pick<User, 'id' | 'username' | 'role' | 'fullName' | 'email'> {
    roles: string[];
    permissions: Set<string>;
}
export declare const CurrentUser: (...dataOrPipes: unknown[]) => ParameterDecorator;
