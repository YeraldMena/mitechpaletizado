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
import { CONDITIONS, DESTINATIONS, BARCODE_TYPES } from '../config';
import { registerPallet } from '../api';
import { getLastDestino, setLastDestino } from '../storage';

export default function PalletFormScreen({ navigation, route }) {
  const { palletId: initId, operator, turno, scanned } = route.params;

  // ── State ──
  const [palletId, setPalletId] = useState(initId || '');
  const [items, setItems] = useState([]);           // { id, sku, qty }
  const [conditions, setConditions] = useState([]);
  const [destino, setDestino] = useState('');
  const [pedido, setPedido] = useState('');
  const [loading, setLoading] = useState(false);

  // SKU scanner modal
  const [skuModal, setSkuModal] = useState(false);
  const [skuManual, setSkuManual] = useState(false);
  const [skuInput, setSkuInput] = useState('');
  const [skuQty, setSkuQty] = useState('1');
  const [skuScanned, setSkuScanned] = useState(false);
  const skuLastRef = useRef('');
  const itemIdRef = useRef(1);

  const [permission] = useCameraPermissions();

  // Pre-fill last destino
  useEffect(() => {
    getLastDestino().then((v) => { if (v) setDestino(v); });
  }, []);

  // ── SKU handling ──
  const addSku = (sku, qty) => {
    const q = parseInt(qty, 10) || 1;
    // Check if SKU already in list — if so, add qty
    const existing = items.find((i) => i.sku === sku);
    if (existing) {
      setItems((prev) => prev.map((i) => i.sku === sku ? { ...i, qty: i.qty + q } : i));
    } else {
      setItems((prev) => [...prev, { id: itemIdRef.current++, sku, qty: q }]);
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Vibration.vibrate(50);
  };

  const removeSku = (id) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const updateSkuQty = (id, delta) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setItems((prev) => prev.map((i) => {
      if (i.id !== id) return i;
      const nq = Math.max(1, i.qty + delta);
      return { ...i, qty: nq };
    }));
  };

  // ── SKU barcode scanned ──
  const onSkuBarcode = ({ data }) => {
    if (skuScanned || data === skuLastRef.current) return;
    setSkuScanned(true);
    skuLastRef.current = data;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Vibration.vibrate(80);

    // Show the scanned SKU with qty input
    setSkuInput(data);
    setSkuManual(true); // Switch to manual mode to confirm qty

    setTimeout(() => { setSkuScanned(false); skuLastRef.current = ''; }, 1200);
  };

  const confirmSkuAdd = () => {
    const sku = skuInput.trim();
    if (!sku) { Alert.alert('Error', 'Ingresa un SKU'); return; }
    addSku(sku, skuQty);
    setSkuInput('');
    setSkuQty('1');
    setSkuManual(false);
    // Stay in modal for next scan
  };

  const closeSkuModal = () => {
    setSkuModal(false);
    setSkuManual(false);
    setSkuInput('');
    setSkuQty('1');
    setSkuScanned(false);
    skuLastRef.current = '';
  };

  // ── Condition toggle ──
  const toggleCond = (code) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setConditions((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  // ── Destino select ──
  const pickDestino = (val) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDestino(val);
  };

  // ── Submit ──
  const handleSubmit = async () => {
    if (!palletId || palletId.length < 4) {
      Alert.alert('Error', 'El ID del pallet debe tener al menos 4 caracteres');
      return;
    }
    if (conditions.length === 0) {
      Alert.alert('Error', 'Selecciona al menos una condición');
      return;
    }
    if (!destino) {
      Alert.alert('Error', 'Selecciona un destino');
      return;
    }

    setLoading(true);
    try {
      // If no items added, create a default item with the pallet ID as SKU
      const finalItems = items.length > 0 ? items : [{ sku: palletId, qty: 1 }];

      const result = await registerPallet({
        palletId,
        items: finalItems,
        condicion: conditions,
        destino,
        turno,
        operador: operator,
        pedido,
      });

      await setLastDestino(destino);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Vibration.vibrate(200);

      // Go back to home
      navigation.goBack();
      navigation.goBack(); // Pop scan screen too if we came from there
    } catch (err) {
      Alert.alert('Error', 'No se pudo registrar. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  // ── Total qty ──
  const totalQty = items.reduce((s, i) => s + i.qty, 0);

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="close" size={24} color={C.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Registrar pallet</Text>
        <View style={s.headerRight}>
          <View style={s.chip}>
            <Ionicons name={turno === 'Day' ? 'sunny' : 'moon'} size={12} color={turno === 'Day' ? C.yellow : C.purple} />
            <Text style={s.chipTxt}>{turno === 'Day' ? 'Día' : 'Noche'}</Text>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={s.scroll} contentContainerStyle={s.scrollInner} keyboardShouldPersistTaps="handled">

          {/* ── Pallet ID ── */}
          <View style={s.section}>
            <Text style={s.label}>PALLET ID</Text>
            {scanned && initId ? (
              <View style={s.scannedBadge}>
                <Ionicons name="checkmark-circle" size={20} color={C.green} />
                <Text style={s.scannedTxt}>{palletId}</Text>
                <Text style={s.scannedTag}>ESCANEADO</Text>
              </View>
            ) : (
              <TextInput
                style={s.input}
                value={palletId}
                onChangeText={setPalletId}
                placeholder="ID del pallet"
                placeholderTextColor={C.textMuted}
                autoFocus={!initId}
              />
            )}
          </View>

          {/* ── Contenido / SKUs ── */}
          <View style={s.section}>
            <View style={s.labelRow}>
              <Text style={s.label}>CONTENIDO DEL PALLET</Text>
              {items.length > 0 && (
                <Text style={s.labelBadge}>{items.length} SKU · {totalQty} uds</Text>
              )}
            </View>

            {/* Item list */}
            {items.map((item) => (
              <View key={item.id} style={s.itemRow}>
                <View style={s.itemInfo}>
                  <Text style={s.itemSku}>{item.sku}</Text>
                </View>
                <View style={s.itemQty}>
                  <TouchableOpacity style={s.qtyBtn} onPress={() => updateSkuQty(item.id, -1)}>
                    <Ionicons name="remove" size={16} color={C.text} />
                  </TouchableOpacity>
                  <Text style={s.qtyNum}>{item.qty}</Text>
                  <TouchableOpacity style={s.qtyBtn} onPress={() => updateSkuQty(item.id, 1)}>
                    <Ionicons name="add" size={16} color={C.text} />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity onPress={() => removeSku(item.id)} style={s.itemDel}>
                  <Ionicons name="trash-outline" size={18} color={C.red} />
                </TouchableOpacity>
              </View>
            ))}

            {/* Add SKU buttons */}
            <View style={s.addRow}>
              <TouchableOpacity
                style={s.addBtn}
                onPress={() => { setSkuManual(false); setSkuModal(true); }}
              >
                <Ionicons name="scan" size={20} color={C.blue} />
                <Text style={s.addBtnTxt}>Escanear SKU</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.addBtn}
                onPress={() => { setSkuManual(true); setSkuModal(true); }}
              >
                <Ionicons name="create-outline" size={20} color={C.blue} />
                <Text style={s.addBtnTxt}>Manual</Text>
              </TouchableOpacity>
            </View>

            {items.length === 0 && (
              <Text style={s.hint}>
                Opcional: agrega SKUs del contenido. Si no agregas nada, se registra el pallet sin detalle de contenido.
              </Text>
            )}
          </View>

          {/* ── Condición ── */}
          <View style={s.section}>
            <Text style={s.label}>CONDICIÓN</Text>
            <View style={s.chipGrid}>
              {CONDITIONS.map((c) => {
                const active = conditions.includes(c.code);
                return (
                  <TouchableOpacity
                    key={c.code}
                    style={[s.condChip, active && { backgroundColor: c.color, borderColor: c.color }]}
                    onPress={() => toggleCond(c.code)}
                    activeOpacity={0.7}
                  >
                    <Text style={[s.condTxt, active && { color: '#FFF' }]}>{c.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ── Destino ── */}
          <View style={s.section}>
            <Text style={s.label}>DESTINO</Text>
            <View style={s.destGrid}>
              {DESTINATIONS.map((d) => {
                const active = destino === d.value;
                return (
                  <TouchableOpacity
                    key={d.value}
                    style={[s.destBtn, active && s.destBtnActive]}
                    onPress={() => pickDestino(d.value)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={d.icon}
                      size={20}
                      color={active ? '#FFF' : C.textMuted}
                    />
                    <Text style={[s.destTxt, active && { color: '#FFF' }]}>{d.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ── Pedido (opcional) ── */}
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

          {/* ── Operador info ── */}
          <View style={s.infoBar}>
            <View style={s.chip}>
              <Ionicons name="person" size={12} color={C.blue} />
              <Text style={s.chipTxt}>{operator}</Text>
            </View>
          </View>

          {/* ── SUBMIT ── */}
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
                <Text style={s.submitTxt}>REGISTRAR PALLET</Text>
              </>
            )}
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── SKU Scanner/Manual Modal ── */}
      <Modal visible={skuModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.modalSafe}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>
              {skuManual ? 'Agregar SKU' : 'Escanear SKU'}
            </Text>
            <TouchableOpacity onPress={closeSkuModal} style={s.modalClose}>
              <Ionicons name="close" size={24} color={C.text} />
            </TouchableOpacity>
          </View>

          {skuManual ? (
            /* Manual SKU entry */
            <View style={s.modalBody}>
              <Text style={s.label}>CÓDIGO SKU</Text>
              <TextInput
                style={s.input}
                value={skuInput}
                onChangeText={setSkuInput}
                placeholder="Código o nombre del SKU"
                placeholderTextColor={C.textMuted}
                autoFocus
              />
              <Text style={[s.label, { marginTop: 16 }]}>CANTIDAD</Text>
              <View style={s.modalQtyRow}>
                <TouchableOpacity
                  style={s.modalQtyBtn}
                  onPress={() => setSkuQty(String(Math.max(1, (parseInt(skuQty, 10) || 1) - 1)))}
                >
                  <Ionicons name="remove" size={22} color={C.text} />
                </TouchableOpacity>
                <TextInput
                  style={s.modalQtyInput}
                  value={skuQty}
                  onChangeText={setSkuQty}
                  keyboardType="number-pad"
                  textAlign="center"
                />
                <TouchableOpacity
                  style={s.modalQtyBtn}
                  onPress={() => setSkuQty(String((parseInt(skuQty, 10) || 1) + 1))}
                >
                  <Ionicons name="add" size={22} color={C.text} />
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={s.modalAddBtn} onPress={confirmSkuAdd}>
                <Ionicons name="add-circle" size={22} color="#FFF" />
                <Text style={s.modalAddTxt}>Agregar al pallet</Text>
              </TouchableOpacity>

              {/* Switch to scanner */}
              <TouchableOpacity
                style={s.modalSwitchBtn}
                onPress={() => { setSkuManual(false); setSkuInput(''); setSkuQty('1'); }}
              >
                <Ionicons name="scan" size={18} color={C.blue} />
                <Text style={s.modalSwitchTxt}>Escanear con cámara</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* Camera SKU scanner */
            <View style={s.modalCam}>
              {permission?.granted ? (
                <CameraView
                  style={{ flex: 1 }}
                  facing="back"
                  barcodeScannerSettings={{ barcodeTypes: BARCODE_TYPES }}
                  onBarcodeScanned={skuScanned ? undefined : onSkuBarcode}
                />
              ) : (
                <View style={s.center}>
                  <Text style={{ color: C.textSec }}>Cámara no disponible</Text>
                </View>
              )}
              <View style={s.modalCamOverlay}>
                <Text style={s.modalCamHint}>
                  {skuScanned ? 'SKU detectado!' : 'Apunta al código del producto'}
                </Text>
              </View>

              {/* Switch to manual */}
              <View style={s.modalCamBottom}>
                <TouchableOpacity
                  style={s.modalSwitchBtn}
                  onPress={() => setSkuManual(true)}
                >
                  <Ionicons name="create-outline" size={18} color={C.blue} />
                  <Text style={s.modalSwitchTxt}>Ingresar manualmente</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Items added so far */}
          {items.length > 0 && (
            <View style={s.modalItemList}>
              <Text style={s.modalItemTitle}>En este pallet ({items.length}):</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {items.map((item) => (
                  <View key={item.id} style={s.modalItemChip}>
                    <Text style={s.modalItemTxt}>{item.sku} ×{item.qty}</Text>
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

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: C.text, fontWeight: '700', fontSize: 17 },
  headerRight: { minWidth: 40 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: C.card, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: C.border,
  },
  chipTxt: { color: C.textSec, fontSize: 12, fontWeight: '600' },

  scroll: { flex: 1 },
  scrollInner: { padding: 20, paddingBottom: 40 },

  section: { marginBottom: 24 },
  label: {
    color: C.textSec, fontSize: 11, fontWeight: '700',
    letterSpacing: 0.8, marginBottom: 10,
  },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  labelBadge: { color: C.blue, fontSize: 12, fontWeight: '600' },

  input: {
    backgroundColor: C.input, borderWidth: 1, borderColor: C.inputBorder,
    borderRadius: RADIUS, padding: 14, fontSize: 16, color: C.text,
  },

  scannedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(34,197,94,0.08)', borderRadius: RADIUS,
    padding: 14, borderWidth: 1.5, borderColor: 'rgba(34,197,94,0.25)',
  },
  scannedTxt: { color: C.green, fontWeight: '700', fontSize: 20, flex: 1, letterSpacing: 0.5 },
  scannedTag: {
    color: C.green, fontSize: 10, fontWeight: '700',
    backgroundColor: 'rgba(34,197,94,0.15)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4,
  },

  // Items
  itemRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.card, borderRadius: RADIUS_SM, padding: 12,
    marginBottom: 8, borderWidth: 1, borderColor: C.border,
  },
  itemInfo: { flex: 1 },
  itemSku: { color: C.text, fontWeight: '600', fontSize: 15 },
  itemQty: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  qtyBtn: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center',
  },
  qtyNum: { color: C.text, fontWeight: '700', fontSize: 16, minWidth: 28, textAlign: 'center' },
  itemDel: { marginLeft: 10, padding: 4 },

  addRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  addBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: 'rgba(59,130,246,0.08)',
    borderRadius: RADIUS_SM, paddingVertical: 14,
    borderWidth: 1.5, borderColor: 'rgba(59,130,246,0.2)', borderStyle: 'dashed',
  },
  addBtnTxt: { color: C.blue, fontWeight: '600', fontSize: 13 },

  hint: { color: C.textMuted, fontSize: 12, marginTop: 10, lineHeight: 17 },

  // Conditions
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  condChip: {
    paddingHorizontal: 18, paddingVertical: 12, borderRadius: RADIUS_SM,
    backgroundColor: C.card, borderWidth: 1.5, borderColor: C.border,
    minWidth: 60, alignItems: 'center',
  },
  condTxt: { fontSize: 14, fontWeight: '700', color: C.textSec },

  // Destinations
  destGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  destBtn: {
    flex: 1, minWidth: '44%', paddingVertical: 16, borderRadius: RADIUS,
    backgroundColor: C.card, alignItems: 'center', gap: 6,
    borderWidth: 1.5, borderColor: C.border,
  },
  destBtnActive: { backgroundColor: C.blue, borderColor: C.blue },
  destTxt: { fontSize: 13, fontWeight: '600', color: C.textSec },

  infoBar: { flexDirection: 'row', marginBottom: 20 },

  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.blue, borderRadius: RADIUS, paddingVertical: 18, gap: 10,
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
  modalSwitchBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, marginTop: 16, paddingVertical: 12,
  },
  modalSwitchTxt: { color: C.blue, fontWeight: '600', fontSize: 14 },

  modalCam: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  modalCamOverlay: {
    position: 'absolute', top: 20, left: 0, right: 0, alignItems: 'center',
  },
  modalCamHint: {
    color: C.text, fontSize: 14, fontWeight: '600',
    backgroundColor: C.overlay, paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20,
    overflow: 'hidden',
  },
  modalCamBottom: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 16, backgroundColor: C.overlay,
  },

  modalItemList: {
    padding: 16, borderTopWidth: 1, borderTopColor: C.border,
    backgroundColor: C.card,
  },
  modalItemTitle: { color: C.textSec, fontSize: 12, fontWeight: '600', marginBottom: 8 },
  modalItemChip: {
    backgroundColor: C.surface, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6,
    marginRight: 8,
  },
  modalItemTxt: { color: C.text, fontSize: 13, fontWeight: '600' },
});
