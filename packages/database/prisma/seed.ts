import { PrismaClient, UserRole } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const email = process.env.ADMIN_EMAIL ?? 'admin@confirmasus.local';
  const password = process.env.ADMIN_PASSWORD;

  if (!password) {
    throw new Error('Defina ADMIN_PASSWORD para criar o administrador inicial');
  }

  await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      name: 'Administrador',
      email,
      passwordHash: await hash(password, 12),
      role: UserRole.ADMIN,
    },
  });

  console.info(`Administrador inicial disponível em ${email}`);
}

main()
  .finally(async () => prisma.$disconnect())
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'Falha ao executar seed');
    process.exitCode = 1;
  });

