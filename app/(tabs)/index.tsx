import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter, type Href } from "expo-router";

import { ScreenShell } from "@/components/app/screen-shell";
import { EmptyMessage, SectionCard, TinyBadge } from "@/components/app/ui";
import { AppPalette, AppTypography } from "@/constants/ui";
import { useSchoolData } from "@/context/school-data-context";

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function formatDateToBr(value: string) {
  const trimmed = value.trim();
  const brMatch = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (brMatch) {
    return trimmed;
  }

  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return trimmed;
  }

  const day = String(parsed.getUTCDate()).padStart(2, "0");
  const month = String(parsed.getUTCMonth() + 1).padStart(2, "0");
  const year = String(parsed.getUTCFullYear());
  return `${day}/${month}/${year}`;
}

export default function DashboardScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const {
    classes,
    teachers,
    students,
    attendanceRecords,
    modeLabel,
  } = useSchoolData();

  const stats = useMemo(() => {
    const todayCount = attendanceRecords.filter(
      (record) => record.date === todayDate(),
    ).length;

    return {
      classesCount: classes.length,
      teachersCount: teachers.length,
      studentsCount: students.length,
      todayCount,
    };
  }, [classes, teachers, students, attendanceRecords]);

  const latestRecords = attendanceRecords.slice(0, 4);
  const statCardWidth = width >= 1150 ? "23%" : width >= 760 ? "47%" : "100%";
  const todayLabel = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  return (
    <ScreenShell
      title="Visão geral"
      subtitle={`Acompanhe a atividade da escola bíblica em um só lugar. Modo: ${modeLabel}.`}
    >
      <Animated.View entering={FadeInDown.delay(30).duration(500)} style={styles.welcomeCard}>
        <View style={styles.welcomeCopy}>
          <Text style={styles.welcomeEyebrow}>PAINEL DA ESCOLA BÍBLICA</Text>
          <Text style={styles.welcomeTitle}>Tudo em ordem por aqui?</Text>
          <Text style={styles.welcomeSubtitle}>Veja os números da sua comunidade e acompanhe as chamadas recentes.</Text>
          <View style={styles.dateRow}>
            <MaterialIcons name="calendar-today" size={15} color="#DCE8F6" />
            <Text style={styles.dateText}>{todayLabel}</Text>
          </View>
        </View>
        <View style={styles.welcomeIcon}><MaterialIcons name="menu-book" size={34} color="#FFFFFF" /></View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(80).duration(500)}>
        <View style={styles.sectionHeading}>
          <View><Text style={styles.sectionTitle}>Resumo da escola</Text><Text style={styles.sectionDescription}>Indicadores atualizados com seus cadastros e chamadas.</Text></View>
        </View>
        <View style={styles.statsGrid}>
          {[
            { label: "Turmas", value: stats.classesCount, icon: "class" as const, tone: "blue" as const },
            { label: "Alunos", value: stats.studentsCount, icon: "groups" as const, tone: "cyan" as const },
            { label: "Professores", value: stats.teachersCount, icon: "school" as const, tone: "green" as const },
            { label: "Chamadas hoje", value: stats.todayCount, icon: "fact-check" as const, tone: "amber" as const },
          ].map((item) => (
            <View key={item.label} style={[styles.statCard, { width: statCardWidth }]}>
              <View style={styles.statTop}><Text style={styles.statLabel}>{item.label}</Text><View style={[styles.statIcon, item.tone === "green" ? styles.icon_green : item.tone === "amber" ? styles.icon_amber : item.tone === "cyan" ? styles.icon_cyan : styles.icon_blue]}><MaterialIcons name={item.icon} size={19} color={item.tone === "green" ? "#238457" : item.tone === "amber" ? "#B7791F" : item.tone === "cyan" ? "#0787A5" : "#245DA1"} /></View></View>
              <Text style={styles.statValue}>{item.value}</Text>
              <Text style={styles.statDetail}>{item.label === "Chamadas hoje" ? "registros neste dia" : "no sistema"}</Text>
            </View>
          ))}
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(120).duration(500)} style={styles.shortcuts}>
        <Pressable onPress={() => router.push("/chamadas" as Href)} style={({ pressed }) => [styles.shortcutPrimary, pressed && styles.pressed]}>
          <MaterialIcons name="add" size={19} color="#FFFFFF" /><Text style={styles.shortcutPrimaryText}>Registrar chamada</Text><MaterialIcons name="arrow-forward" size={17} color="#FFFFFF" />
        </Pressable>
        <Pressable onPress={() => router.push("/relatorios" as Href)} style={({ pressed }) => [styles.shortcutSecondary, pressed && styles.pressed]}>
          <MaterialIcons name="assessment" size={18} color={AppPalette.primary} /><Text style={styles.shortcutSecondaryText}>Ver relatórios</Text>
        </Pressable>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(170).duration(500)}>
        <SectionCard
          title="Últimas chamadas"
          description="Acompanhe os registros mais recentes da escola."
        >
          {latestRecords.length === 0 ? (
            <EmptyMessage
              title="Nenhuma chamada registrada"
              description="Assim que você registrar a primeira chamada, ela aparece aqui."
            />
          ) : (
            latestRecords.map((record) => {
              const className =
                classes.find((item) => item.id === record.classId)?.name ??
                "Turma removida";
              const lessonTitle = record.lessonName || "Lição não informada";
              const teacherName =
                record.teacherIds.length === 0
                  ? "Professor removido"
                  : record.teacherIds
                      .map(
                        (teacherId) =>
                          teachers.find((item) => item.id === teacherId)
                            ?.name ?? "Removido",
                      )
                      .join(", ");

              const presentCount = record.entries.filter(
                (entry) => entry.status === "present",
              ).length;
              const absentCount = record.entries.filter(
                (entry) => entry.status === "absent",
              ).length;
              const justifiedCount = record.entries.filter(
                (entry) => entry.status === "justified",
              ).length;
              const lateCount = record.entries.filter(
                (entry) => entry.status === "late",
              ).length;

              return (
                <View key={record.id} style={styles.recordItem}>
                  <View style={styles.recordHeader}>
                    <Text style={styles.recordTitle}>{className}</Text>
                    <TinyBadge
                      label={formatDateToBr(record.date)}
                      tone="neutral"
                    />
                  </View>
                  <Text style={styles.recordSubtitle}>
                    Lição: {lessonTitle}
                  </Text>
                  <Text style={styles.recordSubtitle}>
                    Professor: {teacherName}
                  </Text>
                  <View style={styles.recordBadges}>
                    <TinyBadge label={`P: ${presentCount}`} tone="success" />
                    <TinyBadge label={`F: ${absentCount}`} tone="danger" />
                    <TinyBadge label={`J: ${justifiedCount}`} tone="primary" />
                    <TinyBadge label={`A: ${lateCount}`} tone="neutral" />
                  </View>
                </View>
              );
            })
          )}
        </SectionCard>
      </Animated.View>

      {/*
      <Animated.View entering={FadeInDown.delay(180).duration(500)}>
        <SectionCard title="Fluxo sugerido" description="Ordem ideal para usar o app no culto dominical.">
          <View style={styles.flowLine}>
            <Text style={styles.flowStep}>1) Cadastre os professores</Text>
            <Text style={styles.flowStep}>2) Crie as turmas e associe alunos (a grade de {discipleshipLessons.length} aulas é fixa)</Text>
            <Text style={styles.flowStep}>3) Registre a chamada por turma, selecionando um ou mais professores da aula</Text>
            <Text style={styles.flowStep}>4) Edite chamadas anteriores e gere relatórios para secretaria</Text>
          </View>
        </SectionCard>
      </Animated.View>
      */}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  welcomeCard: {
    minHeight: 146,
    padding: 22,
    borderRadius: 14,
    backgroundColor: "#263A57",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
    overflow: "hidden",
  },
  welcomeCopy: { flex: 1, gap: 6 },
  welcomeEyebrow: { color: "#AFC4E0", fontSize: 10, letterSpacing: 1.4, fontFamily: AppTypography.bodyStrong },
  welcomeTitle: { color: "#FFFFFF", fontSize: 22, fontFamily: AppTypography.title },
  welcomeSubtitle: { maxWidth: 470, color: "#D4DCE8", fontSize: 13, lineHeight: 19, fontFamily: AppTypography.body },
  dateRow: { flexDirection: "row", alignItems: "center", gap: 7, marginTop: 5 },
  dateText: { color: "#DCE8F6", fontSize: 11, textTransform: "capitalize", fontFamily: AppTypography.body },
  welcomeIcon: { width: 64, height: 64, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.12)" },
  sectionHeading: { marginTop: 7, marginBottom: 12, flexDirection: "row", justifyContent: "space-between" },
  sectionTitle: { color: "#212B36", fontSize: 16, fontFamily: AppTypography.bodyStrong },
  sectionDescription: { color: "#637381", fontSize: 11, marginTop: 3, fontFamily: AppTypography.body },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    width: "100%",
  },
  statCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E8EBED",
    borderRadius: 14,
    flexGrow: 0,
    flexShrink: 0,
    padding: 15,
    shadowColor: "#233E52",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  statTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 9 },
  statIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  icon_blue: { backgroundColor: "#EAF1FA" },
  icon_cyan: { backgroundColor: "#E5F6F9" },
  icon_green: { backgroundColor: "#E8F6EF" },
  icon_amber: { backgroundColor: "#FFF4E5" },
  statDetail: { color: "#84909D", fontSize: 10, marginTop: 2, fontFamily: AppTypography.body },
  shortcuts: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 1 },
  shortcutPrimary: { minHeight: 43, paddingHorizontal: 15, borderRadius: 9, backgroundColor: AppPalette.primary, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  shortcutPrimaryText: { color: "#FFFFFF", fontSize: 12, fontFamily: AppTypography.bodyStrong },
  shortcutSecondary: { minHeight: 43, paddingHorizontal: 14, borderRadius: 9, borderWidth: 1, borderColor: "#DCE4EB", backgroundColor: "#FFFFFF", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  shortcutSecondaryText: { color: AppPalette.primary, fontSize: 12, fontFamily: AppTypography.bodyStrong },
  pressed: { opacity: 0.8,
  },
  statValue: {
    fontSize: 28,
    color: AppPalette.ink,
    fontFamily: AppTypography.title,
  },
  statLabel: {
    fontSize: 12,
    color: AppPalette.inkMuted,
    fontFamily: AppTypography.bodyStrong,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  statValueHighlight: {
    fontSize: 28,
    color: "#FFFFFF",
    fontFamily: AppTypography.title,
  },
  statLabelHighlight: {
    fontSize: 12,
    color: "#DCEEFF",
    fontFamily: AppTypography.bodyStrong,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  recordItem: {
    borderWidth: 1,
    borderColor: AppPalette.border,
    borderRadius: 14,
    padding: 10,
    backgroundColor: "#FFFFFF",
    gap: 6,
  },
  recordHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  recordTitle: {
    flex: 1,
    fontSize: 15,
    color: AppPalette.ink,
    fontFamily: AppTypography.bodyStrong,
  },
  recordSubtitle: {
    fontSize: 13,
    color: AppPalette.inkMuted,
    fontFamily: AppTypography.body,
  },
  recordBadges: {
    flexDirection: "row",
    gap: 6,
  },
  flowLine: {
    gap: 7,
  },
  flowStep: {
    color: AppPalette.ink,
    fontSize: 14,
    fontFamily: AppTypography.body,
    lineHeight: 20,
  },
});
