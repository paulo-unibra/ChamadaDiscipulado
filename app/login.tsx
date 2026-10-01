import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  Platform,
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
type Gaze = { x: number; y: number }

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
  const [gaze, setGaze] = useState<Gaze>({ x: 0, y: 0 })

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return

    const followPointer = (event: PointerEvent) => {
      setGaze({
        x: clamp((event.clientX / window.innerWidth - 0.5) * 2, -1, 1),
        y: clamp((event.clientY / window.innerHeight - 0.5) * 2, -1, 1),
      })
    }

    window.addEventListener('pointermove', followPointer, { passive: true })
    return () => window.removeEventListener('pointermove', followPointer)
  }, [])

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
        : 'Entre para acompanhar as chamadas da escola bíblica.'

  return (
    <View style={styles.page}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.shell, isWide ? styles.shellWide : styles.shellNarrow]}>
          <View style={[styles.artPanel, isWide ? styles.artPanelWide : styles.artPanelNarrow]}>
            <View style={styles.artTopline}>
              <View style={styles.brandMark}>
                <Text style={styles.brandMarkText}>CD</Text>
              </View>
              <Text style={styles.brandName}>CHAMADA DISCIPULADO</Text>
            </View>

            <View style={[styles.artCopy, !isWide && styles.artCopyCompact]}>
              <Text style={styles.artTitle}>Caminhamos juntos.</Text>
              <Text style={styles.artSubtitle}>
                Um espaço simples para cuidar de cada encontro e de cada pessoa.
              </Text>
            </View>

            <View
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              style={styles.mascotStage}
            >
              <View style={styles.mascotShadow} />
              <View style={styles.jacket}>
                <View style={styles.shirt} />
                <View style={styles.tie} />
              </View>
              <View style={styles.neck} />
              <View style={styles.earLeft} />
              <View style={styles.earRight} />
              <View style={styles.face}>
                <View style={styles.hair}>
                  <View style={styles.hairSweep} />
                  <View style={styles.hairHighlight} />
                </View>
                <View style={styles.browLeft} />
                <View style={styles.browRight} />
                <View style={styles.eyeLeft}>
                  <View
                    style={[
                      styles.pupil,
                      { transform: [{ translateX: gaze.x * 6 }, { translateY: gaze.y * 4 }] },
                    ]}
                  />
                  <View style={styles.eyeGlint} />
                </View>
                <View style={styles.eyeRight}>
                  <View
                    style={[
                      styles.pupil,
                      { transform: [{ translateX: gaze.x * 6 }, { translateY: gaze.y * 4 }] },
                    ]}
                  />
                  <View style={styles.eyeGlint} />
                </View>
                <View style={styles.glassesLeft} />
                <View style={styles.glassesRight} />
                <View style={styles.glassesBridge} />
                <View style={styles.nose} />
                <View style={styles.smile}>
                  <View style={styles.teeth} />
                </View>
                <View style={styles.cheekLeft} />
                <View style={styles.cheekRight} />
              </View>
              <View style={styles.mascotCaption}>
                <View style={styles.captionDot} />
                <Text style={styles.captionText}>Que bom ter você por aqui!</Text>
              </View>
            </View>

            <View style={styles.artFooter}>
              <View style={styles.footerRule} />
              <Text style={styles.artFooterText}>CADA ENCONTRO CONTA</Text>
            </View>
            <View style={styles.decorCircleLarge} />
            <View style={styles.decorCircleSmall} />
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
                    placeholderTextColor="#8b958d"
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
                    placeholderTextColor="#8b958d"
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
                    placeholderTextColor="#a0aaa2"
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
                    placeholderTextColor="#8b958d"
                    accessibilityLabel="Senha atual"
                  />
                  <Text style={styles.label}>Nova senha</Text>
                  <TextInput
                    style={styles.input}
                    value={code}
                    onChangeText={setCode}
                    secureTextEntry
                    placeholder="Mínimo de 8 caracteres"
                    placeholderTextColor="#8b958d"
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
                        ? 'Entrar na plataforma'
                        : step === 'mfa'
                          ? 'Confirmar código'
                          : 'Salvar nova senha'}
                    </Text>
                    <Ionicons name="arrow-forward" size={19} color="#e6cb8c" />
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
                    {step === 'password' ? 'Voltar para o login' : 'Precisa alterar sua senha?'}
                  </Text>
                </Pressable>
              )}

              <View style={styles.formDivider} />
              <Text style={styles.formFootnote}>Seu próximo encontro começa aqui.</Text>
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
    backgroundColor: '#10281f',
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
    maxWidth: 1080,
    borderRadius: 30,
    overflow: 'hidden',
    backgroundColor: '#fffdf8',
    shadowColor: '#071b14',
    shadowOpacity: 0.25,
    shadowRadius: 34,
    shadowOffset: { width: 0, height: 22 },
    elevation: 12,
  },
  shellWide: {
    flexDirection: 'row',
    minHeight: 650,
  },
  shellNarrow: {
    flexDirection: 'column',
  },
  artPanel: {
    backgroundColor: '#1b4937',
    overflow: 'hidden',
    paddingHorizontal: 38,
    position: 'relative',
  },
  artPanelWide: {
    width: '48%',
    minHeight: 650,
    justifyContent: 'space-between',
    paddingTop: 34,
    paddingBottom: 28,
  },
  artPanelNarrow: {
    width: '100%',
    minHeight: 310,
    paddingTop: 22,
    paddingBottom: 18,
    alignItems: 'center',
  },
  artTopline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    zIndex: 2,
  },
  brandMark: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#e6c789',
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandMarkText: {
    color: '#183d2e',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  brandName: {
    color: '#edf3e9',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.45,
  },
  artCopy: {
    marginTop: 28,
    alignSelf: 'stretch',
    zIndex: 2,
  },
  artCopyCompact: {
    display: 'none',
  },
  artTitle: {
    color: '#fffdf6',
    fontSize: 31,
    lineHeight: 37,
    fontWeight: '700',
    marginTop: 10,
    letterSpacing: -0.8,
  },
  artSubtitle: {
    color: '#c6d6ca',
    fontSize: 14,
    lineHeight: 21,
    maxWidth: 320,
    marginTop: 8,
  },
  mascotStage: {
    width: 270,
    height: 285,
    alignSelf: 'center',
    marginTop: 16,
    zIndex: 1,
  },
  mascotShadow: {
    position: 'absolute',
    width: 200,
    height: 20,
    bottom: 5,
    left: 35,
    borderRadius: 100,
    backgroundColor: 'rgba(7, 27, 20, 0.32)',
  },
  jacket: {
    position: 'absolute',
    width: 246,
    height: 115,
    bottom: 0,
    left: 12,
    borderTopLeftRadius: 92,
    borderTopRightRadius: 92,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    backgroundColor: '#273c35',
    overflow: 'hidden',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#567264',
  },
  shirt: {
    position: 'absolute',
    top: -2,
    left: 81,
    width: 84,
    height: 115,
    backgroundColor: '#f1eee2',
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },
  tie: {
    position: 'absolute',
    top: 0,
    width: 31,
    height: 102,
    backgroundColor: '#bb9255',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    transform: [{ rotate: '2deg' }],
  },
  neck: {
    position: 'absolute',
    width: 64,
    height: 64,
    left: 103,
    top: 171,
    backgroundColor: '#ca8058',
    borderRadius: 22,
    zIndex: 1,
  },
  earLeft: {
    position: 'absolute',
    left: 35,
    top: 113,
    width: 45,
    height: 54,
    borderRadius: 24,
    backgroundColor: '#c87c55',
  },
  earRight: {
    position: 'absolute',
    right: 35,
    top: 113,
    width: 45,
    height: 54,
    borderRadius: 24,
    backgroundColor: '#d58b63',
  },
  face: {
    position: 'absolute',
    width: 174,
    height: 190,
    left: 48,
    top: 38,
    borderRadius: 76,
    backgroundColor: '#e8a071',
    zIndex: 2,
    shadowColor: '#301d18',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 5 },
  },
  hair: {
    position: 'absolute',
    top: -10,
    left: -2,
    width: 178,
    height: 77,
    borderTopLeftRadius: 86,
    borderTopRightRadius: 92,
    borderBottomLeftRadius: 38,
    borderBottomRightRadius: 34,
    backgroundColor: '#3b2a22',
    transform: [{ rotate: '-2deg' }],
  },
  hairSweep: {
    position: 'absolute',
    top: 8,
    left: 24,
    width: 120,
    height: 34,
    borderRadius: 38,
    backgroundColor: '#51392d',
    transform: [{ rotate: '-9deg' }],
  },
  hairHighlight: {
    position: 'absolute',
    top: 11,
    left: 49,
    width: 77,
    height: 9,
    borderRadius: 8,
    backgroundColor: '#73503a',
    transform: [{ rotate: '-13deg' }],
  },
  browLeft: {
    position: 'absolute',
    left: 30,
    top: 65,
    width: 47,
    height: 8,
    borderRadius: 8,
    backgroundColor: '#493127',
    transform: [{ rotate: '-5deg' }],
    zIndex: 4,
  },
  browRight: {
    position: 'absolute',
    right: 29,
    top: 65,
    width: 47,
    height: 8,
    borderRadius: 8,
    backgroundColor: '#493127',
    transform: [{ rotate: '5deg' }],
    zIndex: 4,
  },
  eyeLeft: {
    position: 'absolute',
    left: 33,
    top: 83,
    width: 37,
    height: 31,
    borderRadius: 18,
    backgroundColor: '#fffdf7',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 4,
    overflow: 'hidden',
  },
  eyeRight: {
    position: 'absolute',
    right: 31,
    top: 83,
    width: 37,
    height: 31,
    borderRadius: 18,
    backgroundColor: '#fffdf7',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 4,
    overflow: 'hidden',
  },
  pupil: {
    width: 17,
    height: 19,
    borderRadius: 10,
    backgroundColor: '#263c35',
  },
  eyeGlint: {
    position: 'absolute',
    top: 7,
    left: 12,
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#fff',
    zIndex: 1,
  },
  glassesLeft: {
    position: 'absolute',
    left: 17,
    top: 74,
    width: 68,
    height: 51,
    borderRadius: 20,
    borderWidth: 6,
    borderColor: '#26342f',
    zIndex: 5,
  },
  glassesRight: {
    position: 'absolute',
    right: 16,
    top: 74,
    width: 68,
    height: 51,
    borderRadius: 20,
    borderWidth: 6,
    borderColor: '#26342f',
    zIndex: 5,
  },
  glassesBridge: {
    position: 'absolute',
    top: 91,
    left: 79,
    width: 16,
    height: 7,
    borderRadius: 5,
    backgroundColor: '#26342f',
    zIndex: 5,
  },
  nose: {
    position: 'absolute',
    top: 105,
    left: 77,
    width: 20,
    height: 22,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    backgroundColor: '#d98e64',
    zIndex: 4,
  },
  smile: {
    position: 'absolute',
    left: 52,
    top: 137,
    width: 70,
    height: 30,
    borderBottomLeftRadius: 34,
    borderBottomRightRadius: 34,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    backgroundColor: '#653b32',
    alignItems: 'center',
    overflow: 'hidden',
    zIndex: 4,
  },
  teeth: {
    width: 44,
    height: 8,
    borderBottomLeftRadius: 5,
    borderBottomRightRadius: 5,
    backgroundColor: '#fff8e8',
  },
  cheekLeft: {
    position: 'absolute',
    left: 16,
    top: 133,
    width: 22,
    height: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(207, 107, 90, 0.28)',
  },
  cheekRight: {
    position: 'absolute',
    right: 16,
    top: 133,
    width: 22,
    height: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(207, 107, 90, 0.28)',
  },
  mascotCaption: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 30,
    backgroundColor: '#2d5b46',
  },
  captionDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#e8ca85',
  },
  captionText: {
    color: '#f4f2e7',
    fontSize: 11,
    fontWeight: '600',
  },
  artFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    zIndex: 2,
  },
  footerRule: {
    height: 1,
    width: 25,
    backgroundColor: '#d6bd80',
  },
  artFooterText: {
    color: '#bdcfbf',
    fontSize: 9,
    letterSpacing: 1.6,
    fontWeight: '700',
  },
  decorCircleLarge: {
    position: 'absolute',
    width: 340,
    height: 340,
    borderRadius: 170,
    borderWidth: 1,
    borderColor: 'rgba(220, 237, 218, 0.08)',
    top: 150,
    left: -135,
  },
  decorCircleSmall: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 100,
    backgroundColor: 'rgba(219, 195, 135, 0.06)',
    bottom: -80,
    right: -72,
  },
  formPanel: {
    backgroundColor: '#fffdf8',
    justifyContent: 'center',
  },
  formPanelWide: {
    flex: 1,
    paddingHorizontal: 58,
    paddingVertical: 48,
  },
  formPanelNarrow: {
    width: '100%',
    paddingHorizontal: 25,
    paddingVertical: 32,
  },
  formContent: {
    width: '100%',
    maxWidth: 410,
    alignSelf: 'center',
  },
  title: {
    color: '#20382b',
    fontSize: 30,
    lineHeight: 37,
    fontWeight: '700',
    letterSpacing: -0.8,
    marginTop: 11,
  },
  subtitle: {
    color: '#6c786e',
    fontSize: 15,
    lineHeight: 23,
    marginTop: 8,
    marginBottom: 18,
  },
  label: {
    color: '#314a39',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 15,
  },
  input: {
    height: 52,
    borderColor: '#dce3da',
    borderWidth: 1,
    borderRadius: 13,
    paddingHorizontal: 15,
    fontSize: 15,
    color: '#22372a',
    backgroundColor: '#fffefa',
  },
  codeInput: {
    textAlign: 'center',
    letterSpacing: 9,
    fontSize: 22,
    fontWeight: '700',
  },
  button: {
    minHeight: 54,
    backgroundColor: '#315d43',
    borderRadius: 13,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 24,
    shadowColor: '#315d43',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  buttonPressed: {
    backgroundColor: '#264b36',
    transform: [{ scale: 0.99 }],
  },
  buttonBusy: {
    opacity: 0.75,
  },
  buttonText: {
    color: '#fffdf7',
    fontSize: 15,
    fontWeight: '700',
  },
  messageBox: {
    paddingHorizontal: 13,
    paddingVertical: 11,
    borderRadius: 11,
    marginTop: 16,
    borderWidth: 1,
  },
  messageSuccess: {
    backgroundColor: '#edf5ec',
    borderColor: '#cfe0cb',
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
    color: '#416b4c',
    fontSize: 13,
    fontWeight: '700',
  },
  formDivider: {
    height: 1,
    backgroundColor: '#e9ece5',
    marginTop: 25,
    marginBottom: 14,
  },
  formFootnote: {
    color: '#6f7b71',
    fontSize: 12,
    textAlign: 'center',
  },
})
