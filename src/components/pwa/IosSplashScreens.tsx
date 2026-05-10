import splashManifest from "../../../public/splash/manifest.json";

type SplashEntry = {
  width: number;
  height: number;
  orientation: "portrait" | "landscape";
  href: string;
  media: string;
};

const entries = splashManifest as SplashEntry[];

export default function IosSplashScreens() {
  return (
    <>
      {entries.map((s) => (
        <link
          key={`${s.width}x${s.height}`}
          rel="apple-touch-startup-image"
          href={s.href}
          media={s.media}
        />
      ))}
    </>
  );
}
