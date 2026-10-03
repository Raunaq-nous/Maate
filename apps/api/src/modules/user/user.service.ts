import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/database/database.module';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    const { passwordHash: _, ...profile } = user;
    return { data: profile };
  }

  async update(id: string, data: UpdateUserDto | Record<string, any>) {
    const user = await this.prisma.user.update({ where: { id }, data: data as any });
    const { passwordHash: _, ...profile } = user;
    return { data: profile };
  }
}
