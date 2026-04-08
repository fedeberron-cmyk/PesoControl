import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/src/context/AuthContext';
import { Card } from '@/src/components/ui/Card';
import { ProgressRing } from '@/src/components/ui/ProgressRing';
import { COLORS } from '@/src/lib/constants';
import { getFoodEntriesByDate } from '@/src/services/food.service';
import { getLatestWeight } from '@/src/services/weight.service';
import { getDailySummaries } from '@/src/services/summary.service';
import { toDateString, formatDate } from '@/src/utils/formatting';
import { subDays, format } from 'date-fns';
import { FoodEntry, WeightEntry, DailySummary } from '@/src/types/database';

export default function DashboardScreen() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [todayEntries, setTodayEntries] = useState<FoodEntry[]>([]);
  const [latestWeight, setLatestWeight] = useState<WeightEntry | null>(null);
  const [weeklySummaries, setWeeklySummaries] = useState<DailySummary[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const today = toDateString(new Date());
  const caloriesIn = todayEntries.reduce((sum, e) => sum + e.calories, 0);
  const caloriesOut = profile?.tdee ?? 0;
  const netBalance = caloriesIn - caloriesOut;
  const target = profile?.daily_calorie_target ?? 2000;
  const remaining = target - caloriesIn;

  const totalProtein = todayEntries.reduce((sum, e) => sum + (e.protein_g || 0), 0);
  const totalCarbs = todayEntries.reduce((sum, e) => sum + (e.carbs_g || 0), 0);
  const totalFat = todayEntries.reduce((sum, e) => sum + (e.fat_g || 0), 0);

  const weeklyDeficit = weeklySummaries.reduce((sum, s) => sum + s.net_balance, 0);
  const weeklyKg = (weeklyDeficit / 7700).toFixed(2);

  const loadData = useCallback(async () => {
    if (!user) return;
    const weekAgo = toDateString(subDays(new Date(), 6));
    const [entries, weight, summaries] = await Promise.all([
      getFoodEntriesByDate(user.id, today),
      getLatestWeight(user.id),
      getDailySummaries(user.id, weekAgo, today),
    ]);
    setTodayEntries(entries);
    setLatestWeight(weight);
    setWeeklySummaries(summaries);
  }, [user, today]);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.container, { paddingTop: insets.top + 16 }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
    >
      <Text style={styles.greeting}>Hola, {profile?.name ?? 'usuario'}</Text>
      <Text style={styles.date}>{formatDate(new Date())}</Text>

      {/* Calorie Ring */}
      <Card style={styles.ringCard}>
        <View style={styles.ringCenter}>
          <ProgressRing current={caloriesIn} target={target} />
        </View>
        <View style={styles.macroRow}>
          <View style={styles.macroItem}>
            <Text style={styles.macroValue}>{Math.round(totalProtein)}g</Text>
            <Text style={styles.macroLabel}>Proteina</Text>
          </View>
          <View style={styles.macroItem}>
            <Text style={styles.macroValue}>{Math.round(totalCarbs)}g</Text>
            <Text style={styles.macroLabel}>Carbos</Text>
          </View>
          <View style={styles.macroItem}>
            <Text style={styles.macroValue}>{Math.round(totalFat)}g</Text>
            <Text style={styles.macroLabel}>Grasa</Text>
          </View>
        </View>
      </Card>

      {/* Today's Balance */}
      <Card style={{ marginBottom: 12 }}>
        <Text style={styles.cardTitle}>Balance del dia</Text>
        <View style={styles.balanceRow}>
          <View style={styles.balanceItem}>
            <Text style={[styles.balanceValue, { color: COLORS.calorieIn }]}>{caloriesIn.toLocaleString()}</Text>
            <Text style={styles.balanceLabel}>Consumido</Text>
          </View>
          <View style={styles.balanceItem}>
            <Text style={[styles.balanceValue, { color: COLORS.calorieOut }]}>{caloriesOut.toLocaleString()}</Text>
            <Text style={styles.balanceLabel}>TDEE</Text>
          </View>
          <View style={styles.balanceItem}>
            <Text style={[styles.balanceValue, { color: netBalance <= 0 ? COLORS.deficit : COLORS.surplus }]}>
              {netBalance > 0 ? '+' : ''}{netBalance.toLocaleString()}
            </Text>
            <Text style={styles.balanceLabel}>Neto</Text>
          </View>
        </View>
        {remaining > 0 && (
          <Text style={styles.remaining}>Te quedan {remaining.toLocaleString()} kcal por consumir</Text>
        )}
      </Card>

      {/* Weekly Summary */}
      <Card style={{ marginBottom: 12 }}>
        <Text style={styles.cardTitle}>Resumen semanal</Text>
        <View style={styles.weekBar}>
          {Array.from({ length: 7 }, (_, i) => {
            const d = subDays(new Date(), 6 - i);
            const dateStr = toDateString(d);
            const summary = weeklySummaries.find(s => s.date === dateStr);
            const bal = summary?.net_balance ?? 0;
            const maxBal = 1500;
            const height = Math.min(Math.abs(bal) / maxBal * 60, 60);
            const isDeficit = bal <= 0;
            return (
              <View key={i} style={styles.weekBarCol}>
                <View style={styles.barContainer}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: Math.max(height, 4),
                        backgroundColor: isDeficit ? COLORS.deficit : COLORS.surplus,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.weekDay}>{format(d, 'EEE').charAt(0)}</Text>
              </View>
            );
          })}
        </View>
        <Text style={styles.weeklyStat}>
          Deficit semanal: {weeklyDeficit.toLocaleString()} kcal (~{weeklyKg} kg)
        </Text>
      </Card>

      {/* Weight Progress */}
      <Card style={{ marginBottom: 12 }}>
        <Text style={styles.cardTitle}>Progreso de peso</Text>
        <View style={styles.weightRow}>
          <View style={styles.weightItem}>
            <Text style={styles.weightValue}>{profile?.current_weight_kg ?? '—'}</Text>
            <Text style={styles.weightLabel}>Inicio</Text>
          </View>
          <View style={styles.weightItem}>
            <Text style={[styles.weightValue, { color: COLORS.primary }]}>
              {latestWeight?.weight_kg ?? '—'}
            </Text>
            <Text style={styles.weightLabel}>Actual</Text>
          </View>
          <View style={styles.weightItem}>
            <Text style={styles.weightValue}>{profile?.target_weight_kg ?? '—'}</Text>
            <Text style={styles.weightLabel}>Meta</Text>
          </View>
        </View>
        {profile && latestWeight && (
          <View style={styles.progressBarContainer}>
            <View
              style={[
                styles.progressBar,
                {
                  width: `${Math.min(
                    Math.max(
                      ((profile.current_weight_kg - latestWeight.weight_kg) /
                        (profile.current_weight_kg - profile.target_weight_kg)) *
                        100,
                      0
                    ),
                    100
                  )}%`,
                },
              ]}
            />
          </View>
        )}
      </Card>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity style={styles.quickBtn} onPress={() => router.push('/(tabs)/log-food')}>
          <Text style={styles.quickBtnIcon}>+</Text>
          <Text style={styles.quickBtnText}>Registrar comida</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickBtn} onPress={() => router.push('/(tabs)/weight')}>
          <Text style={styles.quickBtnIcon}>+</Text>
          <Text style={styles.quickBtnText}>Registrar peso</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  container: { padding: 16 },
  greeting: { fontSize: 24, fontWeight: '700', color: COLORS.text },
  date: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 16 },
  ringCard: { marginBottom: 12, alignItems: 'center' },
  ringCenter: { marginVertical: 8 },
  macroRow: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginTop: 12 },
  macroItem: { alignItems: 'center' },
  macroValue: { fontSize: 18, fontWeight: '600', color: COLORS.text },
  macroLabel: { fontSize: 12, color: COLORS.textSecondary },
  cardTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginBottom: 12 },
  balanceRow: { flexDirection: 'row', justifyContent: 'space-around' },
  balanceItem: { alignItems: 'center' },
  balanceValue: { fontSize: 20, fontWeight: '700' },
  balanceLabel: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  remaining: { textAlign: 'center', color: COLORS.textSecondary, fontSize: 13, marginTop: 12 },
  weekBar: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: 80 },
  weekBarCol: { alignItems: 'center', flex: 1 },
  barContainer: { height: 60, justifyContent: 'flex-end' },
  bar: { width: 20, borderRadius: 4 },
  weekDay: { fontSize: 11, color: COLORS.textSecondary, marginTop: 4 },
  weeklyStat: { textAlign: 'center', fontSize: 13, color: COLORS.textSecondary, marginTop: 12 },
  weightRow: { flexDirection: 'row', justifyContent: 'space-around' },
  weightItem: { alignItems: 'center' },
  weightValue: { fontSize: 22, fontWeight: '700', color: COLORS.text },
  weightLabel: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  progressBarContainer: {
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    marginTop: 16,
    overflow: 'hidden',
  },
  progressBar: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 4 },
  quickActions: { flexDirection: 'row', gap: 12, marginTop: 4 },
  quickBtn: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  quickBtnIcon: { color: '#fff', fontSize: 20, fontWeight: '700' },
  quickBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
