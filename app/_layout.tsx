import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { SchoolDataProvider } from '@/context/school-data-context';
import { AuthProvider, useAuth } from '@/context/auth-context';
import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

function AppNavigator() {
  const colorScheme = useColorScheme();
  const { token, loading } = useAuth();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Protected guard={loading || !token}>
          <Stack.Screen name="login" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Protected guard={!loading && Boolean(token)}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack.Protected>
      </Stack>
      <StatusBar style={token ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return <AuthProvider><AuthenticatedApp /></AuthProvider>;
}

function AuthenticatedApp() {
  const { token, loading } = useAuth();
  return loading || !token ? <AppNavigator /> : <SchoolDataProvider><AppNavigator /></SchoolDataProvider>;
}
