import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Alert, RefreshControl,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/src/context/AuthContext';
import { Card } from '@/src/components/ui/Card';
import { Button } from '@/src/components/ui/Button';
import { Input } from '@/src/components/ui/Input';
import { COLORS } from '@/src/lib/constants';
import { WeightEntry, DailySummary } from '@/src/types/database';
import { addWeightEntry, getWeightEntries, getLatestWeight } from '@/src/services/weight.service';
import { getDailySummaries } from '@/src/services/summary.service';
import { updateProfile } from '@/src/services/profile.service';
import { calculateTheoreticalWeight, recalibrateTDEE } from '@/src/utils/calories';
import { toDateString, formatDate, formatWeight } from '@/src/utils/formatting';
import { subDays } from 'date-fns';

export default function WeightScreen() {
  const { user, profile, refreshProfile } = useAuth();
  const insets = useSafeAreaInsets();
  const [weightEntries, setWeightEntries] = useState<WeightEntry[]>([]);
  const [summaries, setSummaries] = useState<DailySummary[]>([]);
  const [latestWeight, setLatestWeight] = useState<WeightEntry | null>(null);
  const [weightInput, setWeightInput] = useState('');
  const [notesInput, setNotesInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const today = toDateString(new Date());
  const thirtyDaysAgo = toDateString(subDays(new Date(), 30));

  const loadData = useCallback(async () => {
    if (!user) return;
    const [entries, latest, sums] = await Promise.all([
      getWeightEntries(user.id, thirtyDaysAgo, today),
      getLatestWeight(user.id),
      getDailySummaries(user.id, thirtyDaysAgo, today),
    ]);
    setWeightEntries(entries);
    setLatestWeight(latest);
    setSummaries(sums);
  }, [user, today, thirtyDaysAgo]);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const cumulativeBalance = summaries.reduce((sum, s) => sum + s.net_balance, 0);
  const theoreticalWeight = profile
    ? calculateTheoreticalWeight(profile.current_weight_kg, cumulativeBalance)
    : null;

  const diff = latestWeight && theoreticalWeight
    ? +(latestWeight.weight_kg - theoreticalWeight).toFixed(1)
    : null;
  const showRecalibration = diff !== null && Math.abs(diff) > 2;

  const handleSaveWeight = async () => {
    if (!user || !weightInput) return;
    const kg = parseFloat(weightInput);
    if (isNaN(kg) || kg < 30 || kg > 300) {
      Alert.alert('Error', 'Peso invalido');
      return;
    }
    setSaving(true);
    try {
      await addWeightEntry(user.id, kg, today, notesInput || undefined);
      setWeightInput('');
      setNotesInput('');
      await loadData();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
    setSaving(false);
  };

  const handleRecalibrate = async () => {
    if (!user || !profile || !latestWeight || !theoreticalWeight) return;

    const fourteenDaysAgo = toDateString(subDays(new Date(), 14));
    const recentEntries = weightEntries.filter(e => e.date >= fourteenDaysAgo);
    if (recentEntries.length < 2) {
      Alert.alert('Datos insuficientes', 'Necesitas al menos 2 registros de peso en los ultimos 14 dias');
      return;
    }

    const oldest = recentEntries[0];
    const newest = recentEntries[recentEntries.length - 1];
    const actualChange = newest.weight_kg - oldest.weight_kg;
    const days = Math.max(1, Math.ceil(
      (new Date(newest.date).getTime() - new Date(oldest.date).getTime()) / (1000 * 60 * 60 * 24)
    ));

    const recentSummaries = summaries.filter(s => s.date >= oldest.date && s.date <= newest.date);
    const periodBalance = recentSummaries.reduce((sum, s) => sum + s.net_balance, 0);
    const theoreticalChange = periodBalance / 7700;

    const newTDEE = recalibrateTDEE(profile.tdee, theoreticalChange, actualChange, days);

    Alert.alert(
      'Recalibrar TDEE',
      `Tu TDEE actual: ${profile.tdee} kcal\nTDEE sugerido: ${newTDEE} kcal\n\nEsto se basa en tu progreso real de los ultimos ${days} dias.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Aplicar',
          onPress: async () => {
            await updateProfile(user.id, {
              current_weight_kg: latestWeight.weight_kg,
            });
            await refreshProfile();
            await loadData();
            Alert.alert('Listo', 'Tu TDEE y meta diaria han sido actualizados');
          },
        },
      ]
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: insets.top + 16 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Peso</Text>

        {/* Current vs Theoretical */}
        <Card style={styles.comparisonCard}>
          <View style={styles.compRow}>
            <View style={styles.compItem}>
              <Text style={styles.compValue}>
                {latestWeight ? formatWeight(latestWeight.weight_kg) : '—'}
              </Text>
              <Text style={styles.compLabel}>Peso real</Text>
              {latestWeight && (
                <Text style={styles.compDate}>{formatDate(latestWeight.date)}</Text>
              )}
            </View>
            <View style={styles.compDivider} />
            <View style={styles.compItem}>
              <Text style={[styles.compValue, { color: COLORS.primary }]}>
                {theoreticalWeight ? formatWeight(theoreticalWeight) : '—'}
              </Text>
              <Text style={styles.compLabel}>Peso teorico</Text>
            </View>
          </View>
          {diff !== null && (
            <Text style={[styles.diffText, { color: Math.abs(diff) > 2 ? COLORS.warning : COLORS.textSecondary }]}>
              Diferencia: {diff > 0 ? '+' : ''}{diff} kg
            </Text>
          )}
        </Card>

        {/* Recalibration */}
        {showRecalibration && (
          <Card style={{ ...styles.recalCard, borderColor: COLORS.warning }}>
            <Text style={styles.recalTitle}>Recalibracion sugerida</Text>
            <Text style={styles.recalText}>
              Tu peso real difiere significativamente del teorico. Esto puede deberse a
              retencion de liquidos, errores en el registro, o que tu gasto calorico real
              es diferente al calculado.
            </Text>
            <Button title="Recalibrar" onPress={handleRecalibrate} style={{ marginTop: 12 }} />
          </Card>
        )}

        {/* Weight Chart (simplified text version) */}
        <Card style={{ marginBottom: 12 }}>
          <Text style={styles.cardTitle}>Historial (ultimos 30 dias)</Text>
          {weightEntries.length === 0 ? (
            <Text style={styles.emptyText}>Sin registros aun</Text>
          ) : (
            <View style={styles.chartSimple}>
              {weightEntries.slice(-10).map((entry, i) => {
                const min = Math.min(...weightEntries.map(e => e.weight_kg));
                const max = Math.max(...weightEntries.map(e => e.weight_kg));
                const range = max - min || 1;
                const height = ((entry.weight_kg - min) / range) * 60 + 10;
                return (
                  <View key={entry.id} style={styles.chartCol}>
                    <Text style={styles.chartValue}>{entry.weight_kg}</Text>
                    <View style={[styles.chartBar, { height, backgroundColor: COLORS.primary }]} />
                    <Text style={styles.chartDate}>{formatDate(entry.date).slice(0, 3)}</Text>
                  </View>
                );
              })}
            </View>
          )}
        </Card>

        {/* Log Weight Form */}
        <Card style={{ marginBottom: 12 }}>
          <Text style={styles.cardTitle}>Registrar peso</Text>
          <Input
            label="Peso (kg)"
            placeholder="Ej. 84.5"
            value={weightInput}
            onChangeText={setWeightInput}
            keyboardType="decimal-pad"
          />
          <Input
            label="Notas (opcional)"
            placeholder="Ej. Despues de desayunar"
            value={notesInput}
            onChangeText={setNotesInput}
          />
          <Button title="Guardar" onPress={handleSaveWeight} loading={saving} />
        </Card>

        {/* History */}
        <Card style={{ marginBottom: 40 }}>
          <Text style={styles.cardTitle}>Registros recientes</Text>
          {weightEntries.slice().reverse().slice(0, 10).map((entry) => (
            <View key={entry.id} style={styles.historyRow}>
              <Text style={styles.historyDate}>{formatDate(entry.date)}</Text>
              <Text style={styles.historyWeight}>{formatWeight(entry.weight_kg)}</Text>
            </View>
          ))}
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  container: { padding: 16 },
  title: { fontSize: 24, fontWeight: '700', color: COLORS.text, marginBottom: 16 },
  comparisonCard: { marginBottom: 12 },
  compRow: { flexDirection: 'row', alignItems: 'center' },
  compItem: { flex: 1, alignItems: 'center' },
  compDivider: { width: 1, height: 50, backgroundColor: COLORS.border },
  compValue: { fontSize: 24, fontWeight: '700', color: COLORS.text },
  compLabel: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },
  compDate: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  diffText: { textAlign: 'center', fontSize: 13, marginTop: 12 },
  recalCard: { marginBottom: 12, borderWidth: 1 },
  recalTitle: { fontSize: 16, fontWeight: '600', color: COLORS.warning },
  recalText: { fontSize: 14, color: COLORS.text, marginTop: 4, lineHeight: 20 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginBottom: 12 },
  emptyText: { textAlign: 'center', color: COLORS.textSecondary, paddingVertical: 20 },
  chartSimple: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: 100 },
  chartCol: { alignItems: 'center', flex: 1 },
  chartValue: { fontSize: 10, color: COLORS.textSecondary },
  chartBar: { width: 16, borderRadius: 4, marginVertical: 4 },
  chartDate: { fontSize: 10, color: COLORS.textSecondary },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  historyDate: { fontSize: 14, color: COLORS.textSecondary },
  historyWeight: { fontSize: 14, fontWeight: '600', color: COLORS.text },
});
