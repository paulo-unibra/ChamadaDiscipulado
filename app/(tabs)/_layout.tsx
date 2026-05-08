import { Tabs } from 'expo-router';
import React from 'react';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { HapticTab } from '@/components/haptic-tab';
import { AppPalette, AppTypography } from '@/constants/ui';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: AppPalette.primary,
        tabBarInactiveTintColor: '#6C7886',
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          borderTopWidth: 0,
          backgroundColor: '#FFFCF7',
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontFamily: AppTypography.bodyStrong,
          fontSize: 11,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Resumo',
          tabBarIcon: ({ color }) => <MaterialIcons size={24} name="dashboard" color={color} />,
        }}
      />
      <Tabs.Screen
        name="turmas"
        options={{
          title: 'Turmas',
          tabBarIcon: ({ color }) => <MaterialIcons size={24} name="groups" color={color} />,
        }}
      />
      <Tabs.Screen
        name="chamadas"
        options={{
          title: 'Chamada',
          tabBarIcon: ({ color }) => <MaterialIcons size={24} name="fact-check" color={color} />,
        }}
      />
      <Tabs.Screen
        name="professores"
        options={{
          title: 'Profs',
          tabBarIcon: ({ color }) => <MaterialIcons size={24} name="badge" color={color} />,
        }}
      />
      <Tabs.Screen
        name="config"
        options={{
          title: 'Config',
          tabBarIcon: ({ color }) => <MaterialIcons size={24} name="tune" color={color} />,
        }}
      />
    </Tabs>
  );
}
