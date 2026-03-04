/**
 * RIPA – Référence des logos et icônes (assets/images/logopng)
 *
 * Utilisation selon le fond :
 * - Logo/icon 1 : fond BLANC, couleur #270345 (priorité 1)
 * - Logo/icon 2 : fond BLANC, couleurs #A59AF7 (priorité 2)
 * - Logo/icon 3 : fond #270345 ou #A59AF7, logo BLANC (splash, écrans sombres)
 * - Logo/icon 4 : fond BLANC, logo NOIR
 */

export const logos = {
  /** Fond blanc, couleur primaire #270345 – à prioriser */
  onWhitePrimary: require('../../assets/images/logopng/logo1.png'),
  iconOnWhitePrimary: require('../../assets/images/logopng/logoicon1.png'),
  /** Fond blanc, couleur secondaire #A59AF7 */
  onWhiteSecondary: require('../../assets/images/logopng/logo2.png'),
  iconOnWhiteSecondary: require('../../assets/images/logopng/logoicon2.png'),
  /** Fond #270345 ou #A59AF7, logo blanc */
  onDark: require('../../assets/images/logopng/logo3.png'),
  iconOnDark: require('../../assets/images/logopng/logoicon3.png'),
  /** Fond blanc, logo noir */
  onWhiteBlack: require('../../assets/images/logopng/logo4.png'),
  iconOnWhiteBlack: require('../../assets/images/logopng/logoicon4.png'),
};

/** Image splash si utilisée */
export const splashImage = require('../../assets/images/logopng/logo_ripa_splash_screen_android.png');

/** Image de fond pour l’écran de bienvenue (WelcomeScreen) – assets/images/ripawelcomescreen.png */
export const welcomeBackground = require('../../assets/images/ripawelcomescreen.png');

export default logos;
