import { NextRequest } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { successResponse, errorResponse } from "@/lib/api-utils";

function generateSecurePassword(length = 16): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%";
  const bytes = crypto.randomBytes(length);
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

// GET /api/setup — One-time setup endpoint to seed database
// This will create default categories and admin user
// Protected by a setup key to prevent unauthorized access
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const setupKey = searchParams.get("key");

    // Simple protection - check setup key
    if (setupKey !== process.env.SETUP_KEY) {
      return errorResponse({ message: "Invalid setup key", statusCode: 403 });
    }

    // Check if already seeded
    const existingAdmin = await prisma.user.findFirst({
      where: { role: "SUPER_ADMIN" },
    });

    if (existingAdmin) {
      return successResponse({ message: "Database sudah di-setup sebelumnya", alreadySetup: true });
    }

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
      await prisma.category.upsert({
        where: { slug: cat.slug },
        update: {},
        create: cat,
      });
    }

    // Generate secure random passwords (never hardcoded)
    const adminPlain = generateSecurePassword();
    const editorPlain = generateSecurePassword();
    const journalistPlain = generateSecurePassword();

    // Create super admin
    const adminPassword = await bcrypt.hash(adminPlain, 12);
    const admin = await prisma.user.create({
      data: {
        email: "admin@jurnalishukumbandung.com",
        password: adminPassword,
        name: "Super Admin",
        role: "SUPER_ADMIN",
        bio: "Administrator Jurnalis Hukum Bandung",
      },
    });

    // Create editor
    const editorPassword = await bcrypt.hash(editorPlain, 12);
    const editor = await prisma.user.create({
      data: {
        email: "editor@jurnalishukumbandung.com",
        password: editorPassword,
        name: "Editor Kepala",
        role: "CHIEF_EDITOR",
        bio: "Editor Kepala Jurnalis Hukum Bandung",
      },
    });

    // Create demo journalist
    const journalistPassword = await bcrypt.hash(journalistPlain, 12);
    const journalist = await prisma.user.create({
      data: {
        email: "jurnalis@jurnalishukumbandung.com",
        password: journalistPassword,
        name: "Ahmad Fauzi",
        role: "SENIOR_JOURNALIST",
        bio: "Jurnalis hukum senior dengan pengalaman 10 tahun meliput berita hukum di wilayah Bandung.",
        specialization: "Hukum Tata Negara",
      },
    });

    // Create sample article
    const hukumTataNegara = await prisma.category.findUnique({
      where: { slug: "hukum-tata-negara" },
    });

    if (hukumTataNegara) {
      await prisma.article.create({
        data: {
          title: "Mahkamah Konstitusi Putuskan Uji Materi UU Cipta Kerja di Bandung",
          slug: "mk-putuskan-uji-materi-uu-cipta-kerja",
          content: `<p>BANDUNG - Mahkamah Konstitusi Republik Indonesia telah memutuskan hasil uji materi terhadap beberapa pasal dalam Undang-Undang Cipta Kerja yang diajukan oleh serikat pekerja di Bandung.</p><h2>Latar Belakang Gugatan</h2><p>Gugatan ini diajukan oleh Konfederasi Serikat Pekerja Bandung (KSPB) yang mewakili lebih dari 50.000 pekerja di wilayah Bandung Raya.</p><blockquote>"Kami mengajukan gugatan ini demi melindungi hak-hak fundamental pekerja yang dijamin oleh konstitusi," ujar Ketua KSPB, Ahmad Fauzi.</blockquote><h2>Isi Putusan MK</h2><p>Dalam putusannya, MK memutuskan bahwa tiga dari lima pasal yang digugat dinyatakan bertentangan dengan UUD 1945.</p>`,
          excerpt: "Mahkamah Konstitusi RI memutuskan hasil uji materi terhadap beberapa pasal dalam UU Cipta Kerja yang diajukan oleh serikat pekerja di Bandung.",
          status: "PUBLISHED",
          verificationLabel: "VERIFIED",
          readTime: 5,
          viewCount: 0,
          publishedAt: new Date(),
          authorId: journalist.id,
          categoryId: hukumTataNegara.id,
          seoTitle: "MK Putuskan Uji Materi UU Cipta Kerja di Bandung",
          seoDescription: "Hasil putusan MK terhadap uji materi UU Cipta Kerja dari serikat pekerja Bandung.",
          sources: {
            create: [
              { name: "Ahmad Fauzi", title: "Ketua KSPB", institution: "Konfederasi Serikat Pekerja Bandung" },
            ],
          },
        },
      });
    }

    return successResponse({
      message: "Setup berhasil! Database telah di-seed.",
      users: {
        admin: { email: admin.email, password: adminPlain },
        editor: { email: editor.email, password: editorPlain },
        journalist: { email: journalist.email, password: journalistPlain },
      },
      categories: categories.length,
      warning: "SIMPAN PASSWORD DI ATAS SEKARANG! Password hanya ditampilkan sekali dan tidak tersimpan di source code. SEGERA GANTI setelah login pertama kali!",
    });
  } catch (error) {
    return errorResponse(error);
  }
}
