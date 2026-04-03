import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

const prisma = new PrismaClient();

function genId() {
  return randomBytes(12).toString("hex");
}

async function main() {
  // Create categories
  const categories = [
    { name: "Hukum Pidana", slug: "hukum-pidana", description: "Berita seputar hukum pidana", order: 1 },
    { name: "Hukum Perdata", slug: "hukum-perdata", description: "Berita seputar hukum perdata", order: 2 },
    { name: "Hukum Tata Negara", slug: "hukum-tata-negara", description: "Berita seputar hukum tata negara dan konstitusi", order: 3 },
    { name: "Hukum Bisnis", slug: "hukum-bisnis", description: "Berita seputar hukum bisnis dan korporasi", order: 4 },
    { name: "HAM", slug: "ham", description: "Berita seputar hak asasi manusia", order: 5 },
    { name: "Hukum Lingkungan", slug: "hukum-lingkungan", description: "Berita seputar hukum lingkungan", order: 6 },
    { name: "Ketenagakerjaan", slug: "ketenagakerjaan", description: "Berita seputar hukum ketenagakerjaan", order: 7 },
    { name: "Opini", slug: "opini", description: "Opini dan analisis hukum", order: 8 },
    { name: "Infografis", slug: "infografis", description: "Infografis hukum", order: 9 },
    { name: "Berita Bandung", slug: "berita-bandung", description: "Berita hukum daerah Bandung", order: 10 },
  ];

  for (const cat of categories) {
    await prisma.categories.upsert({
      where: { slug: cat.slug },
      update: {},
      create: { id: genId(), ...cat },
    });
  }

  // Create super admin
  const hashedPassword = await bcrypt.hash("Admin@2026!", 12);
  await prisma.users.upsert({
    where: { email: "admin@jurnalishukumbandung.com" },
    update: {},
    create: {
      id: genId(),
      email: "admin@jurnalishukumbandung.com",
      password: hashedPassword,
      name: "Super Admin",
      role: Role.SUPER_ADMIN,
      bio: "Administrator Jurnalis Hukum Bandung",
    },
  });

  // Create demo editor
  const editorPassword = await bcrypt.hash("Editor@2026!", 12);
  await prisma.users.upsert({
    where: { email: "editor@jurnalishukumbandung.com" },
    update: {},
    create: {
      id: genId(),
      email: "editor@jurnalishukumbandung.com",
      password: editorPassword,
      name: "Editor Kepala",
      role: Role.CHIEF_EDITOR,
      bio: "Editor Kepala Jurnalis Hukum Bandung",
    },
  });

  console.log("Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
