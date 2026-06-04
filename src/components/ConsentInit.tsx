/**
 * Consent Mode v2 — default state.
 *
 * WAJIB termuat SEBELUM script Google mana pun (AdSense/GA), jadi dirender sebagai
 * <script> inline di <head>. Dulu blok ini ada di dalam GoogleAnalytics, tapi komponen
 * itu return null saat NEXT_PUBLIC_GA_ID kosong — akibatnya consent default ikut hilang
 * dan AdSense jalan tanpa consent sama sekali. Dipisah agar selalu aktif.
 *
 * Default: semua denied (UU PDP / GDPR). CookieConsent men-trigger consent 'update' saat
 * user setuju; di sini kita juga langsung re-grant kalau pilihan tersimpan, supaya iklan
 * personalized aktif pada repeat-visit sebelum React hydrate.
 */
export default function ConsentInit() {
  return (
    <script
      id="consent-init"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{
        __html: `
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = window.gtag || gtag;
          gtag('consent', 'default', {
            ad_storage: 'denied',
            ad_user_data: 'denied',
            ad_personalization: 'denied',
            analytics_storage: 'denied',
            wait_for_update: 500
          });
          try {
            if (localStorage.getItem('jhb-consent') === 'granted') {
              gtag('consent', 'update', {
                ad_storage: 'granted',
                ad_user_data: 'granted',
                ad_personalization: 'granted',
                analytics_storage: 'granted'
              });
            }
          } catch (e) {}
        `,
      }}
    />
  );
}
