import { createElement, useEffect, useRef, useState } from 'react'
import { Image } from 'expo-image'
import {
  ActivityIndicator,
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { API_BASE_URL } from '@/constants/api'
import { useAuth } from '@/context/auth-context'

type LoginStep = 'login' | 'mfa' | 'password'

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

export default function LoginScreen() {
  const router = useRouter()
  const { setToken } = useAuth()
  const { width } = useWindowDimensions()
  const isWide = width >= 760
  const [step, setStep] = useState<LoginStep>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [challenge, setChallenge] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const gaze = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return

    const followPointer = (event: PointerEvent) => {
      const nextGaze = {
        x: clamp((event.clientX / window.innerWidth - 0.5) * 2, -1, 1),
        y: clamp((event.clientY / window.innerHeight - 0.5) * 2, -1, 1),
      }

      Animated.spring(gaze, {
        toValue: nextGaze,
        speed: 18,
        bounciness: 3,
        useNativeDriver: false,
      }).start()
    }

    window.addEventListener('pointermove', followPointer, { passive: true })
    return () => window.removeEventListener('pointermove', followPointer)
  }, [gaze])

  const headX = gaze.x.interpolate({ inputRange: [-1, 1], outputRange: [-8, 8] })
  const headY = gaze.y.interpolate({ inputRange: [-1, 1], outputRange: [-4, 4] })
  const headTilt = gaze.x.interpolate({ inputRange: [-1, 1], outputRange: ['-4deg', '4deg'] })
  const eyeX = gaze.x.interpolate({ inputRange: [-1, 1], outputRange: [-5, 5] })
  const eyeY = gaze.y.interpolate({ inputRange: [-1, 1], outputRange: [-3, 3] })

  async function submit(path: string, data: object) {
    setBusy(true)
    setMessage('')
    try {
      const response = await fetch(API_BASE_URL + path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.message || 'Não foi possível concluir a solicitação.')
      }
      return result
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Falha de conexão.')
      return null
    } finally {
      setBusy(false)
    }
  }

  async function login() {
    const result = await submit('/auth/login', { email, password })
    if (result) {
      setChallenge(result.challenge)
      setStep('mfa')
      setMessage('Enviamos um código de 6 dígitos para seu e-mail.')
    }
  }

  async function verify() {
    const result = await submit('/auth/verify', { challenge, code })
    if (result?.token) {
      setToken(result.token)
      router.replace('/(tabs)')
    }
  }

  async function changePassword() {
    const result = await submit('/auth/password', {
      currentPassword: password,
      newPassword: code,
    })
    if (result) {
      setStep('login')
      setCode('')
      setPassword('')
      setMessage('Senha alterada. Faça login com sua nova senha.')
    }
  }

  const title =
    step === 'mfa'
      ? 'Confirme seu acesso'
      : step === 'password'
        ? 'Alterar senha'
        : 'Bem-vindo de volta'
  const subtitle =
    step === 'mfa'
      ? 'Digite o código enviado para ' + email
      : step === 'password'
        ? 'Defina uma nova senha para continuar usando sua conta.'
        : 'Acesse o painel de chamadas da escola bíblica.'

  return (
    <View style={styles.page}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={[styles.shell, isWide ? styles.shellWide : styles.shellNarrow]}>
          <View style={[styles.artPanel, isWide ? styles.artPanelWide : styles.artPanelNarrow]}>
            <View style={styles.brand}>
              <View style={styles.brandMark}>
                <Text style={styles.brandMarkText}>CD</Text>
              </View>
              <Text style={styles.brandName}>CHAMADA DISCIPULADO</Text>
            </View>

            <View style={[styles.artCopy, !isWide && styles.artCopyCompact]}>
              <Text style={styles.artTitle}>Caminhamos juntos.</Text>
              <Text style={styles.artSubtitle}>
                Cada encontro é uma oportunidade de crescer e cuidar uns dos outros.
              </Text>
            </View>

            <View
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              style={[styles.mascotStage, isWide ? styles.mascotStageWide : styles.mascotStageNarrow]}
            >
              {Platform.OS === 'web'
                ? createElement('video' as any, {
                    src: require('../assets/videos/login-mascot.mp4'),
                    autoPlay: true,
                    loop: true,
                    muted: true,
                    playsInline: true,
                    preload: 'auto',
                    'aria-hidden': true,
                    style: {
                      display: 'block',
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      backgroundColor: '#f4f6f2',
                    },
                  })
                : (
                  <Animated.View
                                  style={[
                                    styles.mascotMotion,
                                    { transform: [{ translateX: headX }, { translateY: headY }, { rotate: headTilt }] },
                                  ]}
                                >
                                  <Image
                                    source={require('../assets/images/login-mascot.webp')}
                                    style={styles.mascotImage}
                                    contentFit="contain"
                                  />
                                  <Animated.View
                                    style={[
                                      styles.eyeIris,
                                      styles.eyeLeft,
                                      { transform: [{ translateX: eyeX }, { translateY: eyeY }] },
                                    ]}
                                  >
                                    <View style={styles.pupil} />
                                    <View style={styles.eyeGlint} />
                                  </Animated.View>
                                  <Animated.View
                                    style={[
                                      styles.eyeIris,
                                      styles.eyeRight,
                                      { transform: [{ translateX: eyeX }, { translateY: eyeY }] },
                                    ]}
                                  >
                                    <View style={styles.pupil} />
                                    <View style={styles.eyeGlint} />
                                  </Animated.View>
                  </Animated.View>
                  )}
            </View>

            <View style={[styles.artFooter, !isWide && styles.artFooterCompact]}>
              <View style={styles.footerRule} />
              <Text style={styles.artFooterText}>QUE BOM TER VOCÊ POR AQUI</Text>
            </View>
          </View>

          <View style={[styles.formPanel, isWide ? styles.formPanelWide : styles.formPanelNarrow]}>
            <View style={styles.formContent}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.subtitle}>{subtitle}</Text>

              {step === 'login' && (
                <>
                  <Text style={styles.label}>E-mail</Text>
                  <TextInput
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    autoComplete="email"
                    keyboardType="email-address"
                    placeholder="seu@email.com"
                    placeholderTextColor="#737e75"
                    accessibilityLabel="E-mail"
                  />
                  <Text style={styles.label}>Senha</Text>
                  <TextInput
                    style={styles.input}
                    value={password}
                    onChangeText={setPassword}
                    autoComplete="current-password"
                    secureTextEntry
                    placeholder="Digite sua senha"
                    placeholderTextColor="#737e75"
                    accessibilityLabel="Senha"
                    onSubmitEditing={login}
                    returnKeyType="go"
                  />
                </>
              )}

              {step === 'mfa' && (
                <>
                  <Text style={styles.label}>Código de verificação</Text>
                  <TextInput
                    style={[styles.input, styles.codeInput]}
                    value={code}
                    onChangeText={setCode}
                    keyboardType="number-pad"
                    maxLength={6}
                    placeholder="000000"
                    placeholderTextColor="#8b958d"
                    accessibilityLabel="Código de verificação"
                  />
                </>
              )}

              {step === 'password' && (
                <>
                  <Text style={styles.label}>Senha atual</Text>
                  <TextInput
                    style={styles.input}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    placeholder="Digite sua senha atual"
                    placeholderTextColor="#737e75"
                    accessibilityLabel="Senha atual"
                  />
                  <Text style={styles.label}>Nova senha</Text>
                  <TextInput
                    style={styles.input}
                    value={code}
                    onChangeText={setCode}
                    secureTextEntry
                    placeholder="Mínimo de 8 caracteres"
                    placeholderTextColor="#737e75"
                    accessibilityLabel="Nova senha, mínimo de 8 caracteres"
                  />
                </>
              )}

              {!!message && (
                <View
                  accessibilityRole="alert"
                  style={[
                    styles.messageBox,
                    message.startsWith('Enviamos') || message.startsWith('Senha alterada')
                      ? styles.messageSuccess
                      : styles.messageError,
                  ]}
                >
                  <Text style={styles.message}>{message}</Text>
                </View>
              )}

              <Pressable
                style={({ pressed }) => [
                  styles.button,
                  pressed && !busy && styles.buttonPressed,
                  busy && styles.buttonBusy,
                ]}
                onPress={step === 'login' ? login : step === 'mfa' ? verify : changePassword}
                disabled={busy}
                accessibilityRole="button"
              >
                {busy ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={styles.buttonText}>
                      {step === 'login'
                        ? 'Entrar'
                        : step === 'mfa'
                          ? 'Confirmar código'
                          : 'Salvar nova senha'}
                    </Text>
                    <Ionicons name="arrow-forward" size={19} color="#fff" />
                  </>
                )}
              </Pressable>

              {step !== 'mfa' && (
                <Pressable
                  onPress={() => {
                    setStep(step === 'password' ? 'login' : 'password')
                    setCode('')
                    setMessage('')
                  }}
                  accessibilityRole="button"
                  style={styles.linkButton}
                >
                  <Text style={styles.link}>
                    {step === 'password' ? 'Voltar para o login' : 'Alterar senha'}
                  </Text>
                </Pressable>
              )}

              <View style={styles.formDivider} />
              <Text style={styles.formFootnote}>Acesse para continuar sua jornada.</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#f4f6f2',
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shell: {
    width: '100%',
    maxWidth: 1040,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e3e8df',
  },
  shellWide: {
    flexDirection: 'row',
    minHeight: 660,
  },
  shellNarrow: {
    flexDirection: 'column',
  },
  artPanel: {
    backgroundColor: '#f4f6f2',
    overflow: 'hidden',
    paddingHorizontal: 34,
    position: 'relative',
  },
  artPanelWide: {
    width: '48%',
    minHeight: 660,
    justifyContent: 'space-between',
    paddingTop: 30,
    paddingBottom: 26,
  },
  artPanelNarrow: {
    width: '100%',
    minHeight: 335,
    paddingTop: 20,
    paddingBottom: 8,
    paddingHorizontal: 22,
    alignItems: 'center',
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    zIndex: 2,
  },
  brandMark: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: '#446b48',
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandMarkText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  brandName: {
    color: '#446b48',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  artCopy: {
    marginTop: 24,
    alignSelf: 'stretch',
    zIndex: 2,
  },
  artCopyCompact: {
    display: 'none',
  },
  artTitle: {
    color: '#1f3024',
    fontSize: 29,
    lineHeight: 35,
    fontWeight: '700',
    letterSpacing: -0.6,
  },
  artSubtitle: {
    color: '#6b756c',
    fontSize: 14,
    lineHeight: 21,
    maxWidth: 315,
    marginTop: 8,
  },
  mascotStage: {
    alignSelf: 'center',
    marginTop: 6,
    zIndex: 1,
  },
  mascotStageWide: {
    width: 264,
    height: 470,
  },
  mascotStageNarrow: {
    width: 158,
    height: 281,
    marginTop: 0,
  },
  mascotMotion: {
    width: '100%',
    height: '100%',
  },
  mascotImage: {
    width: '100%',
    height: '100%',
  },
  eyeIris: {
    position: 'absolute',
    width: '8%',
    height: '8%',
    borderRadius: 50,
    backgroundColor: '#819361',
    borderWidth: 1,
    borderColor: '#526744',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  eyeLeft: {
    left: '40.5%',
    top: '28.2%',
  },
  eyeRight: {
    left: '56.0%',
    top: '28.2%',
  },
  pupil: {
    width: '48%',
    height: '60%',
    borderRadius: 50,
    backgroundColor: '#24382d',
  },
  eyeGlint: {
    position: 'absolute',
    top: '18%',
    left: '23%',
    width: '20%',
    height: '20%',
    borderRadius: 50,
    backgroundColor: '#fff',
  },
  artFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    zIndex: 2,
  },
  artFooterCompact: {
    display: 'none',
  },
  footerRule: {
    height: 1,
    width: 25,
    backgroundColor: '#597c55',
  },
  artFooterText: {
    color: '#597c55',
    fontSize: 9,
    letterSpacing: 1.3,
    fontWeight: '700',
  },
  formPanel: {
    backgroundColor: '#fff',
    justifyContent: 'center',
  },
  formPanelWide: {
    flex: 1,
    paddingHorizontal: 54,
    paddingVertical: 48,
  },
  formPanelNarrow: {
    width: '100%',
    paddingHorizontal: 25,
    paddingVertical: 28,
  },
  formContent: {
    width: '100%',
    maxWidth: 410,
    alignSelf: 'center',
  },
  title: {
    color: '#1f3024',
    fontSize: 29,
    lineHeight: 36,
    fontWeight: '700',
    letterSpacing: -0.6,
  },
  subtitle: {
    color: '#6b756c',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
    marginBottom: 17,
  },
  label: {
    color: '#38483b',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 7,
    marginTop: 14,
  },
  input: {
    height: 50,
    borderColor: '#dce2d9',
    borderWidth: 1,
    borderRadius: 11,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#24352b',
    backgroundColor: '#fff',
  },
  codeInput: {
    letterSpacing: 7,
    fontSize: 21,
    textAlign: 'center',
  },
  button: {
    minHeight: 50,
    backgroundColor: '#446b48',
    borderRadius: 11,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 11,
    marginTop: 22,
  },
  buttonPressed: {
    backgroundColor: '#36593b',
    transform: [{ scale: 0.99 }],
  },
  buttonBusy: {
    opacity: 0.75,
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  messageBox: {
    paddingHorizontal: 13,
    paddingVertical: 11,
    borderRadius: 10,
    marginTop: 15,
    borderWidth: 1,
  },
  messageSuccess: {
    backgroundColor: '#edf4eb',
    borderColor: '#d1dfce',
  },
  messageError: {
    backgroundColor: '#fff0ed',
    borderColor: '#f1d2cb',
  },
  message: {
    color: '#405a45',
    fontSize: 13,
    lineHeight: 19,
  },
  linkButton: {
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  link: {
    color: '#446b48',
    fontSize: 13,
    fontWeight: '700',
  },
  formDivider: {
    height: 1,
    backgroundColor: '#e3e8df',
    marginTop: 23,
    marginBottom: 13,
  },
  formFootnote: {
    color: '#6b756c',
    fontSize: 12,
    textAlign: 'center',
  },
})
