import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/src/context/AuthContext';
import { Card } from '@/src/components/ui/Card';
import { Button } from '@/src/components/ui/Button';
import { Input } from '@/src/components/ui/Input';
import { COLORS, ACTIVITY_LABELS } from '@/src/lib/constants';
import { updateProfile } from '@/src/services/profile.service';
import { formatWeight } from '@/src/utils/formatting';

export default function ProfileScreen() {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const insets = useSafeAreaInsets();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(profile?.name ?? '');
  const [age, setAge] = useState(String(profile?.age ?? ''));
  const [heightCm, setHeightCm] = useState(String(profile?.height_cm ?? ''));
  const [targetWeight, setTargetWeight] = useState(String(profile?.target_weight_kg ?? ''));
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateProfile(user.id, {
        name,
        age: parseInt(age) || profile?.age,
        height_cm: parseFloat(heightCm) || profile?.height_cm,
        target_weight_kg: parseFloat(targetWeight) || profile?.target_weight_kg,
      });
      await refreshProfile();
      setEditing(false);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
    setSaving(false);
  };

  const handleSignOut = () => {
    Alert.alert('Cerrar sesion', 'Estas seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar sesion', style: 'destructive', onPress: signOut },
    ]);
  };

  if (!profile) return null;

  const bmr = profile.tdee / {
    sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9
  }[profile.activity_level];

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.container, { paddingTop: insets.top + 16 }]}
    >
      <Text style={styles.title}>Perfil</Text>

      {/* User Info */}
      <Card style={{ marginBottom: 12 }}>
        <Text style={styles.name}>{profile.name}</Text>
        <Text style={styles.email}>{user?.email}</Text>
      </Card>

      {/* Stats */}
      {editing ? (
        <Card style={{ marginBottom: 12 }}>
          <Text style={styles.cardTitle}>Editar perfil</Text>
          <Input label="Nombre" value={name} onChangeText={setName} />
          <Input label="Edad" value={age} onChangeText={setAge} keyboardType="number-pad" />
          <Input label="Altura (cm)" value={heightCm} onChangeText={setHeightCm} keyboardType="decimal-pad" />
          <Input label="Peso meta (kg)" value={targetWeight} onChangeText={setTargetWeight} keyboardType="decimal-pad" />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button title="Cancelar" variant="secondary" onPress={() => setEditing(false)} style={{ flex: 1 }} />
            <Button title="Guardar" onPress={handleSave} loading={saving} style={{ flex: 1 }} />
          </View>
        </Card>
      ) : (
        <Card style={{ marginBottom: 12 }}>
          <Text style={styles.cardTitle}>Datos personales</Text>
          <View style={styles.statGrid}>
            <StatItem label="Edad" value={`${profile.age} anos`} />
            <StatItem label="Sexo" value={profile.sex === 'male' ? 'Masculino' : 'Femenino'} />
            <StatItem label="Altura" value={`${profile.height_cm} cm`} />
            <StatItem label="Peso actual" value={formatWeight(profile.current_weight_kg)} />
            <StatItem label="Actividad" value={ACTIVITY_LABELS[profile.activity_level]?.split('(')[0]?.trim() ?? ''} />
          </View>
          <Button title="Editar" variant="secondary" onPress={() => setEditing(true)} style={{ marginTop: 12 }} />
        </Card>
      )}

      {/* TDEE */}
      <Card style={{ marginBottom: 12 }}>
        <Text style={styles.cardTitle}>Gasto calorico</Text>
        <View style={styles.statGrid}>
          <StatItem label="TMB" value={`${Math.round(bmr)} kcal`} />
          <StatItem label="TDEE" value={`${profile.tdee} kcal`} />
          <StatItem label="Meta diaria" value={`${profile.daily_calorie_target} kcal`} />
        </View>
      </Card>

      {/* Goal */}
      <Card style={{ marginBottom: 12 }}>
        <Text style={styles.cardTitle}>Meta</Text>
        <View style={styles.statGrid}>
          <StatItem label="Peso meta" value={formatWeight(profile.target_weight_kg)} />
          <StatItem label="Fecha meta" value={profile.target_date ?? 'Sin definir'} />
          <StatItem
            label="Deficit diario"
            value={`${profile.tdee - profile.daily_calorie_target} kcal`}
          />
        </View>
      </Card>

      <Button
        title="Cerrar sesion"
        variant="danger"
        onPress={handleSignOut}
        style={{ marginBottom: 40 }}
      />
    </ScrollView>
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  container: { padding: 16 },
  title: { fontSize: 24, fontWeight: '700', color: COLORS.text, marginBottom: 16 },
  name: { fontSize: 20, fontWeight: '600', color: COLORS.text },
  email: { fontSize: 14, color: COLORS.textSecondary, marginTop: 2 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginBottom: 12 },
  statGrid: { gap: 8 },
  statItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  statLabel: { fontSize: 14, color: COLORS.textSecondary },
  statValue: { fontSize: 14, fontWeight: '500', color: COLORS.text },
});
