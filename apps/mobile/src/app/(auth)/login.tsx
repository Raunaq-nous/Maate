// ============================================
// MAATE — Login / Signup Screen
// Email/password + OTP + Google + Apple + Biometric
// ============================================

import React, { useState } from 'react';
import {
  KeyboardAvoidingView, Platform, Pressable, StyleSheet,
  Text, TextInput, View, ScrollView, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { Button, GlassCard } from '@/components/ui';
import { useAuthStore } from '@/store/authStore';

type AuthTab = 'login' | 'register';
type AuthMethod = 'email' | 'phone';

export default function LoginScreen() {
  const [tab, setTab] = useState<AuthTab>('login');
  const [method, setMethod] = useState<AuthMethod>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<'input' | 'otp' | 'forgot'>('input');
  const [loading, setLoading] = useState(false);

  const { loginWithPassword, register, sendOtp, loginWithOtp, loginWithOAuth, loginWithBiometric, forgotPassword, biometricSessionId } = useAuthStore();

  const handleEmailAuth = async () => {
    setLoading(true);
    try {
      if (tab === 'register') {
        await register(email, password, fullName);
      } else {
        await loginWithPassword(email, password);
      }
      router.replace('/(tabs)/home');
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Authentication failed');
    }
    setLoading(false);
  };

  const handleSendOtp = async () => {
    setLoading(true);
    try {
      await sendOtp(phone);
      setStep('otp');
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to send OTP');
    }
    setLoading(false);
  };

  const handleVerifyOtp = async () => {
    setLoading(true);
    try {
      await loginWithOtp(phone, otp);
      router.replace('/(tabs)/home');
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Invalid OTP');
    }
    setLoading(false);
  };

  const handleOAuth = async (provider: 'google' | 'apple') => {
    setLoading(true);
    try {
      // In production: use expo-auth-session to get idToken
      const idToken = 'mock-oauth-token';
      await loginWithOAuth(provider, idToken);
      router.replace('/(tabs)/home');
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || `${provider} sign-in failed`);
    }
    setLoading(false);
  };

  const handleBiometric = async () => {
    setLoading(true);
    try {
      await loginWithBiometric();
      router.replace('/(tabs)/home');
    } catch (e: any) {
      Alert.alert('Error', 'Biometric login failed');
    }
    setLoading(false);
  };

  const handleForgotPassword = async () => {
    if (!email) { Alert.alert('Error', 'Enter your email first'); return; }
    setLoading(true);
    try {
      await forgotPassword(email);
      Alert.alert('Success', 'If an account exists, a reset link has been sent.');
      setStep('input');
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed');
    }
    setLoading(false);
  };

  return (
    <View style={s.container}>
      <LinearGradient colors={[Colors.dark.bg, '#0F1629', Colors.dark.surface]} style={StyleSheet.absoluteFill} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.content}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
          {/* Brand */}
          <View style={s.brand}>
            <View style={s.logo}>
              <LinearGradient colors={Colors.gradients.primary as unknown as [string, string]} style={s.logoGrad} />
              <Ionicons name="leaf" size={32} color="#FFF" />
            </View>
            <Text style={s.brandName}>Maate</Text>
            <Text style={s.tagline}>Your AI Health Companion</Text>
          </View>

          <GlassCard variant="elevated" padding="xl" style={s.card}>
            {step === 'forgot' ? (
              <>
                <Pressable onPress={() => setStep('input')} style={s.backRow}>
                  <Ionicons name="chevron-back" size={20} color={Colors.primary[400]} />
                  <Text style={s.backText}>Back to login</Text>
                </Pressable>
                <Text style={s.cardTitle}>Reset Password</Text>
                <Text style={s.cardSub}>Enter your email to receive a reset link</Text>
                <TextInput style={s.input} placeholder="Email Address" placeholderTextColor={Colors.dark.textMuted}
                  keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
                <Button title="Send Reset Link" onPress={handleForgotPassword} size="lg" fullWidth loading={loading} disabled={!email.includes('@')} icon="mail" iconPosition="right" />
              </>
            ) : step === 'otp' ? (
              <>
                <Pressable onPress={() => setStep('input')} style={s.backRow}>
                  <Ionicons name="chevron-back" size={20} color={Colors.primary[400]} />
                  <Text style={s.backText}>Change number</Text>
                </Pressable>
                <Text style={s.cardTitle}>Verify OTP</Text>
                <Text style={s.cardSub}>Enter the 6-digit code sent to +91 {phone}</Text>
                <View style={s.otpRow}>
                  {[0,1,2,3,4,5].map((i) => (
                    <View key={i} style={[s.otpBox, otp.length === i && s.otpBoxActive]}>
                      <Text style={s.otpChar}>{otp[i] ?? ''}</Text>
                    </View>
                  ))}
                </View>
                <TextInput style={s.hiddenInput} keyboardType="number-pad" maxLength={6} value={otp} onChangeText={setOtp} autoFocus />
                <Button title="Verify & Sign In" onPress={handleVerifyOtp} size="lg" fullWidth loading={loading} disabled={otp.length < 6} icon="shield-checkmark" iconPosition="right" />
              </>
            ) : (
              <>
                {/* Login / Register Tabs */}
                <View style={s.tabs}>
                  <Pressable style={[s.tab, tab === 'login' && s.tabActive]} onPress={() => setTab('login')}>
                    <Text style={[s.tabText, tab === 'login' && s.tabTextActive]}>Sign In</Text>
                  </Pressable>
                  <Pressable style={[s.tab, tab === 'register' && s.tabActive]} onPress={() => setTab('register')}>
                    <Text style={[s.tabText, tab === 'register' && s.tabTextActive]}>Create Account</Text>
                  </Pressable>
                </View>

                {/* Method Switcher */}
                <View style={s.methodRow}>
                  <Pressable style={[s.methodChip, method === 'email' && s.methodActive]} onPress={() => setMethod('email')}>
                    <Ionicons name="mail" size={14} color={method === 'email' ? Colors.primary[400] : Colors.dark.textMuted} />
                    <Text style={[s.methodText, method === 'email' && s.methodTextActive]}>Email</Text>
                  </Pressable>
                  <Pressable style={[s.methodChip, method === 'phone' && s.methodActive]} onPress={() => setMethod('phone')}>
                    <Ionicons name="call" size={14} color={method === 'phone' ? Colors.primary[400] : Colors.dark.textMuted} />
                    <Text style={[s.methodText, method === 'phone' && s.methodTextActive]}>Phone</Text>
                  </Pressable>
                </View>

                {method === 'email' ? (
                  <>
                    {tab === 'register' && (
                      <TextInput style={s.input} placeholder="Full Name" placeholderTextColor={Colors.dark.textMuted}
                        value={fullName} onChangeText={setFullName} autoCapitalize="words" />
                    )}
                    <TextInput style={s.input} placeholder="Email Address" placeholderTextColor={Colors.dark.textMuted}
                      keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
                    <View style={s.passWrap}>
                      <TextInput style={[s.input, { flex: 1, marginBottom: 0 }]} placeholder="Password" placeholderTextColor={Colors.dark.textMuted}
                        secureTextEntry={!showPassword} value={password} onChangeText={setPassword} />
                      <Pressable style={s.eyeBtn} onPress={() => setShowPassword(!showPassword)}>
                        <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color={Colors.dark.textMuted} />
                      </Pressable>
                    </View>
                    {tab === 'login' && (
                      <Pressable onPress={() => setStep('forgot')} style={{ alignSelf: 'flex-end', marginBottom: 16 }}>
                        <Text style={s.forgotText}>Forgot Password?</Text>
                      </Pressable>
                    )}
                    <Button title={tab === 'register' ? 'Create Account' : 'Sign In'} onPress={handleEmailAuth}
                      size="lg" fullWidth loading={loading} disabled={!email.includes('@') || password.length < 8 || (tab === 'register' && fullName.length < 2)}
                      icon={tab === 'register' ? 'person-add' : 'log-in'} iconPosition="right" />
                  </>
                ) : (
                  <>
                    <View style={s.phoneRow}>
                      <View style={s.countryCode}><Text style={s.ccText}>+91</Text></View>
                      <TextInput style={[s.input, { flex: 1, marginBottom: 0 }]} placeholder="Mobile Number"
                        placeholderTextColor={Colors.dark.textMuted} keyboardType="phone-pad" maxLength={10}
                        value={phone} onChangeText={setPhone} />
                    </View>
                    <Button title="Send OTP" onPress={handleSendOtp} size="lg" fullWidth loading={loading}
                      disabled={phone.length < 10} icon="arrow-forward" iconPosition="right" style={{ marginTop: 16 }} />
                  </>
                )}

                {/* Divider */}
                <View style={s.dividerRow}>
                  <View style={s.dividerLine} />
                  <Text style={s.dividerText}>or continue with</Text>
                  <View style={s.dividerLine} />
                </View>

                {/* Social Buttons */}
                <View style={s.socialRow}>
                  <Pressable style={({ pressed }) => [s.socialBtn, { opacity: pressed ? 0.7 : 1 }]} onPress={() => handleOAuth('google')}>
                    <Ionicons name="logo-google" size={22} color="#DB4437" />
                    <Text style={s.socialText}>Google</Text>
                  </Pressable>
                  <Pressable style={({ pressed }) => [s.socialBtn, { opacity: pressed ? 0.7 : 1 }]} onPress={() => handleOAuth('apple')}>
                    <Ionicons name="logo-apple" size={22} color="#FFF" />
                    <Text style={s.socialText}>Apple</Text>
                  </Pressable>
                </View>

                {/* Biometric */}
                {biometricSessionId && (
                  <Pressable style={({ pressed }) => [s.bioBtn, { opacity: pressed ? 0.7 : 1 }]} onPress={handleBiometric}>
                    <Ionicons name="finger-print" size={24} color={Colors.primary[400]} />
                    <Text style={s.bioText}>Sign in with Biometrics</Text>
                  </Pressable>
                )}
              </>
            )}
          </GlassCard>

          <Text style={s.terms}>
            By continuing, you agree to our{' '}
            <Text style={s.termsLink}>Terms of Service</Text> and{' '}
            <Text style={s.termsLink}>Privacy Policy</Text>
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.bg },
  content: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: Spacing.xl, paddingVertical: 40 },
  brand: { alignItems: 'center', marginBottom: Spacing['2xl'] },
  logo: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  logoGrad: { ...StyleSheet.absoluteFillObject },
  brandName: { fontSize: Typography.sizes.title1, fontWeight: Typography.weights.heavy, color: Colors.dark.text, marginTop: 8, letterSpacing: -0.5 },
  tagline: { fontSize: Typography.sizes.body, color: Colors.dark.textSecondary, marginTop: 4 },
  card: { marginBottom: Spacing.lg },
  cardTitle: { fontSize: Typography.sizes.title2, fontWeight: Typography.weights.bold, color: Colors.dark.text, marginBottom: 4 },
  cardSub: { fontSize: Typography.sizes.body, color: Colors.dark.textSecondary, marginBottom: Spacing.lg, lineHeight: 22 },
  tabs: { flexDirection: 'row', backgroundColor: Colors.dark.bg, borderRadius: BorderRadius.md, padding: 4, marginBottom: Spacing.base },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 8 },
  tabActive: { backgroundColor: Colors.dark.surfaceElevated },
  tabText: { fontSize: 14, fontWeight: '600' as const, color: Colors.dark.textMuted },
  tabTextActive: { color: Colors.primary[400] },
  methodRow: { flexDirection: 'row', gap: 8, marginBottom: Spacing.base },
  methodChip: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, borderRadius: BorderRadius.full, backgroundColor: Colors.dark.bg, borderWidth: 1, borderColor: Colors.dark.border },
  methodActive: { borderColor: Colors.primary[500], backgroundColor: `${Colors.primary[500]}10` },
  methodText: { fontSize: 13, fontWeight: '600' as const, color: Colors.dark.textMuted },
  methodTextActive: { color: Colors.primary[400] },
  input: { backgroundColor: Colors.dark.bg, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.base, paddingVertical: 14, fontSize: 15, color: Colors.dark.text, borderWidth: 1, borderColor: Colors.dark.border, marginBottom: Spacing.md },
  passWrap: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
  eyeBtn: { position: 'absolute', right: 14, padding: 4 },
  forgotText: { fontSize: 13, color: Colors.primary[400], fontWeight: '500' as const },
  phoneRow: { flexDirection: 'row', gap: 8 },
  countryCode: { backgroundColor: Colors.dark.bg, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.base, justifyContent: 'center', borderWidth: 1, borderColor: Colors.dark.border },
  ccText: { color: Colors.dark.text, fontSize: 15, fontWeight: '500' as const },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: Spacing.lg },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.dark.border },
  dividerText: { marginHorizontal: Spacing.md, fontSize: 12, color: Colors.dark.textMuted },
  socialRow: { flexDirection: 'row', gap: Spacing.md },
  socialBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: BorderRadius.lg, backgroundColor: Colors.dark.bg, borderWidth: 1, borderColor: Colors.dark.border },
  socialText: { fontSize: 14, fontWeight: '600' as const, color: Colors.dark.text },
  bioBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: Spacing.base, paddingVertical: 14, borderRadius: BorderRadius.lg, backgroundColor: `${Colors.primary[500]}10`, borderWidth: 1, borderColor: `${Colors.primary[500]}30` },
  bioText: { fontSize: 14, fontWeight: '600' as const, color: Colors.primary[400] },
  backRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.base },
  backText: { color: Colors.primary[400], fontSize: 13, fontWeight: '500' as const, marginLeft: 4 },
  otpRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: Spacing.xl },
  otpBox: { width: 48, height: 56, borderRadius: BorderRadius.md, backgroundColor: Colors.dark.bg, borderWidth: 1, borderColor: Colors.dark.border, alignItems: 'center', justifyContent: 'center' },
  otpBoxActive: { borderColor: Colors.primary[500], borderWidth: 2 },
  otpChar: { fontSize: 22, fontWeight: '700' as const, color: Colors.dark.text },
  hiddenInput: { position: 'absolute', opacity: 0 },
  terms: { textAlign: 'center', fontSize: 11, color: Colors.dark.textMuted, lineHeight: 18, marginTop: 8 },
  termsLink: { color: Colors.primary[400] },
});
