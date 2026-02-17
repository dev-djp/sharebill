import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  // 开发阶段简化登录：手机尾号后六位验证
  async login(loginDto: LoginDto) {
    const { phone, code } = loginDto;
    
    // 验证：必须是6位数字，且等于手机号后6位
    const phoneSuffix = phone.slice(-6);
    if (code !== phoneSuffix) {
      throw new UnauthorizedException('验证码错误');
    }
    
    // 查找或创建用户
    let user = await this.prisma.user.findUnique({
      where: { phone },
    });
    
    if (!user) {
      // 自动注册
      user = await this.prisma.user.create({
        data: {
          phone,
          nickname: `用户${phone.slice(-4)}`,
          password: await bcrypt.hash(code, 10), // 占位，实际不用密码
        },
      });
    }
    
    // 生成 JWT
    const payload = { sub: user.id, phone: user.phone };
    const token = this.jwtService.sign(payload);
    
    return {
      token,
      user: {
        id: user.id,
        phone: user.phone,
        nickname: user.nickname,
        avatarUrl: user.avatarUrl,
        defaultCurrency: user.defaultCurrency,
      },
    };
  }
  
  // 获取当前用户信息
  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        tags: true,
      },
    });
    
    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }
    
    return {
      id: user.id,
      phone: user.phone,
      nickname: user.nickname,
      avatarUrl: user.avatarUrl,
      defaultCurrency: user.defaultCurrency,
      tags: user.tags,
    };
  }
}
