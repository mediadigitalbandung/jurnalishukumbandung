import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kebijakan Privasi",
  description: "Kebijakan privasi Jurnalis Hukum Bandung - Informasi mengenai pengumpulan, penggunaan, dan perlindungan data pengguna.",
};

export default function PrivasiPage() {
  return (
    <div className="container-main py-12">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-bold text-txt-primary">Kebijakan Privasi</h1>
        <div className="mt-2 h-1 w-16 bg-goto-green" />
        <p className="mt-4 text-sm text-txt-muted">
          Terakhir diperbarui: 1 Januari 2026
        </p>

        <div className="mt-8 space-y-8 font-serif text-[17px] leading-relaxed text-txt-secondary">
          <p>
            <strong>Jurnalis Hukum Bandung</strong> menghormati privasi pengunjung dan pengguna
            platform kami. Kebijakan privasi ini menjelaskan bagaimana kami mengumpulkan, menggunakan,
            dan melindungi informasi pribadi Anda saat mengakses situs kami.
          </p>

          {/* Pengumpulan Data */}
          <section>
            <h2 className="mb-3 border-l-[3px] border-goto-green pl-3 text-xl font-bold text-txt-primary">1. Pengumpulan Data</h2>
            <p>Kami dapat mengumpulkan informasi berikut dari pengguna:</p>
            <ul className="ml-6 mt-2 list-disc space-y-2">
              <li>
                <strong>Data identitas:</strong> Nama, alamat email, dan informasi profil saat Anda
                mendaftar akun atau mengirimkan komentar.
              </li>
              <li>
                <strong>Data teknis:</strong> Alamat IP, jenis browser, sistem operasi, waktu akses,
                dan halaman yang dikunjungi, yang dikumpulkan secara otomatis melalui server logs.
              </li>
              <li>
                <strong>Data interaksi:</strong> Informasi mengenai artikel yang Anda baca, komentar
                yang Anda kirimkan, dan laporan yang Anda ajukan.
              </li>
              <li>
                <strong>Data komunikasi:</strong> Pesan yang Anda kirimkan melalui formulir kontak
                atau email kepada redaksi.
              </li>
            </ul>
          </section>

          {/* Penggunaan Data */}
          <section>
            <h2 className="mb-3 border-l-[3px] border-goto-green pl-3 text-xl font-bold text-txt-primary">2. Penggunaan Data</h2>
            <p>Data yang kami kumpulkan digunakan untuk:</p>
            <ul className="ml-6 mt-2 list-disc space-y-2">
              <li>Menyediakan dan meningkatkan layanan platform berita kami.</li>
              <li>Memproses pendaftaran akun dan mengelola profil pengguna.</li>
              <li>Mengirimkan notifikasi terkait artikel, pembaruan, atau informasi penting lainnya.</li>
              <li>Menganalisis tren penggunaan untuk meningkatkan pengalaman pengguna.</li>
              <li>Menjaga keamanan platform dan mencegah penyalahgunaan.</li>
              <li>Memenuhi kewajiban hukum yang berlaku.</li>
            </ul>
          </section>

          {/* Cookies */}
          <section>
            <h2 className="mb-3 border-l-[3px] border-goto-green pl-3 text-xl font-bold text-txt-primary">3. Cookies</h2>
            <p>
              Situs kami menggunakan cookies dan teknologi serupa untuk meningkatkan pengalaman
              browsing Anda. Cookies yang kami gunakan meliputi:
            </p>
            <ul className="ml-6 mt-2 list-disc space-y-2">
              <li>
                <strong>Cookies esensial:</strong> Diperlukan agar situs berfungsi dengan baik,
                termasuk untuk autentikasi dan keamanan sesi.
              </li>
              <li>
                <strong>Cookies analitik:</strong> Membantu kami memahami bagaimana pengunjung
                berinteraksi dengan situs sehingga kami dapat meningkatkan layanan.
              </li>
              <li>
                <strong>Cookies preferensi:</strong> Menyimpan preferensi Anda seperti pengaturan
                tema tampilan (terang/gelap).
              </li>
            </ul>
            <p className="mt-3">
              Anda dapat mengatur atau menonaktifkan cookies melalui pengaturan browser Anda.
              Namun, menonaktifkan cookies tertentu dapat memengaruhi fungsionalitas situs.
            </p>
          </section>

          {/* Pihak Ketiga */}
          <section>
            <h2 className="mb-3 border-l-[3px] border-goto-green pl-3 text-xl font-bold text-txt-primary">4. Pihak Ketiga</h2>
            <p>
              Kami tidak menjual, memperdagangkan, atau memindahkan informasi pribadi Anda kepada
              pihak ketiga tanpa persetujuan Anda, kecuali dalam situasi berikut:
            </p>
            <ul className="ml-6 mt-2 list-disc space-y-2">
              <li>
                <strong>Penyedia layanan:</strong> Kami bekerja sama dengan penyedia layanan
                terpercaya (hosting, analitik, email) yang membantu operasional situs. Pihak-pihak
                ini terikat perjanjian kerahasiaan.
              </li>
              <li>
                <strong>Kewajiban hukum:</strong> Kami dapat mengungkapkan informasi jika diwajibkan
                oleh hukum, perintah pengadilan, atau permintaan resmi dari lembaga penegak hukum.
              </li>
              <li>
                <strong>Perlindungan hak:</strong> Jika diperlukan untuk melindungi hak, properti,
                atau keselamatan Jurnalis Hukum Bandung, pengguna, atau publik.
              </li>
            </ul>
          </section>

          {/* Keamanan Data */}
          <section>
            <h2 className="mb-3 border-l-[3px] border-goto-green pl-3 text-xl font-bold text-txt-primary">5. Keamanan Data</h2>
            <p>
              Kami menerapkan langkah-langkah keamanan teknis dan organisasional yang wajar untuk
              melindungi data pribadi Anda dari akses tidak sah, pengubahan, pengungkapan, atau
              perusakan. Langkah-langkah ini meliputi:
            </p>
            <ul className="ml-6 mt-2 list-disc space-y-2">
              <li>Enkripsi data saat transmisi menggunakan protokol HTTPS/TLS.</li>
              <li>Penyimpanan kata sandi menggunakan hashing yang aman.</li>
              <li>Pembatasan akses data hanya kepada personel yang berwenang.</li>
              <li>Audit keamanan dan pemantauan sistem secara berkala.</li>
            </ul>
            <p className="mt-3">
              Meskipun demikian, tidak ada metode transmisi data melalui internet yang sepenuhnya
              aman. Kami tidak dapat menjamin keamanan absolut atas data yang Anda kirimkan.
            </p>
          </section>

          {/* Hak Pengguna */}
          <section>
            <h2 className="mb-3 border-l-[3px] border-goto-green pl-3 text-xl font-bold text-txt-primary">6. Hak Pengguna</h2>
            <p>Sebagai pengguna, Anda memiliki hak untuk:</p>
            <ul className="ml-6 mt-2 list-disc space-y-2">
              <li>
                <strong>Mengakses data:</strong> Meminta salinan data pribadi yang kami simpan
                tentang Anda.
              </li>
              <li>
                <strong>Memperbaiki data:</strong> Meminta koreksi atas data pribadi yang tidak
                akurat atau tidak lengkap.
              </li>
              <li>
                <strong>Menghapus data:</strong> Meminta penghapusan data pribadi Anda, dengan
                ketentuan tertentu sesuai hukum yang berlaku.
              </li>
              <li>
                <strong>Menarik persetujuan:</strong> Menarik persetujuan atas pemrosesan data
                kapan saja, tanpa memengaruhi keabsahan pemrosesan sebelumnya.
              </li>
              <li>
                <strong>Mengajukan keberatan:</strong> Mengajukan keberatan atas pemrosesan data
                pribadi Anda untuk tujuan tertentu.
              </li>
            </ul>
            <p className="mt-3">
              Untuk menggunakan hak-hak di atas, silakan hubungi kami melalui informasi kontak
              yang tercantum di bawah.
            </p>
          </section>

          {/* Kontak */}
          <section>
            <h2 className="mb-3 border-l-[3px] border-goto-green pl-3 text-xl font-bold text-txt-primary">7. Kontak</h2>
            <p>
              Jika Anda memiliki pertanyaan, keluhan, atau permintaan terkait kebijakan privasi ini,
              silakan hubungi kami:
            </p>
            <div className="mt-4 rounded-[12px] bg-surface-secondary p-6">
              <div className="space-y-2 text-sm">
                <p><strong>Jurnalis Hukum Bandung</strong></p>
                <p><strong>Email:</strong> privasi@jurnalishukumbandung.com</p>
                <p><strong>Alamat:</strong> Bandung, Jawa Barat, Indonesia</p>
              </div>
            </div>
          </section>

          <p className="mt-8 text-sm text-txt-muted">
            Kami berhak memperbarui kebijakan privasi ini sewaktu-waktu. Perubahan akan diumumkan
            melalui halaman ini dengan memperbarui tanggal &quot;Terakhir diperbarui&quot; di atas.
            Kami menyarankan Anda untuk meninjau halaman ini secara berkala.
          </p>
        </div>
      </div>
    </div>
  );
}
