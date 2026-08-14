import { PrismaClient, UserRole } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const name = process.env.ADMIN_NAME?.trim() || 'Administrador';
  const email = (process.env.ADMIN_EMAIL ?? 'admin@confirmasus.local').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!password || password.length < 12) {
    throw new Error('Defina ADMIN_PASSWORD com ao menos 12 caracteres para criar o administrador');
  }

  const passwordHash = await hash(password, 12);
  await prisma.$transaction([
    prisma.user.updateMany({
      where: { email: { not: email }, role: UserRole.ADMIN },
      data: { role: UserRole.OPERATOR, active: false },
    }),
    prisma.user.upsert({
      where: { email },
      update: {
        name,
        passwordHash,
        role: UserRole.ADMIN,
        active: true,
        deletedAt: null,
      },
      create: {
        name,
        email,
        passwordHash,
        role: UserRole.ADMIN,
        active: true,
      },
    }),
  ]);

  console.info(`Administrador inicial disponível em ${email}`);
}

main()
  .finally(async () => prisma.$disconnect())
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'Falha ao executar seed');
    process.exitCode = 1;
  });
