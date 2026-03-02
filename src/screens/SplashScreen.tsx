import React, { useEffect } from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  withTiming,
  runOnJS
} from "react-native-reanimated";
import { useAppStore } from "../state/appStore";

interface SplashScreenProps {
  onComplete: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const logoScale = useSharedValue(0);
  const logoOpacity = useSharedValue(0);
  const textOpacity = useSharedValue(0);

  useEffect(() => {
    // Animate logo appearance
    logoScale.value = withSpring(1, { damping: 8 });
    logoOpacity.value = withTiming(1, { duration: 800 });
    
    // Animate text after logo
    setTimeout(() => {
      textOpacity.value = withTiming(1, { duration: 600 });
    }, 500);
    
    // Navigate after animation completes (5 seconds)
    setTimeout(() => {
      runOnJS(onComplete)();
    }, 5000);
  }, []);

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
    opacity: logoOpacity.value,
  }));

  const textAnimatedStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  return (
    <LinearGradient
      colors={["#facc15", "#16a34a"]} // Yellow to green gradient
      style={StyleSheet.absoluteFillObject}
    >
      <View style={styles.container}>
        <View style={styles.content}>
          {/* Actual GROLOTTO Logo with transparent background */}
          <Animated.View style={[styles.logoContainer, logoAnimatedStyle]}>
            <Image 
              source={require('../../assets/assets/grolotto-logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </Animated.View>

          {/* Animated tagline */}
          <Animated.View style={textAnimatedStyle}>
            <Text style={styles.tagline}>
              The Premier Haitian Lottery Platform
            </Text>
            <Text style={styles.subtagline}>
              Platfòm Premye Loto Ayisyen an
            </Text>
          </Animated.View>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 60,
  },
  logoImage: {
    width: 350,
    height: 200,
  },
  tagline: {
    fontSize: 18,
    fontWeight: "600",
    color: "white",
    textAlign: "center",
    marginBottom: 8,
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  subtagline: {
    fontSize: 16,
    fontWeight: "500",
    color: "#fbbf24",
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});