import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  // PROVISOIRE, et volontairement aligné sur ce qui est réellement installé
  // (décision Patrick, 15/09/2026 : le pilote se fait par APK posé à la main,
  // la publication Play Store viendra après la validation terrain — le nom
  // définitif se tranchera à ce moment-là).
  //
  // Cette ligne disait 'ci.julaba.app' alors que TOUT le reste du projet dit
  // 'com.julaba.app' : applicationId et namespace (android/app/build.gradle),
  // le paquet Kotlin/Java (MainActivity, SherpaSttPlugin), package_name et
  // custom_url_scheme (res/values/strings.xml). Une seule ligne contre sept.
  // Tant qu'android/ existe, c'est build.gradle qui décide du paquet installé,
  // donc la contradiction restait invisible — jusqu'à une regénération du
  // projet Android, qui aurait posé une SECONDE application sur le téléphone
  // d'une marchande, avec ses propres données et sa propre caisse, et cassé
  // au passage les liens profonds (custom_url_scheme). Pendant un pilote de
  // deux semaines avec de l'argent réel, c'est inacceptable.
  appId: 'com.julaba.app',
  appName: 'julaba-app',
  // Vite construit dans ../frontend_src/vite.config.ts (build.outDir: "../frontend/dist")
  // → à la racine du dépôt (où vit android/), le web build est donc "frontend/dist",
  // PAS "frontend_src/dist" (qui n'est jamais peuplé). L'ancienne valeur portait de
  // plus une faute de syntaxe ("webDir=..." collé dans la chaîne) qui empêchait tout
  // sync Android de trouver les assets.
  webDir: 'frontend/dist',
};

export default config;
