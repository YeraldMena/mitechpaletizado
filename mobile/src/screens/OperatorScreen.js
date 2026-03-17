import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, StatusBar, SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { OPERATORS } from '../config';
import { C, RADIUS } from '../theme';
import { setOperator } from '../storage';

export default function OperatorScreen({ navigation }) {
  const pick = async (op) => {
    await setOperator(op.name);
    navigation.replace('Home', { operator: op.name });
  };

  const dayOps = OPERATORS.filter((o) => o.turno === 'day');
  const nightOps = OPERATORS.filter((o) => o.turno === 'night');

  const renderOp = (op) => (
    <TouchableOpacity
      key={op.id}
      style={s.card}
      activeOpacity={0.6}
      onPress={() => pick(op)}
    >
      <View style={[s.avatar, op.turno === 'night' && s.avatarNight]}>
        <Ionicons name="person" size={22} color={op.turno === 'night' ? C.purple : C.blue} />
      </View>
      <Text style={s.name}>{op.name}</Text>
      <Ionicons name="chevron-forward" size={18} color={C.textMuted} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <View style={s.wrap}>
        {/* Logo */}
        <View style={s.logoRow}>
          <View style={s.logoBox}>
            <Text style={s.logoTxt}>MT</Text>
          </View>
          <Text style={s.logoName}>MI-TECH Paletizado</Text>
        </View>

        <Text style={s.title}>Selecciona operador</Text>
        <Text style={s.sub}>Se recordará en este dispositivo</Text>

        {/* Turno día */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Ionicons name="sunny" size={14} color={C.yellow} />
            <Text style={s.sectionLabel}>TURNO DÍA</Text>
          </View>
          <View style={s.list}>
            {dayOps.map(renderOp)}
          </View>
        </View>

        {/* Turno noche */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Ionicons name="moon" size={14} color={C.purple} />
            <Text style={s.sectionLabel}>TURNO NOCHE</Text>
          </View>
          <View style={s.list}>
            {nightOps.map(renderOp)}
          </View>
        </View>

        <Text style={s.ver}>MI-TECH Paletizado · v1.0.0</Text>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  wrap: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  logoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 40, gap: 10 },
  logoBox: {
    width: 42, height: 42, borderRadius: 10, backgroundColor: C.blue,
    alignItems: 'center', justifyContent: 'center',
  },
  logoTxt: { color: '#FFF', fontWeight: '800', fontSize: 16 },
  logoName: { color: C.text, fontWeight: '700', fontSize: 18, letterSpacing: -0.3 },
  title: { color: C.text, fontWeight: '700', fontSize: 22, textAlign: 'center', marginBottom: 4 },
  sub: { color: C.textSec, fontSize: 14, textAlign: 'center', marginBottom: 28 },

  section: { marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8, paddingLeft: 4 },
  sectionLabel: { color: C.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 0.8 },

  list: { gap: 8 },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.card, borderRadius: RADIUS,
    padding: 16, borderWidth: 1, borderColor: C.border, gap: 14,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(59,130,246,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarNight: {
    backgroundColor: 'rgba(129,140,248,0.12)',
  },
  name: { flex: 1, color: C.text, fontWeight: '600', fontSize: 16 },
  ver: { color: C.textMuted, fontSize: 12, textAlign: 'center', marginTop: 32 },
});
