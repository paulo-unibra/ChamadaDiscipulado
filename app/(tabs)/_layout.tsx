import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Tabs, usePathname, useRouter, type Href } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { API_BASE_URL } from '@/constants/api';
import { HapticTab } from '@/components/haptic-tab';
import { AppPalette, AppTypography } from '@/constants/ui';
import { useAuth } from '@/context/auth-context';

type NavLink = { label: string; route: string };
type NavGroup = { label: string; icon: React.ComponentProps<typeof MaterialIcons>['name']; route?: string; items?: NavLink[] };

const MENU: NavGroup[] = [
  { label: 'Visão geral', icon: 'dashboard', route: '/' },
  { label: 'Cadastros', icon: 'folder-open', items: [{ label: 'Turmas', route: '/turmas' }, { label: 'Professores', route: '/professores' }] },
  { label: 'Operacional', icon: 'fact-check', items: [{ label: 'Chamadas', route: '/chamadas' }] },
  { label: 'Relatórios', icon: 'assessment', items: [{ label: 'Visão geral', route: '/relatorios' }, { label: 'Frequência', route: '/frequencia' }] },
];

function isRouteActive(pathname: string, route: string) {
  return route === '/' ? pathname === '/' : pathname === route || pathname.startsWith(`${route}/`);
}

function MenuLink({ item, active, onPress, collapsed = false, recent = false, icon }: {
  item: NavLink;
  active: boolean;
  onPress: () => void;
  collapsed?: boolean;
  recent?: boolean;
  icon?: NavGroup['icon'];
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <Pressable onPress={onPress} onHoverIn={() => setHovered(true)} onHoverOut={() => setHovered(false)} accessibilityRole="link" accessibilityState={{ selected: active }} style={({ pressed }) => [styles.menuLink, active ? styles.menuLinkActive : null, pressed ? styles.menuLinkPressed : null, collapsed ? styles.menuLinkCollapsed : null]}>
      {icon ? <MaterialIcons name={icon} size={20} color={active ? AppPalette.primary : '#5B6B7F'} /> : null}
      {recent ? <MaterialIcons name="history" size={18} color={active ? '#1B56A3' : '#98A2B3'} /> : null}
      {!collapsed ? <Text numberOfLines={1} style={[styles.menuLinkText, active ? styles.menuLinkTextActive : null, recent ? styles.menuLinkRecent : null]}>{item.label}</Text> : null}
      {collapsed ? <Text style={[styles.menuTooltip, hovered ? styles.menuTooltipVisible : null]}>{item.label}</Text> : null}
    </Pressable>
  );
}

function SideMenu({
  expanded,
  mobile,
  pathname,
  onToggle,
  onNavigate,
}: {
  expanded: boolean;
  mobile: boolean;
  pathname: string;
  onToggle: () => void;
  onNavigate: (route: string) => void;
}) {
  const [search, setSearch] = useState('');
  const [openGroup, setOpenGroup] = useState('');
  const [flyout, setFlyout] = useState<{ group: NavGroup; top: number } | null>(null);
  const [hoveredGroup, setHoveredGroup] = useState('');
  const { height } = useWindowDimensions();
  const term = search.trim().toLocaleLowerCase('pt-BR');

  useEffect(() => {
    const activeGroup = MENU.find((group) => group.items?.some((item) => isRouteActive(pathname, item.route)));
    if (activeGroup) setOpenGroup(activeGroup.label);
  }, [pathname]);

  const visibleGroups = useMemo(() => MENU.map((group) => ({
    ...group,
    items: group.route
      ? undefined
      : group.items?.filter((item) => !term || `${group.label} ${item.label}`.toLocaleLowerCase('pt-BR').includes(term)),
  })).filter((group) => group.route ? !term || group.label.toLocaleLowerCase('pt-BR').includes(term) : Boolean(group.items?.length)), [term]);

  const navigate = (route: string) => {
    setFlyout(null);
    setSearch('');
    onNavigate(route);
  };

  const menuContents = visibleGroups.map((group) => {
    const groupActive = group.route
      ? isRouteActive(pathname, group.route)
      : Boolean(group.items?.some((item) => isRouteActive(pathname, item.route)));
    const groupExpanded = Boolean(term) || openGroup === group.label;

    if (group.route) {
      return <MenuLink key={group.label} item={{ label: group.label, route: group.route }} icon={group.icon} active={groupActive} onPress={() => navigate(group.route!)} collapsed={!expanded && !mobile} />;
    }

    if (!expanded && !mobile) {
      return (
        <Pressable key={group.label} onHoverIn={() => setHoveredGroup(group.label)} onHoverOut={() => setHoveredGroup('')} onLayout={(event) => { if (flyout?.group.label === group.label) setFlyout({ group, top: event.nativeEvent.layout.y }); }} onPress={(event) => {
          const target = event.currentTarget as unknown as { measure?: (callback: (x: number, y: number, width: number, height: number, pageX: number, pageY: number) => void) => void };
          target.measure?.((_x, _y, _width, _height, _pageX, pageY) => setFlyout((current) => current?.group.label === group.label ? null : { group, top: pageY }));
          if (!target.measure) setFlyout((current) => current?.group.label === group.label ? null : { group, top: 100 });
        }} accessibilityRole="button" accessibilityState={{ expanded: flyout?.group.label === group.label }} style={[styles.menuLink, styles.railGroup, groupActive || flyout?.group.label === group.label ? styles.menuLinkActive : null]}>
          <MaterialIcons name={group.icon} size={21} color={groupActive || flyout?.group.label === group.label ? AppPalette.primary : '#5B6B7F'} />
          <Text style={[styles.menuTooltip, hoveredGroup === group.label ? styles.menuTooltipVisible : null]}>{group.label}</Text>
        </Pressable>
      );
    }

    return (
      <View key={group.label} style={styles.groupBlock}>
        <Pressable onPress={() => setOpenGroup(groupExpanded && !term ? '' : group.label)} accessibilityRole="button" accessibilityState={{ expanded: groupExpanded }} style={[styles.groupToggle, groupActive ? styles.groupToggleActive : null]}>
          <MaterialIcons name={group.icon} size={19} color={groupActive ? AppPalette.primary : '#7B8794'} />
          <Text numberOfLines={1} style={[styles.groupTitle, groupActive ? styles.groupTitleActive : null]}>{group.label}</Text>
          <MaterialIcons name={groupExpanded ? 'expand-less' : 'expand-more'} size={19} color={groupActive ? AppPalette.primary : '#B0B7C3'} />
        </Pressable>
        {groupExpanded ? <View style={styles.submenu}>{group.items?.map((item) => <MenuLink key={item.route} item={item} active={isRouteActive(pathname, item.route)} onPress={() => navigate(item.route)} />)}</View> : null}
      </View>
    );
  });

  return (
    <>
      <View style={[styles.sidebar, expanded || mobile ? styles.sidebarExpanded : styles.sidebarCollapsed, mobile ? styles.mobileSidebar : null]}>
        <Pressable onPress={onToggle} style={styles.sidebarHeading} accessibilityRole="button" accessibilityLabel={expanded || mobile ? 'Recolher menu' : 'Expandir menu'}>
          {expanded || mobile ? <Text style={styles.sidebarEyebrow}>NAVEGAÇÃO</Text> : null}
          <MaterialIcons name={expanded || mobile ? 'menu-open' : 'menu'} size={21} color="#98A2B3" />
        </Pressable>
        {expanded || mobile ? (
          <View style={styles.searchBox}>
            <MaterialIcons name="search" size={18} color="#98A2B3" />
            <TextInput value={search} onChangeText={setSearch} placeholder="Buscar no menu" placeholderTextColor="#98A2B3" style={styles.searchInput} />
            {search ? <Pressable onPress={() => setSearch('')}><MaterialIcons name="close" size={17} color="#98A2B3" /></Pressable> : null}
          </View>
        ) : (
          <Pressable onPress={onToggle} onHoverIn={() => setHoveredGroup('search')} onHoverOut={() => setHoveredGroup('')} style={[styles.menuLink, styles.collapsedSearch]} accessibilityRole="button" accessibilityLabel="Expandir menu para buscar">
            <MaterialIcons name="search" size={21} color="#5B6B7F" />
            <Text style={[styles.menuTooltip, hoveredGroup === 'search' ? styles.menuTooltipVisible : null]}>Buscar no menu</Text>
          </Pressable>
        )}
        <ScrollView style={styles.menuScroll} contentContainerStyle={styles.menuList} keyboardShouldPersistTaps="handled">
          {menuContents}
          {term && visibleGroups.length === 0 ? <Text style={styles.emptySearch}>Nenhum item encontrado</Text> : null}
        </ScrollView>
        {flyout && !expanded && !mobile ? (
          <View style={[styles.flyout, { top: Math.max(8, Math.min(flyout.top, height - 250)) }]}>
            <Text style={styles.flyoutTitle}>{flyout.group.label.toLocaleUpperCase('pt-BR')}</Text>
            {flyout.group.items?.map((item) => <MenuLink key={item.route} item={item} active={isRouteActive(pathname, item.route)} onPress={() => navigate(item.route)} />)}
          </View>
        ) : null}
      </View>
    </>
  );
}

export default function TabLayout() {
  const pathname = usePathname();
  const router = useRouter();
  const { token, setToken } = useAuth();
  const { width } = useWindowDimensions();
  const mobile = width <= 650;
  const [menuExpanded, setMenuExpanded] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    setMenuExpanded(localStorage.getItem('@chamada:menu') !== 'close');
  }, []);

  const activeGroup = MENU.find((group) => group.items?.some((item) => isRouteActive(pathname, item.route)));
  const activeLink = activeGroup?.items?.find((item) => isRouteActive(pathname, item.route));
  const activeTitle = MENU.find((group) => group.route && isRouteActive(pathname, group.route))?.label ?? activeLink?.label ?? 'Resumo';

  const toggleMenu = () => {
    if (mobile) {
      setMobileMenuOpen((current) => !current);
      return;
    }
    setMenuExpanded((current) => {
      const next = !current;
      if (Platform.OS === 'web') localStorage.setItem('@chamada:menu', next ? 'open' : 'close');
      return next;
    });
  };

  const navigate = (route: string) => {
    setMobileMenuOpen(false);
    router.replace(route as Href);
  };

  const logout = async () => {
    try {
      if (token) {
        await fetch(`${API_BASE_URL}/auth/logout`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      }
    } finally {
      setAccountOpen(false);
      setToken(null);
    }
  };

  return (
    <SafeAreaView style={styles.appRoot} edges={['top']}>
      <View style={styles.topBar}>
        <View style={styles.brandLine}>
          <Pressable onPress={toggleMenu} style={styles.headerMenuButton} accessibilityRole="button" accessibilityLabel="Abrir menu">
            <MaterialIcons name="menu" size={23} color="#FFFFFF" />
          </Pressable>
          <Pressable onPress={() => navigate('/')} style={styles.brandButton} accessibilityRole="link">
            <MaterialIcons name="menu-book" size={29} color="#FFFFFF" />
            <Text style={styles.brandText}>{mobile ? 'DISCIPULADO' : 'CHAMADA DO DISCIPULADO'}</Text>
          </Pressable>
        </View>
        <View style={styles.accountArea}>
          {!mobile ? <Text style={styles.accountEmail}>pr838908@gmail.com</Text> : null}
          <Pressable onPress={() => setAccountOpen((current) => !current)} style={[styles.accountTrigger, accountOpen ? styles.accountTriggerActive : null]} accessibilityRole="button" accessibilityState={{ expanded: accountOpen }}>
            <Text style={styles.avatar}>PD</Text>
            {!mobile ? <Text style={styles.accountName}>Administrador</Text> : null}
            <MaterialIcons name={accountOpen ? 'expand-less' : 'expand-more'} size={20} color="#D4DCE8" />
          </Pressable>
          {accountOpen ? <View style={styles.accountDropdown}>
            <Text style={styles.accountDropdownTitle}>Administrador</Text>
            <Text style={styles.accountDropdownEmail}>pr838908@gmail.com</Text>
            <View style={styles.accountDivider} />
            <Pressable onPress={() => void logout()} style={styles.accountLogout}>
              <MaterialIcons name="logout" size={18} color="#B42318" />
              <Text style={styles.accountLogoutText}>Sair</Text>
            </Pressable>
          </View> : null}
        </View>
      </View>

      <View style={styles.body}>
        {!mobile ? <SideMenu expanded={menuExpanded} mobile={false} pathname={pathname} onToggle={toggleMenu} onNavigate={navigate} /> : null}
        <View style={styles.mainColumn}>
          <View style={styles.breadcrumb}>
            <Pressable onPress={() => navigate('/')}><Text style={styles.breadcrumbHome}>Início</Text></Pressable>
            {activeGroup ? <><Text style={styles.breadcrumbSlash}>/</Text><Text style={styles.breadcrumbParent}>{activeGroup.label}</Text></> : null}
            <Text style={styles.breadcrumbSlash}>/</Text>
            <Text style={styles.breadcrumbCurrent}>{activeTitle}</Text>
          </View>
          <View style={styles.tabsWrap}>
            <Tabs screenOptions={{ headerShown: false, tabBarButton: HapticTab, tabBarStyle: { display: 'none' } }}>
              <Tabs.Screen name="index" />
              <Tabs.Screen name="turmas" />
              <Tabs.Screen name="chamadas" />
              <Tabs.Screen name="professores" />
              <Tabs.Screen name="relatorios" />
              <Tabs.Screen name="frequencia" options={{ href: null }} />
            </Tabs>
          </View>
        </View>
      </View>

      {mobile && mobileMenuOpen ? <View style={styles.mobileMenuLayer}>
        <Pressable style={styles.drawerBackdrop} onPress={() => setMobileMenuOpen(false)} accessibilityLabel="Fechar menu" />
        <SideMenu expanded mobile pathname={pathname} onToggle={() => setMobileMenuOpen(false)} onNavigate={navigate} />
      </View> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  appRoot: { flex: 1, minHeight: '100%', backgroundColor: AppPalette.background },
  topBar: { height: 62, paddingHorizontal: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#263A57', zIndex: 20, shadowColor: '#17283E', shadowOpacity: 0.12, shadowRadius: 8, elevation: 4 },
  brandLine: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  headerMenuButton: { width: 32, height: 36, alignItems: 'center', justifyContent: 'center' },
  brandButton: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandText: { color: '#FFFFFF', fontFamily: AppTypography.bodyStrong, fontSize: 12, letterSpacing: 1.05 },
  accountArea: { flexDirection: 'row', alignItems: 'center', gap: 12, position: 'relative' },
  accountEmail: { color: 'rgba(255,255,255,0.62)', fontSize: 11, fontFamily: AppTypography.body },
  accountTrigger: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 7, paddingVertical: 4, borderRadius: 24 },
  accountTriggerActive: { backgroundColor: 'rgba(255,255,255,0.1)' },
  avatar: { width: 34, height: 34, borderRadius: 17, overflow: 'hidden', textAlign: 'center', textAlignVertical: 'center', backgroundColor: '#3E79C4', color: '#FFFFFF', fontSize: 12, fontFamily: AppTypography.bodyStrong, paddingTop: 9 },
  accountName: { color: '#FFFFFF', fontFamily: AppTypography.bodyStrong, fontSize: 13 },
  accountDropdown: { position: 'absolute', right: 0, top: 47, zIndex: 100, width: 260, padding: 14, backgroundColor: '#FFFFFF', borderRadius: 10, borderColor: '#EDF0F4', borderWidth: 1, shadowColor: '#101828', shadowOpacity: 0.18, shadowRadius: 16, elevation: 8 },
  accountDropdownTitle: { color: '#101828', fontFamily: AppTypography.bodyStrong, fontSize: 14 },
  accountDropdownEmail: { color: '#7B8794', fontFamily: AppTypography.body, fontSize: 12, marginTop: 3 },
  accountDivider: { height: 1, backgroundColor: '#F0F2F5', marginVertical: 10 },
  accountLogout: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8, borderRadius: 7 },
  accountLogoutText: { color: '#B42318', fontFamily: AppTypography.bodyStrong, fontSize: 13 },
  body: { flex: 1, minHeight: 0, flexDirection: 'row' },
  sidebar: { height: '100%', flexDirection: 'column', backgroundColor: '#FFFFFF', borderRightWidth: 1, borderRightColor: '#E6EAF0', zIndex: 12 },
  sidebarExpanded: { width: 248 },
  sidebarCollapsed: { width: 64 },
  mobileSidebar: { width: 280, maxWidth: '82%', height: '100%', position: 'absolute', top: 0, left: 0, bottom: 0, zIndex: 40 },
  sidebarHeading: { minHeight: 42, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sidebarEyebrow: { color: '#98A2B3', fontFamily: AppTypography.bodyStrong, fontSize: 10, letterSpacing: 1.4 },
  searchBox: { height: 35, marginHorizontal: 16, marginBottom: 10, paddingHorizontal: 9, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#EDF0F4', borderRadius: 8, backgroundColor: '#F4F6F9' },
  searchInput: { flex: 1, minWidth: 0, paddingVertical: 0, color: '#344054', fontFamily: AppTypography.body, fontSize: 13, outlineStyle: 'none' } as never,
  menuScroll: { flex: 1, overflow: 'visible' },
  menuList: { paddingBottom: 14 },
  menuLink: { minHeight: 40, marginHorizontal: 9, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 9, position: 'relative' },
  menuLinkActive: { backgroundColor: '#EAF1FA' },
  menuLinkPressed: { backgroundColor: '#F2F5F9' },
  menuLinkCollapsed: { justifyContent: 'center', paddingHorizontal: 0 },
  menuLinkText: { flex: 1, minWidth: 0, color: '#5B6B7F', fontFamily: AppTypography.body, fontSize: 13 },
  menuLinkTextActive: { color: AppPalette.primary, fontFamily: AppTypography.bodyStrong },
  menuLinkRecent: { color: '#7B8794' },
  menuTooltip: { display: 'none', position: 'absolute', left: 55, zIndex: 50, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: '#101828', color: '#FFFFFF', borderRadius: 6, fontSize: 12, whiteSpace: 'nowrap' } as never,
  menuTooltipVisible: { display: 'flex' } as never,
  collapsedSearch: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 0, marginBottom: 6 },
  railGroup: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 0 },
  groupBlock: { flexDirection: 'column' },
  groupToggle: { minHeight: 40, marginHorizontal: 9, paddingLeft: 12, paddingRight: 10, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 9 },
  groupToggleActive: { backgroundColor: '#F4F7FB' },
  groupTitle: { flex: 1, minWidth: 0, color: '#344054', fontFamily: AppTypography.body, fontSize: 13 },
  groupTitleActive: { color: '#0D2B59', fontFamily: AppTypography.bodyStrong },
  submenu: { paddingVertical: 4, paddingLeft: 17, paddingBottom: 8 },
  emptySearch: { color: '#98A2B3', textAlign: 'center', padding: 20, fontFamily: AppTypography.body, fontSize: 12 },
  flyout: { position: 'absolute', left: 68, zIndex: 100, width: 238, paddingVertical: 6, backgroundColor: '#FFFFFF', borderRadius: 8, shadowColor: '#101828', shadowOpacity: 0.14, shadowRadius: 18, elevation: 10 },
  flyoutTitle: { paddingHorizontal: 12, paddingVertical: 7, color: '#B0B7C3', fontFamily: AppTypography.bodyStrong, fontSize: 10, letterSpacing: 1.1 },
  mainColumn: { flex: 1, minWidth: 0, flexDirection: 'column' },
  breadcrumb: { height: 46, paddingHorizontal: 28, flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E6EAF0' },
  breadcrumbHome: { color: '#7B8794', fontFamily: AppTypography.body, fontSize: 12 },
  breadcrumbParent: { color: '#7B8794', fontFamily: AppTypography.body, fontSize: 12 },
  breadcrumbSlash: { color: '#C3CAD4', fontFamily: AppTypography.body, fontSize: 12 },
  breadcrumbCurrent: { color: '#26364B', fontFamily: AppTypography.bodyStrong, fontSize: 12 },
  tabsWrap: { flex: 1, minHeight: 0, backgroundColor: AppPalette.background },
  mobileMenuLayer: { position: 'absolute', top: 62, left: 0, right: 0, bottom: 0, zIndex: 30 },
  drawerBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(16,24,40,0.38)' },
});
