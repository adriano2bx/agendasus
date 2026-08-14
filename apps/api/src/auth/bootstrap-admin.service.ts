import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { prisma } from '@confirma/database';
import { hash } from 'bcryptjs';
import { environment } from '../environment.js';

/**
 * Keeps the first administrator entirely deployment-configured. This avoids a
 * seed command and makes credential rotation a normal EasyPanel redeploy.
 */
@Injectable()
export class BootstrapAdminService implements OnApplicationBootstrap {
  async onApplicationBootstrap(): Promise<void> {
    const config = environment();
    const email = config.ADMIN_EMAIL?.trim().toLowerCase();
    const password = config.ADMIN_PASSWORD;

    if (!email || !password) {
      if (config.NODE_ENV === 'production') {
        throw new Error(
          'ADMIN_EMAIL e ADMIN_PASSWORD devem ser configurados no ambiente de produção',
        );
      }
      return;
    }

    const passwordHash = await hash(password, 12);
    const existing = await prisma.user.findUnique({ where: { email } });
    await prisma.$transaction([
      prisma.user.updateMany({
        where: { email: { not: email }, role: 'ADMIN' },
        data: { role: 'OPERATOR' },
      }),
      prisma.user.upsert({
        where: { email },
        create: { name: config.ADMIN_NAME, email, passwordHash, role: 'ADMIN', active: true },
        update: {
          name: config.ADMIN_NAME,
          passwordHash,
          role: 'ADMIN',
          active: true,
          deletedAt: null,
        },
      }),
    ]);

    if (!existing) {
      await prisma.auditLog.create({
        data: { eventType: 'ADMIN_BOOTSTRAP_PROVISIONED', entityType: 'user' },
      });
    }
  }
}
