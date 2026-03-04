/**
 * Écran de chargement au démarrage (splash RIPA)
 *
 * 1. Révélation du logo de gauche à droite (2 s) : overlay qui se retire.
 * 2. Bordure animée : visible uniquement quand le logo est entièrement apparu ;
 *    segment qui part du coin inférieur gauche, fait le tour du logo,
 *    la trace derrière disparaît lentement ; 2 cycles.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Image, StyleSheet, Animated, Dimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../constants/theme';
import { logos } from '../constants/assets';

const LOGO_WIDTH_RATIO = 0.7;
const MAX_LOGO_WIDTH = 280;
const REVEAL_DURATION_MS = 2000;
const BORDER_LOOP_DURATION_MS = 2400; // durée d’un tour complet de la bordure
const BORDER_LOOPS = 2;
const BORDER_INSET = 4;
const HEAD_LENGTH = 28;
const TAIL_LENGTH = 70;
const TAIL_OPACITY = 0.35;

function getLogoWidth() {
  const { width: w } = Dimensions.get('window');
  return Math.min(w * LOGO_WIDTH_RATIO, MAX_LOGO_WIDTH);
}

const AnimatedPath = Animated.createAnimatedComponent(Path);

/**
 * @param {() => void} [onComplete] - Callback appelé quand toute l’animation (révélation + 2 tours de bordure) est terminée
 */
export function LoaderScreen({ onComplete }) {
  const [logoWidth] = useState(getLogoWidth);
  const logoHeight = logoWidth / 2; // aspect ratio 2
  const reveal = useRef(new Animated.Value(0)).current;
  const borderProgress = useRef(new Animated.Value(0)).current; // 0 → 2 pour 2 tours

  const w = logoWidth - BORDER_INSET * 2;
  const h = logoHeight - BORDER_INSET * 2;
  const perimeter = 2 * (w + h);

  useEffect(() => {
    // 1) Révélation logo (2 s)
    const revealAnim = Animated.timing(reveal, {
      toValue: 1,
      duration: REVEAL_DURATION_MS,
      useNativeDriver: true,
    });

    // 2) Après la révélation, lancer la bordure (2 tours)
    const borderAnim = Animated.timing(borderProgress, {
      toValue: 2,
      duration: BORDER_LOOPS * BORDER_LOOP_DURATION_MS,
      useNativeDriver: true,
    });

    const seq = Animated.sequence([revealAnim, Animated.delay(100), borderAnim]);
    seq.start(({ finished }) => {
      if (finished && onComplete) onComplete();
    });
  }, [reveal, borderProgress, onComplete]);

  // Overlay qui se retire de gauche à droite (révélation logo)
  const overlayScaleX = reveal.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });
  const overlayTranslateX = reveal.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -logoWidth / 2],
  });

  // Bordure : tête au devant, trace (queue) derrière qui disparaît visuellement (opacity plus basse)
  const headOffset = borderProgress.interpolate({
    inputRange: [0, 1, 1.0001, 2],
    outputRange: [perimeter, 0, perimeter, 0],
  });
  const tailOffset = borderProgress.interpolate({
    inputRange: [0, 1, 1.0001, 2],
    outputRange: [perimeter + TAIL_LENGTH, TAIL_LENGTH, perimeter + TAIL_LENGTH, TAIL_LENGTH],
  });

  // Opacité de la bordure : 0 tant que le logo n’est pas complètement apparu, puis 1
  const borderWrapOpacity = reveal.interpolate({
    inputRange: [0, 0.999, 1],
    outputRange: [0, 0, 1],
  });

  // Rectangle : coin inférieur gauche → inférieur droit → supérieur droit → supérieur gauche → fermeture
  const pathD = `M ${BORDER_INSET} ${logoHeight - BORDER_INSET} L ${logoWidth - BORDER_INSET} ${logoHeight - BORDER_INSET} L ${logoWidth - BORDER_INSET} ${BORDER_INSET} L ${BORDER_INSET} ${BORDER_INSET} Z`;

  return (
    <View style={styles.container}>
      <View style={[styles.logoContainer, { width: logoWidth, height: logoHeight }]}>
        <View style={[styles.logoWrap, { width: logoWidth, height: logoHeight }]}>
          <Image
            source={logos.onDark}
            style={[styles.logo, { width: logoWidth, height: logoHeight }]}
            resizeMode="contain"
          />
        </View>

        <Animated.View
          style={[
            styles.overlay,
            { width: logoWidth, height: logoHeight },
            {
              transform: [
                { translateX: overlayTranslateX },
                { scaleX: overlayScaleX },
              ],
            },
          ]}
          pointerEvents="none"
        />

        {/* Bordure animée : visible seulement quand le logo est complètement apparu */}
        <Animated.View
          style={[
            styles.borderWrap,
            { width: logoWidth, height: logoHeight },
            { opacity: borderWrapOpacity },
          ]}
          pointerEvents="none"
        >
          <Svg width={logoWidth} height={logoHeight} style={StyleSheet.absoluteFill}>
            <AnimatedPath
              d={pathD}
              fill="none"
              stroke={colors.secondary}
              strokeWidth={2}
              strokeDasharray={`${TAIL_LENGTH} ${perimeter}`}
              strokeDashoffset={tailOffset}
              strokeLinecap="round"
              opacity={TAIL_OPACITY}
            />
            <AnimatedPath
              d={pathD}
              fill="none"
              stroke={colors.secondary}
              strokeWidth={2.5}
              strokeDasharray={`${HEAD_LENGTH} ${perimeter}`}
              strokeDashoffset={headOffset}
              strokeLinecap="round"
            />
          </Svg>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    width: '70%',
    maxWidth: MAX_LOGO_WIDTH,
    aspectRatio: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoWrap: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    backgroundColor: colors.primary,
  },
  borderWrap: {
    position: 'absolute',
    overflow: 'visible',
  },
});
