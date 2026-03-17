import * as SecureStore from 'expo-secure-store';

const K = {
  operator:    'mt_operator',
  lastDestino: 'mt_last_destino',
};

export async function getOperator() {
  try { return await SecureStore.getItemAsync(K.operator); }
  catch { return null; }
}

export async function setOperator(name) {
  try { await SecureStore.setItemAsync(K.operator, name); }
  catch { /* silent */ }
}

export async function clearOperator() {
  try { await SecureStore.deleteItemAsync(K.operator); }
  catch { /* silent */ }
}

export async function getLastDestino() {
  try { return await SecureStore.getItemAsync(K.lastDestino); }
  catch { return null; }
}

export async function setLastDestino(val) {
  try { await SecureStore.setItemAsync(K.lastDestino, val); }
  catch { /* silent */ }
}
