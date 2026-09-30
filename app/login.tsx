import { useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { useRouter } from 'expo-router'
import { API_BASE_URL } from '@/constants/api'
import { useAuth } from '@/context/auth-context'

export default function LoginScreen() {
  const router = useRouter()
  const { setToken } = useAuth()
  const [step, setStep] = useState<'login' | 'mfa' | 'password'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [challenge, setChallenge] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit(path: string, data: object) {
    setBusy(true); setMessage('')
    try {
      const response = await fetch(`${API_BASE_URL}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message || 'Não foi possível concluir a solicitação.')
      return result
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Falha de conexão.'); return null }
    finally { setBusy(false) }
  }
  async function login() {
    const result = await submit('/auth/login', { email, password })
    if (result) { setChallenge(result.challenge); setStep('mfa'); setMessage('Enviamos um código de 6 dígitos para seu e-mail.') }
  }
  async function verify() {
    const result = await submit('/auth/verify', { challenge, code })
    if (result?.token) { setToken(result.token); router.replace('/(tabs)') }
  }
  async function changePassword() {
    const result = await submit('/auth/password', { currentPassword: password, newPassword: code })
    if (result) { setStep('login'); setCode(''); setPassword(''); setMessage('Senha alterada. Faça login com sua nova senha.') }
  }
  return <View style={styles.page}><View style={styles.card}>
    <Text style={styles.eyebrow}>CHAMADA DISCIPULADO</Text>
    <Text style={styles.title}>{step === 'mfa' ? 'Confirme seu acesso' : step === 'password' ? 'Alterar senha' : 'Bem-vindo de volta'}</Text>
    <Text style={styles.subtitle}>{step === 'mfa' ? `Digite o código enviado para ${email}` : 'Acesse o painel de chamadas da escola bíblica.'}</Text>
    {step === 'login' && <><Text style={styles.label}>E-mail</Text><TextInput style={styles.input} value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="off" keyboardType="email-address" placeholder="seu@email.com"/><Text style={styles.label}>Senha</Text><TextInput style={styles.input} value={password} onChangeText={setPassword} autoComplete="off" secureTextEntry onSubmitEditing={login}/></>}
    {step === 'mfa' && <><Text style={styles.label}>Código de verificação</Text><TextInput style={[styles.input, styles.code]} value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6} placeholder="000000"/></>}
    {step === 'password' && <><Text style={styles.label}>Senha atual</Text><TextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry/><Text style={styles.label}>Nova senha (mínimo 8 caracteres)</Text><TextInput style={styles.input} value={code} onChangeText={setCode} secureTextEntry/></>}
    {!!message && <Text style={styles.message}>{message}</Text>}
    <Pressable style={styles.button} onPress={step === 'login' ? login : step === 'mfa' ? verify : changePassword} disabled={busy}>{busy ? <ActivityIndicator color="#fff"/> : <Text style={styles.buttonText}>{step === 'login' ? 'Entrar' : step === 'mfa' ? 'Confirmar código' : 'Salvar nova senha'}</Text>}</Pressable>
    {step !== 'mfa' && <Pressable onPress={() => { setStep(step === 'password' ? 'login' : 'password'); setCode(''); setMessage('') }}><Text style={styles.link}>{step === 'password' ? 'Voltar para o login' : 'Alterar senha'}</Text></Pressable>}
  </View></View>
}

const styles = StyleSheet.create({ page:{flex:1,justifyContent:'center',alignItems:'center',backgroundColor:'#f4f6f2',padding:24},card:{width:'100%',maxWidth:430,backgroundColor:'#fff',padding:32,borderRadius:20,borderWidth:1,borderColor:'#e3e8df'},eyebrow:{fontSize:12,fontWeight:'700',letterSpacing:1.5,color:'#597c55'},title:{fontSize:28,fontWeight:'700',color:'#1f3024',marginTop:14},subtitle:{fontSize:15,color:'#6b756c',lineHeight:23,marginTop:8,marginBottom:24},label:{fontSize:13,fontWeight:'600',color:'#38483b',marginBottom:7,marginTop:14},input:{height:48,borderColor:'#dce2d9',borderWidth:1,borderRadius:10,paddingHorizontal:13,fontSize:16,color:'#24352b'},code:{letterSpacing:6,fontSize:22,textAlign:'center'},button:{height:50,backgroundColor:'#446b48',borderRadius:10,alignItems:'center',justifyContent:'center',marginTop:22},buttonText:{color:'#fff',fontSize:15,fontWeight:'700'},message:{color:'#526c4d',fontSize:14,marginTop:15,lineHeight:20},link:{textAlign:'center',color:'#446b48',fontSize:14,fontWeight:'600',marginTop:20} })
