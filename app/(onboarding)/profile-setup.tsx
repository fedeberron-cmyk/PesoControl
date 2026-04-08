import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Input } from '@/src/components/ui/Input';
import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { COLORS, ACTIVITY_LABELS } from '@/src/lib/constants';
import { calculateBMR, calculateTDEE, ActivityLevel } from '@/src/utils/calories';
import { useAuth } from '@/src/context/AuthContext';
import { createProfile } from '@/src/services/profile.service';

const ACTIVITY_LEVELS: ActivityLevel[] = ['sedentary', 'light', 'moderate', 'active', 'very_active'];

export default function ProfileSetupScreen() {
  const router = useRouter();
  const { user, refreshProfile } = useAuth();
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [sex, setSex] = useState<'male' | 'female'>('male');
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [targetWeightKg, setTargetWeightKg] = useState('');
  const [targetMonths, setTargetMonths] = useState('3');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('moderate');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const ageNum = parseInt(age) || 0;
  const heightNum = parseFloat(heightCm) || 0;
  const weightNum = parseFloat(weightKg) || 0;
  const targetNum = parseFloat(targetWeightKg) || 0;

  const bmr = ageNum && heightNum && weightNum
    ? calculateBMR(sex, weightNum, heightNum, ageNum)
    : 0;
  const tdee = bmr ? calculateTDEE(bmr, activityLevel) : 0;

  const handleSave = async () => {
    if (!name || !ageNum || !heightNum || !weightNum || !targetNum) {
      setError('Completa todos los campos');
      return;
    }
    if (ageNum < 13 || ageNum > 120) {
      setError('Edad debe ser entre 13 y 120');
      return;
    }

    setLoading(true);
    setError('');

    const months = parseInt(targetMonths) || 3;
    const targetDate = new Date();
    targetDate.setMonth(targetDate.getMonth() + months);

    try {
      await createProfile(user!.id, {
        name,
        age: ageNum,
        sex,
        height_cm: heightNum,
        current_weight_kg: weightNum,
        target_weight_kg: targetNum,
        target_date: targetDate.toISOString().split('T')[0],
        activity_level: activityLevel,
      });
      await refreshProfile();
    } catch (e: any) {
      setError(e.message || 'Error al guardar');
    }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Tu perfil</Text>
        <Text style={styles.subtitle}>Necesitamos algunos datos para calcular tus calorias</Text>

        <Input label="Nombre" placeholder="Tu nombre" value={name} onChangeText={setName} />

        <View style={styles.row}>
          <Input
            label="Edad"
            placeholder="30"
            value={age}
            onChangeText={setAge}
            keyboardType="number-pad"
            containerStyle={styles.flex}
          />
          <View style={[styles.flex, { marginBottom: 16 }]}>
            <Text style={styles.label}>Sexo</Text>
            <View style={styles.segmented}>
              <TouchableOpacity
                style={[styles.segment, sex === 'male' && styles.segmentActive]}
                onPress={() => setSex('male')}
              >
                <Text style={[styles.segmentText, sex === 'male' && styles.segmentTextActive]}>
                  Masculino
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.segment, sex === 'female' && styles.segmentActive]}
                onPress={() => setSex('female')}
              >
                <Text style={[styles.segmentText, sex === 'female' && styles.segmentTextActive]}>
                  Femenino
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.row}>
          <Input
            label="Altura (cm)"
            placeholder="175"
            value={heightCm}
            onChangeText={setHeightCm}
            keyboardType="decimal-pad"
            containerStyle={styles.flex}
          />
          <Input
            label="Peso actual (kg)"
            placeholder="85"
            value={weightKg}
            onChangeText={setWeightKg}
            keyboardType="decimal-pad"
            containerStyle={styles.flex}
          />
        </View>

        <Text style={[styles.label, { marginBottom: 8 }]}>Nivel de actividad</Text>
        {ACTIVITY_LEVELS.map((level) => (
          <TouchableOpacity
            key={level}
            style={[styles.activityOption, activityLevel === level && styles.activityActive]}
            onPress={() => setActivityLevel(level)}
          >
            <Text style={[styles.activityText, activityLevel === level && styles.activityTextActive]}>
              {ACTIVITY_LABELS[level]}
            </Text>
          </TouchableOpacity>
        ))}

        {tdee > 0 && (
          <Card style={{ marginTop: 16 }}>
            <Text style={styles.tdeeLabel}>Tu gasto calorico diario estimado (TDEE)</Text>
            <Text style={styles.tdeeValue}>{tdee.toLocaleString()} kcal/dia</Text>
          </Card>
        )}

        <View style={[styles.row, { marginTop: 16 }]}>
          <Input
            label="Peso meta (kg)"
            placeholder="75"
            value={targetWeightKg}
            onChangeText={setTargetWeightKg}
            keyboardType="decimal-pad"
            containerStyle={styles.flex}
          />
          <Input
            label="Plazo (meses)"
            placeholder="3"
            value={targetMonths}
            onChangeText={setTargetMonths}
            keyboardType="number-pad"
            containerStyle={styles.flex}
          />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button
          title="Comenzar"
          onPress={handleSave}
          loading={loading}
          style={{ marginTop: 16, marginBottom: 40 }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 24, paddingTop: 60 },
  title: { fontSize: 28, fontWeight: '800', color: COLORS.text },
  subtitle: { fontSize: 16, color: COLORS.textSecondary, marginBottom: 24, marginTop: 4 },
  row: { flexDirection: 'row', gap: 12 },
  label: { fontSize: 14, fontWeight: '500', color: COLORS.text },
  segmented: { flexDirection: 'row', borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, overflow: 'hidden', marginTop: 6 },
  segment: { flex: 1, paddingVertical: 12, alignItems: 'center', backgroundColor: COLORS.surface },
  segmentActive: { backgroundColor: COLORS.primary },
  segmentText: { fontSize: 14, color: COLORS.text },
  segmentTextActive: { color: '#fff', fontWeight: '600' },
  activityOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: COLORS.surface,
  },
  activityActive: { borderColor: COLORS.primary, backgroundColor: '#ECFDF5' },
  activityText: { fontSize: 14, color: COLORS.text },
  activityTextActive: { color: COLORS.primary, fontWeight: '600' },
  tdeeLabel: { fontSize: 14, color: COLORS.textSecondary },
  tdeeValue: { fontSize: 28, fontWeight: '700', color: COLORS.primary, marginTop: 4 },
  error: { color: COLORS.danger, textAlign: 'center', marginTop: 8 },
});
