import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

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
  const {
    classes,
    discipleshipLessons,
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

  return (
    <ScreenShell
      title="Chamada EBD"
      subtitle={`Visão geral da escola bíblica: turmas, professores e histórico de presença. Modo: ${modeLabel}.`}
    >
      <Animated.View entering={FadeInDown.delay(50).duration(500)}>
        <SectionCard
          title="Painel rápido"
          description="Leitura imediata para o início da aula."
        >
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{stats.classesCount}</Text>
              <Text style={styles.statLabel}>Turmas</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{stats.studentsCount}</Text>
              <Text style={styles.statLabel}>Alunos</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{stats.teachersCount}</Text>
              <Text style={styles.statLabel}>Professores</Text>
            </View>
            <View style={styles.statBoxHighlight}>
              <Text style={styles.statValueHighlight}>{stats.todayCount}</Text>
              <Text style={styles.statLabelHighlight}>Chamadas hoje</Text>
            </View>
          </View>
        </SectionCard>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(120).duration(500)}>
        <SectionCard
          title="Últimas chamadas"
          description="Toque na aba Chamada para editar ou registrar uma nova."
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
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  statBox: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: AppPalette.border,
    borderRadius: 14,
    width: "48%",
    paddingVertical: 14,
    paddingHorizontal: 12,
    gap: 2,
  },
  statBoxHighlight: {
    backgroundColor: AppPalette.primary,
    borderWidth: 1,
    borderColor: AppPalette.primary,
    borderRadius: 14,
    width: "48%",
    paddingVertical: 14,
    paddingHorizontal: 12,
    gap: 2,
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
