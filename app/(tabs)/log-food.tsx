import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  Modal, Alert, ActivityIndicator, Image, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { useAuth } from '@/src/context/AuthContext';
import { Card } from '@/src/components/ui/Card';
import { Button } from '@/src/components/ui/Button';
import { Input } from '@/src/components/ui/Input';
import { COLORS, MEAL_LABELS, MEAL_TYPES } from '@/src/lib/constants';
import { FoodEntry } from '@/src/types/database';
import { addFoodEntry, getFoodEntriesByDate, deleteFoodEntry, getRecentFoods } from '@/src/services/food.service';
import { searchFoods, OpenFoodFactsProduct } from '@/src/lib/openfoodfacts';
import { createFoodVisionProvider, FoodAnalysisItem } from '@/src/lib/gemini';
import { upsertDailySummary } from '@/src/services/summary.service';
import { toDateString, formatDate } from '@/src/utils/formatting';
import { addDays, subDays } from 'date-fns';

type MealType = typeof MEAL_TYPES[number];

export default function LogFoodScreen() {
  const { user, profile } = useAuth();
  const insets = useSafeAreaInsets();
  const [date, setDate] = useState(new Date());
  const [entries, setEntries] = useState<FoodEntry[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [showAiReview, setShowAiReview] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<MealType>('breakfast');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<OpenFoodFactsProduct[]>([]);
  const [searching, setSearching] = useState(false);
  const [recentFoods, setRecentFoods] = useState<any[]>([]);

  // Manual entry state
  const [manualName, setManualName] = useState('');
  const [manualCalories, setManualCalories] = useState('');
  const [manualProtein, setManualProtein] = useState('');
  const [manualCarbs, setManualCarbs] = useState('');
  const [manualFat, setManualFat] = useState('');
  const [savingEntry, setSavingEntry] = useState(false);

  // AI state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResults, setAiResults] = useState<FoodAnalysisItem[]>([]);
  const [aiPhotoUri, setAiPhotoUri] = useState('');
  const [aiNotes, setAiNotes] = useState('');
  const [showAiNotes, setShowAiNotes] = useState(false);

  const dateStr = toDateString(date);
  const caloriesIn = entries.reduce((sum, e) => sum + e.calories, 0);
  const target = profile?.daily_calorie_target ?? 2000;

  const loadEntries = useCallback(async () => {
    if (!user) return;
    const data = await getFoodEntriesByDate(user.id, dateStr);
    setEntries(data);
  }, [user, dateStr]);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  useEffect(() => {
    if (!user) return;
    getRecentFoods(user.id).then(setRecentFoods);
  }, [user]);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    const results = await searchFoods(query);
    setSearchResults(results);
    setSearching(false);
  };

  const handleSelectProduct = (product: OpenFoodFactsProduct) => {
    const n = product.nutriments;
    setManualName(product.product_name_es || product.product_name || '');
    setManualCalories(String(Math.round(n['energy-kcal_100g'] ?? 0)));
    setManualProtein(String(Math.round(n.proteins_100g ?? 0)));
    setManualCarbs(String(Math.round(n.carbohydrates_100g ?? 0)));
    setManualFat(String(Math.round(n.fat_100g ?? 0)));
    setShowSearch(false);
    setShowManual(true);
  };

  const handleSaveManual = async () => {
    if (!user || !manualName || !manualCalories) return;
    setSavingEntry(true);
    try {
      await addFoodEntry(user.id, {
        date: dateStr,
        meal_type: selectedMeal,
        name: manualName,
        calories: parseInt(manualCalories) || 0,
        protein_g: parseFloat(manualProtein) || 0,
        carbs_g: parseFloat(manualCarbs) || 0,
        fat_g: parseFloat(manualFat) || 0,
      });
      await updateSummary();
      await loadEntries();
      resetManualForm();
      setShowManual(false);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
    setSavingEntry(false);
  };

  const handleDeleteEntry = async (id: string) => {
    Alert.alert('Eliminar', 'Eliminar esta entrada?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          await deleteFoodEntry(id);
          await updateSummary();
          await loadEntries();
        },
      },
    ]);
  };

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso necesario', 'Necesitamos acceso a la camara');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      base64: false,
    });
    if (!result.canceled && result.assets[0]) {
      setAiPhotoUri(result.assets[0].uri);
      setShowAiNotes(true);
    }
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      base64: false,
    });
    if (!result.canceled && result.assets[0]) {
      setAiPhotoUri(result.assets[0].uri);
      setShowAiNotes(true);
    }
  };

  const handleAnalyzePhoto = async () => {
    setShowAiNotes(false);
    setAiLoading(true);
    try {
      const base64 = await FileSystem.readAsStringAsync(aiPhotoUri, {
        encoding: 'base64' as any,
      });
      const provider = createFoodVisionProvider();
      const result = await provider.analyzeFoodPhoto(base64, 'image/jpeg', aiNotes || undefined);
      setAiResults(result.items);
      setShowAiReview(true);
    } catch (e: any) {
      Alert.alert('Error al analizar', e.message || 'No se pudo analizar la foto');
    }
    setAiLoading(false);
  };

  const handleSaveAiResults = async () => {
    if (!user) return;
    setSavingEntry(true);
    try {
      for (const item of aiResults) {
        await addFoodEntry(user.id, {
          date: dateStr,
          meal_type: selectedMeal,
          name: item.name,
          calories: Math.round(item.estimatedCalories),
          protein_g: Math.round(item.estimatedProteinG),
          carbs_g: Math.round(item.estimatedCarbsG),
          fat_g: Math.round(item.estimatedFatG),
          fiber_g: Math.round(item.estimatedFiberG),
          ai_estimated: true,
          notes: item.servingDescription,
        });
      }
      await updateSummary();
      await loadEntries();
      setShowAiReview(false);
      setAiResults([]);
      setAiPhotoUri('');
      setAiNotes('');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
    setSavingEntry(false);
  };

  const updateSummary = async () => {
    if (!user || !profile) return;
    const updatedEntries = await getFoodEntriesByDate(user.id, dateStr);
    const totalCalIn = updatedEntries.reduce((sum, e) => sum + e.calories, 0);
    await upsertDailySummary(user.id, dateStr, totalCalIn, profile.tdee, profile.current_weight_kg);
  };

  const resetManualForm = () => {
    setManualName('');
    setManualCalories('');
    setManualProtein('');
    setManualCarbs('');
    setManualFat('');
  };

  const openAddForMeal = (meal: MealType) => {
    setSelectedMeal(meal);
    setShowSearch(true);
  };

  const getMealEntries = (meal: MealType) => entries.filter(e => e.meal_type === meal);
  const getMealCalories = (meal: MealType) => getMealEntries(meal).reduce((s, e) => s + e.calories, 0);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setDate(subDays(date, 1))}>
          <Ionicons name="chevron-back" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.dateText}>{formatDate(date)}</Text>
        <TouchableOpacity onPress={() => setDate(addDays(date, 1))}>
          <Ionicons name="chevron-forward" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        <TouchableOpacity onPress={handleTakePhoto} style={styles.cameraBtn}>
          <Ionicons name="camera" size={22} color={COLORS.primary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={handlePickImage} style={styles.cameraBtn}>
          <Ionicons name="image" size={22} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {aiLoading && (
        <View style={styles.aiLoadingBar}>
          <ActivityIndicator size="small" color="#fff" />
          <Text style={styles.aiLoadingText}>Analizando foto...</Text>
        </View>
      )}

      {/* Meal Sections */}
      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 100 }}>
        {MEAL_TYPES.map((meal) => {
          const mealEntries = getMealEntries(meal);
          const mealCal = getMealCalories(meal);
          return (
            <Card key={meal} style={styles.mealCard}>
              <View style={styles.mealHeader}>
                <Text style={styles.mealTitle}>{MEAL_LABELS[meal]}</Text>
                <Text style={styles.mealCal}>{mealCal} kcal</Text>
              </View>
              {mealEntries.map((entry) => (
                <TouchableOpacity
                  key={entry.id}
                  style={styles.entryRow}
                  onLongPress={() => handleDeleteEntry(entry.id)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.entryName}>
                      {entry.ai_estimated ? '🤖 ' : ''}{entry.name}
                    </Text>
                    {(entry.protein_g || entry.carbs_g || entry.fat_g) ? (
                      <Text style={styles.entryMacros}>
                        P:{Math.round(entry.protein_g)}g C:{Math.round(entry.carbs_g)}g G:{Math.round(entry.fat_g)}g
                      </Text>
                    ) : null}
                  </View>
                  <Text style={styles.entryCal}>{entry.calories}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={styles.addBtn} onPress={() => openAddForMeal(meal)}>
                <Ionicons name="add" size={18} color={COLORS.primary} />
                <Text style={styles.addBtnText}>Agregar</Text>
              </TouchableOpacity>
            </Card>
          );
        })}
      </ScrollView>

      {/* Bottom Summary */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 8 }]}>
        <View style={styles.bottomItem}>
          <Text style={styles.bottomValue}>{caloriesIn.toLocaleString()}</Text>
          <Text style={styles.bottomLabel}>Consumido</Text>
        </View>
        <View style={styles.bottomItem}>
          <Text style={styles.bottomValue}>{target.toLocaleString()}</Text>
          <Text style={styles.bottomLabel}>Meta</Text>
        </View>
        <View style={styles.bottomItem}>
          <Text style={[styles.bottomValue, { color: target - caloriesIn >= 0 ? COLORS.deficit : COLORS.surplus }]}>
            {(target - caloriesIn).toLocaleString()}
          </Text>
          <Text style={styles.bottomLabel}>Restante</Text>
        </View>
      </View>

      {/* Search Modal */}
      <Modal visible={showSearch} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modal, { paddingTop: insets.top + 16 }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Agregar a {MEAL_LABELS[selectedMeal]}</Text>
            <TouchableOpacity onPress={() => { setShowSearch(false); setSearchQuery(''); setSearchResults([]); }}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.searchInput}
            placeholder="Buscar alimento..."
            value={searchQuery}
            onChangeText={handleSearch}
            autoFocus
            placeholderTextColor={COLORS.textSecondary}
          />

          {searching && <ActivityIndicator style={{ marginTop: 16 }} color={COLORS.primary} />}

          <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
            {searchResults.length > 0 ? (
              searchResults.map((p, i) => (
                <TouchableOpacity key={`${p.code}-${i}`} style={styles.searchResult} onPress={() => handleSelectProduct(p)}>
                  <Text style={styles.resultName} numberOfLines={1}>{p.product_name_es || p.product_name}</Text>
                  <Text style={styles.resultCal}>{Math.round(p.nutriments['energy-kcal_100g'] ?? 0)} kcal/100g</Text>
                </TouchableOpacity>
              ))
            ) : searchQuery.length < 2 && recentFoods.length > 0 ? (
              <>
                <Text style={styles.sectionTitle}>Recientes</Text>
                {recentFoods.map((f, i) => (
                  <TouchableOpacity
                    key={i}
                    style={styles.searchResult}
                    onPress={() => {
                      setManualName(f.name);
                      setManualCalories(String(f.calories));
                      setManualProtein(String(f.protein_g || 0));
                      setManualCarbs(String(f.carbs_g || 0));
                      setManualFat(String(f.fat_g || 0));
                      setShowSearch(false);
                      setShowManual(true);
                    }}
                  >
                    <Text style={styles.resultName}>{f.name}</Text>
                    <Text style={styles.resultCal}>{f.calories} kcal</Text>
                  </TouchableOpacity>
                ))}
              </>
            ) : null}

            <TouchableOpacity
              style={styles.manualEntryBtn}
              onPress={() => { setShowSearch(false); resetManualForm(); setShowManual(true); }}
            >
              <Ionicons name="create-outline" size={20} color={COLORS.primary} />
              <Text style={styles.manualEntryText}>Entrada manual</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Manual Entry Modal */}
      <Modal visible={showManual} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView style={[styles.modal, { paddingTop: insets.top + 16 }]} keyboardShouldPersistTaps="handled">
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Registrar alimento</Text>
              <TouchableOpacity onPress={() => setShowManual(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <Input label="Nombre" value={manualName} onChangeText={setManualName} placeholder="Ej. Huevos revueltos" />
            <Input label="Calorias (kcal)" value={manualCalories} onChangeText={setManualCalories} keyboardType="number-pad" placeholder="0" />

            <Text style={styles.sectionTitle}>Macronutrientes (opcionales)</Text>
            <View style={styles.macroInputRow}>
              <Input label="Proteina (g)" value={manualProtein} onChangeText={setManualProtein} keyboardType="decimal-pad" containerStyle={{ flex: 1 }} />
              <Input label="Carbos (g)" value={manualCarbs} onChangeText={setManualCarbs} keyboardType="decimal-pad" containerStyle={{ flex: 1 }} />
              <Input label="Grasa (g)" value={manualFat} onChangeText={setManualFat} keyboardType="decimal-pad" containerStyle={{ flex: 1 }} />
            </View>

            <Button title="Guardar" onPress={handleSaveManual} loading={savingEntry} style={{ marginTop: 8 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* AI Notes Modal */}
      <Modal visible={showAiNotes} animationType="fade" transparent>
        <View style={styles.overlay}>
          <View style={styles.aiNotesCard}>
            {aiPhotoUri ? (
              <Image source={{ uri: aiPhotoUri }} style={styles.aiPreview} />
            ) : null}
            <Input
              label="Comentarios para la IA (opcional)"
              placeholder="Ej. Es una torta de jamon con aguacate, pesa aprox 300g"
              value={aiNotes}
              onChangeText={setAiNotes}
              multiline
              numberOfLines={3}
            />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Button
                title="Cancelar"
                variant="secondary"
                onPress={() => { setShowAiNotes(false); setAiPhotoUri(''); setAiNotes(''); }}
                style={{ flex: 1 }}
              />
              <Button title="Analizar" onPress={handleAnalyzePhoto} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>

      {/* AI Review Modal */}
      <Modal visible={showAiReview} animationType="slide" presentationStyle="pageSheet">
        <ScrollView style={[styles.modal, { paddingTop: insets.top + 16 }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Resultados del analisis</Text>
            <TouchableOpacity onPress={() => { setShowAiReview(false); setAiResults([]); }}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          {aiPhotoUri ? <Image source={{ uri: aiPhotoUri }} style={styles.aiReviewImage} /> : null}

          {aiResults.map((item, i) => (
            <Card key={i} style={{ marginBottom: 8 }}>
              <Text style={styles.aiItemName}>{item.name}</Text>
              <Text style={styles.aiItemServing}>{item.servingDescription}</Text>
              <View style={styles.aiMacroRow}>
                <Text style={styles.aiMacro}>{Math.round(item.estimatedCalories)} kcal</Text>
                <Text style={styles.aiMacro}>P:{Math.round(item.estimatedProteinG)}g</Text>
                <Text style={styles.aiMacro}>C:{Math.round(item.estimatedCarbsG)}g</Text>
                <Text style={styles.aiMacro}>G:{Math.round(item.estimatedFatG)}g</Text>
              </View>
            </Card>
          ))}

          <Text style={styles.aiTotal}>
            Total: {aiResults.reduce((s, i) => s + Math.round(i.estimatedCalories), 0)} kcal
          </Text>

          <Button
            title={`Guardar ${aiResults.length} alimento(s) en ${MEAL_LABELS[selectedMeal]}`}
            onPress={handleSaveAiResults}
            loading={savingEntry}
            style={{ marginTop: 8, marginBottom: 40 }}
          />
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  dateText: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  cameraBtn: { padding: 8 },
  aiLoadingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    gap: 8,
  },
  aiLoadingText: { color: '#fff', fontSize: 14 },
  content: { flex: 1, paddingHorizontal: 16 },
  mealCard: { marginBottom: 12 },
  mealHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  mealTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  mealCal: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  entryName: { fontSize: 14, color: COLORS.text },
  entryMacros: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  entryCal: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  addBtn: { flexDirection: 'row', alignItems: 'center', paddingTop: 10, gap: 4 },
  addBtnText: { fontSize: 14, color: COLORS.primary, fontWeight: '500' },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: COLORS.surface,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  bottomItem: { alignItems: 'center' },
  bottomValue: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  bottomLabel: { fontSize: 11, color: COLORS.textSecondary },
  modal: { flex: 1, backgroundColor: COLORS.background, padding: 16 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  searchInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.text,
    backgroundColor: COLORS.surface,
  },
  searchResult: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  resultName: { fontSize: 15, color: COLORS.text, flex: 1, marginRight: 8 },
  resultCal: { fontSize: 13, color: COLORS.textSecondary },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary, marginTop: 16, marginBottom: 8 },
  manualEntryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
    marginTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  manualEntryText: { fontSize: 15, color: COLORS.primary, fontWeight: '500' },
  macroInputRow: { flexDirection: 'row', gap: 8 },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  aiNotesCard: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 16 },
  aiPreview: { width: '100%', height: 200, borderRadius: 12, marginBottom: 16 },
  aiReviewImage: { width: '100%', height: 200, borderRadius: 12, marginBottom: 16 },
  aiItemName: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  aiItemServing: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  aiMacroRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  aiMacro: { fontSize: 13, color: COLORS.text, fontWeight: '500' },
  aiTotal: { fontSize: 16, fontWeight: '600', textAlign: 'center', color: COLORS.text, marginTop: 8 },
});
