import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView, StatusBar,
  TextInput, ScrollView, Alert, ActivityIndicator, Vibration,
  KeyboardAvoidingView, Platform, Modal,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { C, RADIUS, RADIUS_SM } from '../theme';
import { CONDITIONS, DESTINATIONS, BARCODE_TYPES, DEFAULT_CONDITION, DEFAULT_DESTINO, nowTimestamp } from '../config';
import { registerPallet } from '../api';
import { getLastDestino, setLastDestino, incrementTodayCount, addRecentPallet } from '../storage';

export default function PalletFormScreen({ navigation, route }) {
  const { palletId: initId, operator, turno, scanned } = route.params;

  // ── State — auto-filled defaults ──
  const [palletId] = useState(initId || '');
  const [items, setItems] = useState([]);
  const [cantidad, setCantidad] = useState('');
  const [conditions, setConditions] = useState([DEFAULT_CONDITION]);
  const [destino, setDestino] = useState('');
  const [pedido, setPedido] = useState('');
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);       // summary vs edit mode

  // SKU modal
  const [skuModal, setSkuModal] = useState(false);
  const [skuManualMode, setSkuManualMode] = useState(false);
  const [skuInput, setSkuInput] = useState('');
  const [skuQty, setSkuQty] = useState('1');
  const [skuScanned, setSkuScanned] = useState(false);
  const skuLastRef = useRef('');
  const itemIdRef = useRef(1);

  // Track all SKU codes added to this pallet (Set for O(1) lookup)
  const skuSetRef = useRef(new Set());

  const [permission] = useCameraPermissions();

  // Auto-fill destino: last used or default
  useEffect(() => {
    getLastDestino().then((v) => setDestino(v || DEFAULT_DESTINO));
  }, []);

  // Auto-open SKU scanner when arriving from pallet scan
  // This is the key: scan pallet → immediately scan SKUs → then confirm
  const autoOpenedRef = useRef(false);
  useEffect(() => {
    if (scanned && !autoOpenedRef.current) {
      autoOpenedRef.current = true;
      // Small delay to let the screen mount and camera permissions load
      const t = setTimeout(() => setSkuModal(true), 400);
      return () => clearTimeout(t);
    }
  }, [scanned]);

  // ═══════════════════════════════════════
  // SKU DUPLICATE CHECK — STRICT BLOCK
  // Uses both Set (fast) and array scan (safe)
  // ═══════════════════════════════════════
  const isSkuDuplicate = (sku) => {
    const normalized = String(sku).trim().toUpperCase();
    if (skuSetRef.current.has(normalized)) return true;
    return items.some((i) => String(i.sku).trim().toUpperCase() === normalized);
  };

  const addSku = (rawSku, rawQty) => {
    const sku = String(rawSku).trim();
    const q = parseInt(rawQty, 10);
    if (!sku) return false;
    if (!q || q < 1) {
      Alert.alert('Error', 'La cantidad debe ser al menos 1');
      return false;
    }

    // BLOCK duplicate
    if (isSkuDuplicate(sku)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Vibration.vibrate([0, 120, 60, 120]);
      Alert.alert(
        'SKU DUPLICADO',
        `"${sku}" ya fue escaneado en este pallet.\nNo se puede agregar dos veces.`,
      );
      return false;
    }

    const id = itemIdRef.current++;
    setItems((prev) => [...prev, { id, sku, qty: q }]);
    skuSetRef.current.add(sku.toUpperCase());
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Vibration.vibrate(50);

    // Auto-update cantidad with sum of SKU quantities
    setItems((prev) => {
      const sum = [...prev, { qty: q }].reduce((s, i) => s + (i.qty || 0), 0);
      // Actually we already added, so just calculate from state after
      return prev;
    });

    return true;
  };

  // Recalculate cantidad when items change
  useEffect(() => {
    if (items.length > 0) {
      const sum = items.reduce((s, i) => s + i.qty, 0);
      setCantidad(String(sum));
    }
  }, [items]);

  const removeSku = (id, sku) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setItems((prev) => prev.filter((i) => i.id !== id));
    skuSetRef.current.delete(String(sku).trim().toUpperCase());
  };

  const updateSkuQty = (id, delta) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setItems((prev) => prev.map((i) => {
      if (i.id !== id) return i;
      return { ...i, qty: Math.max(1, i.qty + delta) };
    }));
  };

  // ── SKU barcode scanned ──
  const onSkuBarcode = ({ data }) => {
    if (skuScanned || data === skuLastRef.current) return;
    setSkuScanned(true);
    skuLastRef.current = data;

    // BLOCK duplicate immediately at scan time
    if (isSkuDuplicate(data)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Vibration.vibrate([0, 120, 60, 120]);
      Alert.alert(
        'SKU DUPLICADO',
        `"${data}" ya fue escaneado en este pallet.`,
        [{ text: 'OK', onPress: () => { setSkuScanned(false); skuLastRef.current = ''; } }],
      );
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Vibration.vibrate(80);
    setSkuInput(data);
    setSkuManualMode(true); // Show qty input
    setTimeout(() => { setSkuScanned(false); skuLastRef.current = ''; }, 1200);
  };

  const confirmSkuAdd = () => {
    const sku = skuInput.trim();
    if (!sku) { Alert.alert('Error', 'Ingresa un SKU'); return; }
    const q = parseInt(skuQty, 10);
    if (!q || q < 1) { Alert.alert('Error', 'Cantidad mínima: 1'); return; }
    if (addSku(sku, q)) {
      setSkuInput('');
      setSkuQty('1');
      setSkuManualMode(false);
    }
  };

  const closeSkuModal = () => {
    setSkuModal(false);
    setSkuManualMode(false);
    setSkuInput('');
    setSkuQty('1');
    setSkuScanned(false);
    skuLastRef.current = '';
  };

  // ── Toggles ──
  const toggleCond = (code) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setConditions((prev) => prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]);
  };

  const pickDestino = (val) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDestino(val);
  };

  // ═══════════════════════════════════════
  // SUBMIT
  // ═══════════════════════════════════════
  const handleSubmit = async () => {
    const qty = parseInt(cantidad, 10);
    if (!palletId || palletId.trim().length < 4) {
      Alert.alert('Error', 'Pallet ID inválido'); return;
    }
    if (!qty || qty < 1) {
      Alert.alert('Falta cantidad', 'Ingresa la cantidad total'); return;
    }
    if (conditions.length === 0) {
      Alert.alert('Falta condición', 'Selecciona al menos una'); return;
    }
    if (!destino) {
      Alert.alert('Falta destino', 'Selecciona destino'); return;
    }

    setLoading(true);
    try {
      const result = await registerPallet({
        palletId: palletId.trim(),
        cantidad: qty,
        items,
        condicion: conditions,
        destino,
        turno,
        operador: operator,
        pedido,
      });

      await setLastDestino(destino);

      // Local counter + history (works even if backend is offline)
      const newCount = await incrementTodayCount(operator);
      const todayKeyStr = (() => {
        const d = new Date();
        return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
      })();
      await addRecentPallet({
        _day: todayKeyStr,
        id: Date.now(),
        pallet_id: palletId.trim(),
        cantidad: qty,
        destino,
        condicion: conditions.join(', '),
        turno: turno === 'Day' ? 'Day (día)' : 'Night (noche)',
        operator,
        fecha: nowTimestamp(),
        items: items.map((i) => ({ sku: i.sku, cantidad: i.qty })),
      });

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Vibration.vibrate(200);

      Alert.alert(
        'Registrado',
        `${palletId} · ${qty} uds · ${destino}\nHoy: ${newCount} pallets`,
        [{ text: 'Siguiente', onPress: () => navigation.popToTop() }],
      );
    } catch {
      Alert.alert('Error', 'No se pudo guardar. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  // ── Derived ──
  const turnoLabel = turno === 'Day' ? 'Día' : 'Noche';
  const condLabel = conditions.join(', ') || '—';
  const qty = parseInt(cantidad, 10) || 0;

  // ═══════════════════════════════════════════════════
  // RENDER — Summary-first, edit on demand
  // ═══════════════════════════════════════════════════
  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="close" size={24} color={C.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{editing ? 'Editar datos' : 'Confirmar registro'}</Text>
        {!editing && (
          <TouchableOpacity onPress={() => setEditing(true)} style={s.editLink}>
            <Ionicons name="create-outline" size={18} color={C.blue} />
          </TouchableOpacity>
        )}
        {editing && (
          <TouchableOpacity onPress={() => setEditing(false)} style={s.editLink}>
            <Text style={{ color: C.blue, fontWeight: '600', fontSize: 13 }}>Listo</Text>
          </TouchableOpacity>
        )}
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={s.scroll} contentContainerStyle={s.scrollInner} keyboardShouldPersistTaps="handled">

          {/* ══════════════════════════════════════ */}
          {/* SUMMARY VIEW (default) */}
          {/* ══════════════════════════════════════ */}
          {!editing && (
            <>
              {/* Pallet ID */}
              <View style={s.summaryCard}>
                <View style={s.summaryRow}>
                  <Text style={s.summaryLabel}>Pallet</Text>
                  <View style={s.palletBadge}>
                    <Ionicons name={scanned ? 'scan' : 'keypad'} size={14} color={C.green} />
                    <Text style={s.palletTxt}>{palletId}</Text>
                  </View>
                </View>

                <View style={s.divider} />

                {/* SKUs */}
                <View style={s.summaryRow}>
                  <Text style={s.summaryLabel}>Contenido</Text>
                  <View style={{ flex: 1, alignItems: 'flex-end' }}>
                    {items.length === 0 ? (
                      <Text style={s.summaryMuted}>Sin SKUs</Text>
                    ) : (
                      items.map((i) => (
                        <Text key={i.id} style={s.summaryVal}>{i.sku} ×{i.qty}</Text>
                      ))
                    )}
                  </View>
                </View>

                {/* Add SKU button inline */}
                <TouchableOpacity style={s.addSkuInline} onPress={() => { setSkuManualMode(false); setSkuModal(true); }}>
                  <Ionicons name="add-circle" size={18} color={C.blue} />
                  <Text style={s.addSkuTxt}>Escanear / agregar SKU</Text>
                </TouchableOpacity>

                <View style={s.divider} />

                {/* Cantidad */}
                <View style={s.summaryRow}>
                  <Text style={s.summaryLabel}>Cantidad</Text>
                  <View style={s.qtyInline}>
                    <TouchableOpacity style={s.qtyBtnSm} onPress={() => setCantidad(String(Math.max(1, qty - 1)))}>
                      <Ionicons name="remove" size={18} color={C.text} />
                    </TouchableOpacity>
                    <TextInput
                      style={s.qtyInputSm}
                      value={cantidad}
                      onChangeText={setCantidad}
                      keyboardType="number-pad"
                      textAlign="center"
                      placeholder="0"
                      placeholderTextColor={C.textMuted}
                    />
                    <TouchableOpacity style={s.qtyBtnSm} onPress={() => setCantidad(String(qty + 1))}>
                      <Ionicons name="add" size={18} color={C.text} />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={s.divider} />

                {/* Condición */}
                <View style={s.summaryRow}>
                  <Text style={s.summaryLabel}>Condición</Text>
                  <Text style={s.summaryVal}>{condLabel}</Text>
                </View>

                <View style={s.divider} />

                {/* Destino */}
                <View style={s.summaryRow}>
                  <Text style={s.summaryLabel}>Destino</Text>
                  <Text style={s.summaryVal}>{destino || '—'}</Text>
                </View>

                <View style={s.divider} />

                {/* Auto fields */}
                <View style={s.summaryRow}>
                  <Text style={s.summaryLabel}>Escaneadora</Text>
                  <Text style={s.summaryAuto}>{operator}</Text>
                </View>
                <View style={s.summaryRow}>
                  <Text style={s.summaryLabel}>Turno</Text>
                  <Text style={s.summaryAuto}>{turnoLabel}</Text>
                </View>
                <View style={s.summaryRow}>
                  <Text style={s.summaryLabel}>Fecha</Text>
                  <Text style={s.summaryAuto}>Hoy (auto)</Text>
                </View>

                {pedido ? (
                  <>
                    <View style={s.divider} />
                    <View style={s.summaryRow}>
                      <Text style={s.summaryLabel}>Pedido</Text>
                      <Text style={s.summaryVal}>{pedido}</Text>
                    </View>
                  </>
                ) : null}
              </View>

              {/* Edit hint */}
              <Text style={s.editHint}>
                Toca el lápiz arriba para editar condición, destino o pedido
              </Text>
            </>
          )}

          {/* ══════════════════════════════════════ */}
          {/* EDIT VIEW */}
          {/* ══════════════════════════════════════ */}
          {editing && (
            <>
              {/* Cantidad */}
              <View style={s.section}>
                <Text style={s.label}>CANTIDAD *</Text>
                <View style={s.qtyRowBig}>
                  <TouchableOpacity style={s.qtyBtnBig} onPress={() => setCantidad(String(Math.max(1, qty - 1)))}>
                    <Ionicons name="remove" size={24} color={C.text} />
                  </TouchableOpacity>
                  <TextInput
                    style={s.qtyInputBig}
                    value={cantidad}
                    onChangeText={setCantidad}
                    keyboardType="number-pad"
                    textAlign="center"
                    placeholder="0"
                    placeholderTextColor={C.textMuted}
                  />
                  <TouchableOpacity style={s.qtyBtnBig} onPress={() => setCantidad(String(qty + 1))}>
                    <Ionicons name="add" size={24} color={C.text} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Condición */}
              <View style={s.section}>
                <Text style={s.label}>CONDICIÓN *</Text>
                <View style={s.chipGrid}>
                  {CONDITIONS.map((c) => {
                    const active = conditions.includes(c.code);
                    return (
                      <TouchableOpacity
                        key={c.code}
                        style={[s.condChip, active && { backgroundColor: c.color, borderColor: c.color }]}
                        onPress={() => toggleCond(c.code)}
                      >
                        <Text style={[s.condTxt, active && { color: '#FFF' }]}>{c.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Destino */}
              <View style={s.section}>
                <Text style={s.label}>DESTINO *</Text>
                <View style={s.destGrid}>
                  {DESTINATIONS.map((d) => {
                    const active = destino === d.value;
                    return (
                      <TouchableOpacity
                        key={d.value}
                        style={[s.destBtn, active && s.destBtnActive]}
                        onPress={() => pickDestino(d.value)}
                      >
                        <Ionicons name={d.icon} size={20} color={active ? '#FFF' : C.textMuted} />
                        <Text style={[s.destTxt, active && { color: '#FFF' }]}>{d.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Pedido */}
              <View style={s.section}>
                <Text style={s.label}>PEDIDO (OPCIONAL)</Text>
                <TextInput
                  style={s.input}
                  value={pedido}
                  onChangeText={setPedido}
                  placeholder="Número de pedido"
                  placeholderTextColor={C.textMuted}
                />
              </View>
            </>
          )}

          {/* ══════════════════════════════════════ */}
          {/* CONFIRM BUTTON — always visible */}
          {/* ══════════════════════════════════════ */}
          <TouchableOpacity
            style={[s.submitBtn, loading && { opacity: 0.5 }]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={24} color="#FFF" />
                <Text style={s.submitTxt}>CONFIRMAR Y GUARDAR</Text>
              </>
            )}
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* ══════════════════════════════════════ */}
      {/* SKU SCANNER MODAL */}
      {/* ══════════════════════════════════════ */}
      <Modal visible={skuModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.modalSafe}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>{skuManualMode ? 'Agregar SKU' : 'Escanear SKU'}</Text>
            <TouchableOpacity onPress={closeSkuModal} style={s.modalClose}>
              <Ionicons name="close" size={24} color={C.text} />
            </TouchableOpacity>
          </View>

          {skuManualMode ? (
            <View style={s.modalBody}>
              <Text style={s.label}>CÓDIGO SKU</Text>
              <TextInput style={s.input} value={skuInput} onChangeText={setSkuInput}
                placeholder="Código del producto" placeholderTextColor={C.textMuted} autoFocus />

              <Text style={[s.label, { marginTop: 16 }]}>CANTIDAD *</Text>
              <View style={s.modalQtyRow}>
                <TouchableOpacity style={s.modalQtyBtn}
                  onPress={() => setSkuQty(String(Math.max(1, (parseInt(skuQty, 10) || 1) - 1)))}>
                  <Ionicons name="remove" size={22} color={C.text} />
                </TouchableOpacity>
                <TextInput style={s.modalQtyInput} value={skuQty} onChangeText={setSkuQty}
                  keyboardType="number-pad" textAlign="center" />
                <TouchableOpacity style={s.modalQtyBtn}
                  onPress={() => setSkuQty(String((parseInt(skuQty, 10) || 1) + 1))}>
                  <Ionicons name="add" size={22} color={C.text} />
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={s.modalAddBtn} onPress={confirmSkuAdd}>
                <Ionicons name="add-circle" size={22} color="#FFF" />
                <Text style={s.modalAddTxt}>Agregar al pallet</Text>
              </TouchableOpacity>

              <TouchableOpacity style={s.switchBtn} onPress={() => { setSkuManualMode(false); setSkuInput(''); setSkuQty('1'); }}>
                <Ionicons name="scan" size={18} color={C.blue} />
                <Text style={s.switchTxt}>Escanear con cámara</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={s.modalCam}>
              {permission?.granted ? (
                <CameraView style={{ flex: 1 }} facing="back"
                  barcodeScannerSettings={{ barcodeTypes: BARCODE_TYPES }}
                  onBarcodeScanned={skuScanned ? undefined : onSkuBarcode} />
              ) : (
                <View style={s.center}><Text style={{ color: C.textSec }}>Cámara no disponible</Text></View>
              )}
              <View style={s.camOverlay}>
                <Text style={s.camHint}>{skuScanned ? 'SKU detectado!' : 'Apunta al código del producto'}</Text>
              </View>
              <View style={s.camBottom}>
                <TouchableOpacity style={s.switchBtn} onPress={() => setSkuManualMode(true)}>
                  <Ionicons name="create-outline" size={18} color={C.blue} />
                  <Text style={s.switchTxt}>Ingresar manualmente</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {items.length > 0 && (
            <View style={s.modalItems}>
              <Text style={s.modalItemsTitle}>En este pallet ({items.length}):</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {items.map((i) => (
                  <View key={i.id} style={s.modalChip}>
                    <Text style={s.modalChipTxt}>{i.sku} ×{i.qty}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

// ═══════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: C.text, fontWeight: '700', fontSize: 17, flex: 1, textAlign: 'center' },
  editLink: { width: 40, alignItems: 'center' },

  scroll: { flex: 1 },
  scrollInner: { padding: 16, paddingBottom: 40 },

  // ── Summary card ──
  summaryCard: {
    backgroundColor: C.card, borderRadius: RADIUS, padding: 16,
    borderWidth: 1, borderColor: C.border,
  },
  summaryRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 10, minHeight: 44,
  },
  summaryLabel: { color: C.textMuted, fontSize: 13, fontWeight: '600' },
  summaryVal: { color: C.text, fontSize: 15, fontWeight: '600' },
  summaryAuto: { color: C.textSec, fontSize: 14 },
  summaryMuted: { color: C.textMuted, fontSize: 13, fontStyle: 'italic' },
  divider: { height: 1, backgroundColor: C.border },

  palletBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(34,197,94,0.1)', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6,
  },
  palletTxt: { color: C.green, fontWeight: '700', fontSize: 16, letterSpacing: 0.3 },

  addSkuInline: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, marginTop: 4,
  },
  addSkuTxt: { color: C.blue, fontWeight: '600', fontSize: 13 },

  // Inline qty in summary
  qtyInline: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  qtyBtnSm: {
    width: 36, height: 36, borderRadius: 8,
    backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center',
  },
  qtyInputSm: {
    width: 60, backgroundColor: C.input, borderWidth: 1, borderColor: C.inputBorder,
    borderRadius: 8, paddingVertical: 6, fontSize: 20, fontWeight: '700', color: C.text,
    textAlign: 'center',
  },

  editHint: { color: C.textMuted, fontSize: 12, textAlign: 'center', marginTop: 12, marginBottom: 16 },

  // ── Edit mode ──
  section: { marginBottom: 20 },
  label: { color: C.textSec, fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginBottom: 8 },
  input: {
    backgroundColor: C.input, borderWidth: 1, borderColor: C.inputBorder,
    borderRadius: RADIUS, padding: 14, fontSize: 16, color: C.text,
  },
  qtyRowBig: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  qtyBtnBig: {
    width: 56, height: 56, borderRadius: RADIUS,
    backgroundColor: C.card, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: C.border,
  },
  qtyInputBig: {
    flex: 1, backgroundColor: C.input, borderWidth: 1, borderColor: C.inputBorder,
    borderRadius: RADIUS, paddingVertical: 14, fontSize: 32, fontWeight: '800', color: C.text,
  },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  condChip: {
    paddingHorizontal: 18, paddingVertical: 12, borderRadius: RADIUS_SM,
    backgroundColor: C.card, borderWidth: 1.5, borderColor: C.border, minWidth: 60, alignItems: 'center',
  },
  condTxt: { fontSize: 14, fontWeight: '700', color: C.textSec },
  destGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  destBtn: {
    flex: 1, minWidth: '44%', paddingVertical: 16, borderRadius: RADIUS,
    backgroundColor: C.card, alignItems: 'center', gap: 6,
    borderWidth: 1.5, borderColor: C.border,
  },
  destBtnActive: { backgroundColor: C.blue, borderColor: C.blue },
  destTxt: { fontSize: 13, fontWeight: '600', color: C.textSec },

  // ── Submit ──
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.green, borderRadius: RADIUS, paddingVertical: 18, gap: 10, marginTop: 16,
  },
  submitTxt: { color: '#FFF', fontWeight: '800', fontSize: 17, letterSpacing: 0.5 },

  // ── SKU Modal ──
  modalSafe: { flex: 1, backgroundColor: C.bg },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  modalTitle: { color: C.text, fontWeight: '700', fontSize: 17 },
  modalClose: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  modalBody: { padding: 20 },
  modalQtyRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
  modalQtyBtn: {
    width: 52, height: 52, borderRadius: RADIUS,
    backgroundColor: C.card, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: C.border,
  },
  modalQtyInput: {
    flex: 1, backgroundColor: C.input, borderWidth: 1, borderColor: C.inputBorder,
    borderRadius: RADIUS, paddingVertical: 12, fontSize: 28, fontWeight: '700', color: C.text,
  },
  modalAddBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.blue, borderRadius: RADIUS, paddingVertical: 16, gap: 8, marginTop: 20,
  },
  modalAddTxt: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  switchBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, marginTop: 16, paddingVertical: 12,
  },
  switchTxt: { color: C.blue, fontWeight: '600', fontSize: 14 },
  modalCam: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  camOverlay: { position: 'absolute', top: 20, left: 0, right: 0, alignItems: 'center' },
  camHint: {
    color: C.text, fontSize: 14, fontWeight: '600',
    backgroundColor: C.overlay, paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20, overflow: 'hidden',
  },
  camBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: C.overlay },
  modalItems: { padding: 16, borderTopWidth: 1, borderTopColor: C.border, backgroundColor: C.card },
  modalItemsTitle: { color: C.textSec, fontSize: 12, fontWeight: '600', marginBottom: 8 },
  modalChip: { backgroundColor: C.surface, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6, marginRight: 8 },
  modalChipTxt: { color: C.text, fontSize: 13, fontWeight: '600' },
});
