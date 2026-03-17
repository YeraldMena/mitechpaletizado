#!/usr/bin/env node
// ═══════════════════════════════════════════════════
// MI-TECH Paletizado — Seed Script
// Ejecutar: cd backend && node seed.js
// Crea tablas + inserta datos reconstruidos
// ═══════════════════════════════════════════════════

const mysql = require('mysql2/promise');
const config = require('./config');

const PALLETS = [
  // === ENERO 2026 ===
  ['100234',1,'Almacén','2026-01-06','Day (día)','GRB','Angélica Alemán',null],
  ['100235',1,'Almacén','2026-01-06','Day (día)','GRB','Angélica Alemán',null],
  ['100236',2,'TRG','2026-01-06','Day (día)','GRA','Nathalie López',null],
  ['100237',1,'Almacén','2026-01-06','Day (día)','GRB','Yusley Montes',null],
  ['100238',1,'HV (High Value)','2026-01-06','Day (día)','GRA','Nathalie López','PED-2026-001'],
  ['100239',1,'Almacén','2026-01-06','Day (día)','GRB','Angélica Alemán',null],
  ['100240',1,'TRG','2026-01-06','Night (noche)','GRB','Cecilia Pérez',null],
  ['100241',1,'Almacén','2026-01-06','Night (noche)','GRC','Cecilia Pérez',null],
  ['100242',1,'Almacén','2026-01-06','Night (noche)','GRB','Cecilia Pérez',null],
  ['100245',1,'Almacén','2026-01-07','Day (día)','GRB','Angélica Alemán',null],
  ['100246',1,'TRG','2026-01-07','Day (día)','ICB','Nathalie López',null],
  ['100247',2,'Almacén','2026-01-07','Day (día)','GRB','Yusley Montes',null],
  ['100248',1,'HV (High Value)','2026-01-07','Day (día)','GRA','Angélica Alemán','PED-2026-001'],
  ['100249',1,'BOX','2026-01-07','Day (día)','BOX','Nathalie López',null],
  ['100250',1,'Almacén','2026-01-07','Day (día)','GRB','Yusley Montes',null],
  ['100251',1,'Almacén','2026-01-07','Day (día)','GRB','Angélica Alemán',null],
  ['100252',1,'TRG','2026-01-07','Night (noche)','GRB','Cecilia Pérez',null],
  ['100253',1,'Almacén','2026-01-07','Night (noche)','GRB','Cecilia Pérez',null],
  ['100256',1,'Almacén','2026-01-08','Day (día)','GRB','Nathalie López',null],
  ['100257',1,'TRG','2026-01-08','Day (día)','GRA','Angélica Alemán',null],
  ['100258',1,'Almacén','2026-01-08','Day (día)','GRB','Yusley Montes',null],
  ['100259',1,'HV (High Value)','2026-01-08','Day (día)','GRA','Nathalie López','PED-2026-002'],
  ['100260',1,'Almacén','2026-01-08','Day (día)','ICB','Angélica Alemán',null],
  ['100261',2,'TRG','2026-01-08','Day (día)','GRB','Yusley Montes',null],
  ['100262',1,'BOX','2026-01-08','Day (día)','BOX','Angélica Alemán',null],
  ['100263',1,'Almacén','2026-01-08','Night (noche)','GRB','Cecilia Pérez',null],
  ['100264',1,'Almacén','2026-01-08','Night (noche)','GRC','Cecilia Pérez',null],
  ['100265',1,'TRG','2026-01-08','Night (noche)','GRB','Cecilia Pérez',null],
  ['100268',1,'Almacén','2026-01-09','Day (día)','GRB','Angélica Alemán',null],
  ['100269',1,'HV (High Value)','2026-01-09','Day (día)','GRA','Nathalie López','PED-2026-002'],
  ['100270',1,'Almacén','2026-01-09','Day (día)','GRB','Yusley Montes',null],
  ['100271',1,'TRG','2026-01-09','Day (día)','ICC','Angélica Alemán',null],
  ['100272',1,'Almacén','2026-01-09','Day (día)','GRB','Nathalie López',null],
  ['100273',1,'Almacén','2026-01-09','Day (día)','GRA','Yusley Montes',null],
  ['100274',1,'BOX','2026-01-09','Day (día)','BOX','Angélica Alemán',null],
  ['100275',1,'Almacén','2026-01-09','Night (noche)','GRB','Cecilia Pérez',null],
  ['100276',1,'TRG','2026-01-09','Night (noche)','GRB','Cecilia Pérez',null],
  ['100279',1,'Almacén','2026-01-10','Day (día)','GRB','Nathalie López',null],
  ['100280',2,'TRG','2026-01-10','Day (día)','GRB','Angélica Alemán',null],
  ['100281',1,'HV (High Value)','2026-01-10','Day (día)','GRA','Yusley Montes','PED-2026-003'],
  ['100282',1,'Almacén','2026-01-10','Day (día)','GRB','Nathalie López',null],
  ['100283',1,'Almacén','2026-01-10','Day (día)','GRC','Angélica Alemán',null],
  ['100284',1,'TRG','2026-01-10','Day (día)','ICB','Yusley Montes',null],
  ['100285',1,'Almacén','2026-01-10','Night (noche)','GRB','Cecilia Pérez',null],
  ['100286',1,'Almacén','2026-01-10','Night (noche)','GRB','Cecilia Pérez',null],
  ['100290',1,'Almacén','2026-01-13','Day (día)','GRB','Angélica Alemán',null],
  ['100291',1,'TRG','2026-01-13','Day (día)','GRA','Nathalie López',null],
  ['100292',1,'Almacén','2026-01-13','Day (día)','GRB','Yusley Montes',null],
  ['100293',1,'HV (High Value)','2026-01-13','Day (día)','GRA','Angélica Alemán','PED-2026-003'],
  ['100294',2,'Almacén','2026-01-13','Day (día)','GRB','Nathalie López',null],
  ['100295',1,'BOX','2026-01-13','Day (día)','BOX','Yusley Montes',null],
  ['100296',1,'TRG','2026-01-13','Day (día)','GRB','Angélica Alemán',null],
  ['100297',1,'Almacén','2026-01-13','Night (noche)','GRB','Cecilia Pérez',null],
  ['100298',1,'Almacén','2026-01-13','Night (noche)','GRC','Cecilia Pérez',null],
  ['100299',1,'TRG','2026-01-13','Night (noche)','GRB','Cecilia Pérez',null],
  ['100302',1,'Almacén','2026-01-14','Day (día)','GRB','Nathalie López',null],
  ['100303',1,'Almacén','2026-01-14','Day (día)','GRB','Angélica Alemán',null],
  ['100304',1,'TRG','2026-01-14','Day (día)','ICD','Yusley Montes',null],
  ['100305',1,'HV (High Value)','2026-01-14','Day (día)','GRA','Nathalie López','PED-2026-004'],
  ['100306',1,'Almacén','2026-01-14','Day (día)','GRB','Angélica Alemán',null],
  ['100307',1,'BOX','2026-01-14','Day (día)','DNP','Yusley Montes',null],
  ['100308',1,'Almacén','2026-01-14','Night (noche)','GRB','Cecilia Pérez',null],
  ['100309',1,'TRG','2026-01-14','Night (noche)','GRB','Cecilia Pérez',null],
  ['100312',1,'Almacén','2026-01-15','Day (día)','GRB','Angélica Alemán',null],
  ['100313',1,'TRG','2026-01-15','Day (día)','GRA','Nathalie López',null],
  ['100314',2,'Almacén','2026-01-15','Day (día)','GRB','Yusley Montes',null],
  ['100315',1,'HV (High Value)','2026-01-15','Day (día)','GRA','Angélica Alemán','PED-2026-004'],
  ['100316',1,'Almacén','2026-01-15','Day (día)','ICB','Nathalie López',null],
  ['100317',1,'TRG','2026-01-15','Day (día)','GRB','Yusley Montes',null],
  ['100318',1,'Almacén','2026-01-15','Day (día)','GRB','Angélica Alemán',null],
  ['100319',1,'Almacén','2026-01-15','Night (noche)','GRB','Cecilia Pérez',null],
  ['100320',1,'BOX','2026-01-15','Night (noche)','BOX','Cecilia Pérez',null],
  ['100323',1,'Almacén','2026-01-16','Day (día)','GRB','Nathalie López',null],
  ['100324',1,'TRG','2026-01-16','Day (día)','GRB','Angélica Alemán',null],
  ['100325',1,'Almacén','2026-01-16','Day (día)','GRA','Yusley Montes',null],
  ['100326',1,'HV (High Value)','2026-01-16','Day (día)','GRA','Nathalie López',null],
  ['100327',1,'Almacén','2026-01-16','Day (día)','GRB','Angélica Alemán',null],
  ['100328',1,'TRG','2026-01-16','Day (día)','ICX','Yusley Montes',null],
  ['100329',1,'Almacén','2026-01-16','Night (noche)','GRB','Cecilia Pérez',null],
  ['100330',1,'Almacén','2026-01-16','Night (noche)','GRB','Cecilia Pérez',null],
  ['100333',1,'TRG','2026-01-17','Day (día)','GRB','Angélica Alemán',null],
  ['100334',1,'Almacén','2026-01-17','Day (día)','GRB','Nathalie López',null],
  ['100335',1,'HV (High Value)','2026-01-17','Day (día)','GRA','Yusley Montes','PED-2026-005'],
  ['100336',2,'Almacén','2026-01-17','Day (día)','GRB','Angélica Alemán',null],
  ['100337',1,'Almacén','2026-01-17','Day (día)','GRC','Nathalie López',null],
  ['100338',1,'BOX','2026-01-17','Day (día)','DMT','Yusley Montes',null],
  ['100339',1,'TRG','2026-01-17','Night (noche)','GRB','Cecilia Pérez',null],
  ['100340',1,'Almacén','2026-01-17','Night (noche)','GRB','Cecilia Pérez',null],
  ['100345',1,'Almacén','2026-01-20','Day (día)','GRB','Angélica Alemán',null],
  ['100346',1,'TRG','2026-01-20','Day (día)','GRA','Nathalie López',null],
  ['100347',1,'Almacén','2026-01-20','Day (día)','GRB','Yusley Montes',null],
  ['100348',1,'HV (High Value)','2026-01-20','Day (día)','GRA','Angélica Alemán','PED-2026-005'],
  ['100349',1,'Almacén','2026-01-20','Day (día)','GRB','Nathalie López',null],
  ['100350',1,'TRG','2026-01-20','Day (día)','ICB','Yusley Montes',null],
  ['100351',1,'Almacén','2026-01-20','Night (noche)','GRB','Cecilia Pérez',null],
  ['100352',1,'Almacén','2026-01-20','Night (noche)','GRC','Cecilia Pérez',null],
  ['100355',1,'Almacén','2026-01-21','Day (día)','GRB','Nathalie López',null],
  ['100356',1,'TRG','2026-01-21','Day (día)','GRB','Angélica Alemán',null],
  ['100357',1,'Almacén','2026-01-21','Day (día)','GRA','Yusley Montes',null],
  ['100358',1,'HV (High Value)','2026-01-21','Day (día)','GRA','Nathalie López','PED-2026-006'],
  ['100359',1,'Almacén','2026-01-21','Day (día)','GRB','Angélica Alemán',null],
  ['100360',1,'BOX','2026-01-21','Day (día)','BOX','Yusley Montes',null],
  ['100361',1,'Almacén','2026-01-21','Night (noche)','GRB','Cecilia Pérez',null],
  ['100362',1,'TRG','2026-01-21','Night (noche)','GRB','Cecilia Pérez',null],
  ['100365',1,'Almacén','2026-01-22','Day (día)','GRB','Angélica Alemán',null],
  ['100366',1,'TRG','2026-01-22','Day (día)','ICC','Nathalie López',null],
  ['100367',1,'Almacén','2026-01-22','Day (día)','GRB','Yusley Montes',null],
  ['100368',2,'HV (High Value)','2026-01-22','Day (día)','GRA','Angélica Alemán','PED-2026-006'],
  ['100369',1,'Almacén','2026-01-22','Day (día)','GRB','Nathalie López',null],
  ['100370',1,'TRG','2026-01-22','Day (día)','GRB','Yusley Montes',null],
  ['100371',1,'Almacén','2026-01-22','Day (día)','DMA','Angélica Alemán',null],
  ['100372',1,'Almacén','2026-01-22','Night (noche)','GRB','Cecilia Pérez',null],
  ['100373',1,'BOX','2026-01-22','Night (noche)','BOX','Cecilia Pérez',null],
  ['100376',1,'Almacén','2026-01-23','Day (día)','GRB','Nathalie López',null],
  ['100377',1,'HV (High Value)','2026-01-23','Day (día)','GRA','Angélica Alemán',null],
  ['100378',1,'TRG','2026-01-23','Day (día)','GRB','Yusley Montes',null],
  ['100379',1,'Almacén','2026-01-23','Day (día)','GRB','Nathalie López',null],
  ['100380',1,'TRG','2026-01-23','Day (día)','ICB','Angélica Alemán',null],
  ['100381',1,'Almacén','2026-01-23','Day (día)','GRB','Yusley Montes',null],
  ['100382',1,'Almacén','2026-01-23','Night (noche)','GRB','Cecilia Pérez',null],
  ['100383',1,'TRG','2026-01-23','Night (noche)','GRC','Cecilia Pérez',null],
  ['100386',1,'Almacén','2026-01-24','Day (día)','GRB','Angélica Alemán',null],
  ['100387',1,'TRG','2026-01-24','Day (día)','GRA','Nathalie López',null],
  ['100388',1,'Almacén','2026-01-24','Day (día)','GRB','Yusley Montes',null],
  ['100389',1,'HV (High Value)','2026-01-24','Day (día)','GRA','Angélica Alemán','PED-2026-007'],
  ['100390',2,'Almacén','2026-01-24','Day (día)','GRB','Nathalie López',null],
  ['100391',1,'BOX','2026-01-24','Day (día)','DNP','Yusley Montes',null],
  ['100392',1,'Almacén','2026-01-24','Night (noche)','GRB','Cecilia Pérez',null],
  ['100393',1,'Almacén','2026-01-24','Night (noche)','GRB','Cecilia Pérez',null],
  ['100398',1,'Almacén','2026-01-27','Day (día)','GRB','Angélica Alemán',null],
  ['100399',1,'TRG','2026-01-27','Day (día)','GRB','Nathalie López',null],
  ['100400',1,'Almacén','2026-01-27','Day (día)','GRA','Yusley Montes',null],
  ['100401',1,'HV (High Value)','2026-01-27','Day (día)','GRA','Angélica Alemán','PED-2026-007'],
  ['100402',1,'TRG','2026-01-27','Day (día)','ICB','Nathalie López',null],
  ['100403',1,'Almacén','2026-01-27','Day (día)','GRB','Yusley Montes',null],
  ['100404',1,'Almacén','2026-01-27','Night (noche)','GRB','Cecilia Pérez',null],
  ['100405',1,'TRG','2026-01-27','Night (noche)','GRB','Cecilia Pérez',null],
  ['100408',1,'Almacén','2026-01-28','Day (día)','GRB','Nathalie López',null],
  ['100409',1,'Almacén','2026-01-28','Day (día)','GRB','Angélica Alemán',null],
  ['100410',1,'TRG','2026-01-28','Day (día)','GRA','Yusley Montes',null],
  ['100411',1,'HV (High Value)','2026-01-28','Day (día)','GRA','Nathalie López','PED-2026-008'],
  ['100412',1,'Almacén','2026-01-28','Day (día)','ICX','Angélica Alemán',null],
  ['100413',1,'BOX','2026-01-28','Day (día)','BOX','Yusley Montes',null],
  ['100414',1,'Almacén','2026-01-28','Night (noche)','GRB','Cecilia Pérez',null],
  ['100415',1,'Almacén','2026-01-28','Night (noche)','GRC','Cecilia Pérez',null],
  ['100418',1,'TRG','2026-01-29','Day (día)','GRB','Angélica Alemán',null],
  ['100419',1,'Almacén','2026-01-29','Day (día)','GRB','Nathalie López',null],
  ['100420',1,'Almacén','2026-01-29','Day (día)','GRB','Yusley Montes',null],
  ['100421',1,'HV (High Value)','2026-01-29','Day (día)','GRA','Angélica Alemán',null],
  ['100422',2,'TRG','2026-01-29','Day (día)','GRB','Nathalie López',null],
  ['100423',1,'Almacén','2026-01-29','Day (día)','GRB','Yusley Montes',null],
  ['100424',1,'Almacén','2026-01-29','Night (noche)','GRB','Cecilia Pérez',null],
  ['100425',1,'BOX','2026-01-29','Night (noche)','DMA','Cecilia Pérez',null],
  ['100428',1,'Almacén','2026-01-30','Day (día)','GRB','Nathalie López',null],
  ['100429',1,'TRG','2026-01-30','Day (día)','GRA','Angélica Alemán',null],
  ['100430',1,'Almacén','2026-01-30','Day (día)','GRB','Yusley Montes',null],
  ['100431',1,'HV (High Value)','2026-01-30','Day (día)','GRA','Nathalie López','PED-2026-008'],
  ['100432',1,'Almacén','2026-01-30','Day (día)','GRB','Angélica Alemán',null],
  ['100433',1,'TRG','2026-01-30','Day (día)','ICC','Yusley Montes',null],
  ['100434',1,'Almacén','2026-01-30','Night (noche)','GRB','Cecilia Pérez',null],
  ['100435',1,'TRG','2026-01-30','Night (noche)','GRB','Cecilia Pérez',null],
  ['100438',1,'Almacén','2026-01-31','Day (día)','GRB','Angélica Alemán',null],
  ['100439',1,'Almacén','2026-01-31','Day (día)','GRB','Nathalie López',null],
  ['100440',1,'TRG','2026-01-31','Day (día)','GRB','Yusley Montes',null],
  ['100441',1,'HV (High Value)','2026-01-31','Day (día)','GRA','Angélica Alemán','PED-2026-009'],
  ['100442',1,'Almacén','2026-01-31','Day (día)','GRB','Nathalie López',null],
  ['100443',1,'BOX','2026-01-31','Day (día)','DMT','Yusley Montes',null],
  ['100444',1,'Almacén','2026-01-31','Night (noche)','GRB','Cecilia Pérez',null],
  ['100445',1,'Almacén','2026-01-31','Night (noche)','GRB','Cecilia Pérez',null],
  // === FEBRERO 2026 ===
  ['100450',1,'Almacén','2026-02-02','Day (día)','GRB','Angélica Alemán',null],
  ['100451',1,'TRG','2026-02-02','Day (día)','GRA','Nathalie López',null],
  ['100452',1,'Almacén','2026-02-02','Day (día)','GRB','Yusley Montes',null],
  ['100453',1,'HV (High Value)','2026-02-02','Day (día)','GRA','Angélica Alemán','PED-2026-009'],
  ['100454',2,'Almacén','2026-02-02','Day (día)','GRB','Nathalie López',null],
  ['100455',1,'TRG','2026-02-02','Day (día)','ICB','Yusley Montes',null],
  ['100456',1,'Almacén','2026-02-02','Night (noche)','GRB','Cecilia Pérez',null],
  ['100457',1,'TRG','2026-02-02','Night (noche)','GRB','Cecilia Pérez',null],
  ['100458',1,'Almacén','2026-02-02','Night (noche)','GRC','Cecilia Pérez',null],
  ['100461',1,'Almacén','2026-02-03','Day (día)','GRB','Nathalie López',null],
  ['100462',1,'TRG','2026-02-03','Day (día)','GRB','Angélica Alemán',null],
  ['100463',1,'Almacén','2026-02-03','Day (día)','GRA','Yusley Montes',null],
  ['100464',1,'HV (High Value)','2026-02-03','Day (día)','GRA','Nathalie López','PED-2026-010'],
  ['100465',1,'Almacén','2026-02-03','Day (día)','GRB','Angélica Alemán',null],
  ['100466',1,'BOX','2026-02-03','Day (día)','BOX','Yusley Montes',null],
  ['100467',1,'Almacén','2026-02-03','Night (noche)','GRB','Cecilia Pérez',null],
  ['100468',1,'Almacén','2026-02-03','Night (noche)','GRB','Cecilia Pérez',null],
  ['100471',1,'TRG','2026-02-04','Day (día)','GRB','Angélica Alemán',null],
  ['100472',1,'Almacén','2026-02-04','Day (día)','GRB','Nathalie López',null],
  ['100473',1,'HV (High Value)','2026-02-04','Day (día)','GRA','Yusley Montes','PED-2026-010'],
  ['100474',1,'Almacén','2026-02-04','Day (día)','GRB','Angélica Alemán',null],
  ['100475',1,'TRG','2026-02-04','Day (día)','ICD','Nathalie López',null],
  ['100476',2,'Almacén','2026-02-04','Day (día)','GRB','Yusley Montes',null],
  ['100477',1,'Almacén','2026-02-04','Night (noche)','GRB','Cecilia Pérez',null],
  ['100478',1,'BOX','2026-02-04','Night (noche)','BOX','Cecilia Pérez',null],
  ['100481',1,'Almacén','2026-02-05','Day (día)','GRB','Nathalie López',null],
  ['100482',1,'TRG','2026-02-05','Day (día)','GRA','Angélica Alemán',null],
  ['100483',1,'Almacén','2026-02-05','Day (día)','GRB','Yusley Montes',null],
  ['100484',1,'HV (High Value)','2026-02-05','Day (día)','GRA','Nathalie López',null],
  ['100485',1,'Almacén','2026-02-05','Day (día)','GRB','Angélica Alemán',null],
  ['100486',1,'TRG','2026-02-05','Day (día)','GRB','Yusley Montes',null],
  ['100487',1,'Almacén','2026-02-05','Night (noche)','GRB','Cecilia Pérez',null],
  ['100488',1,'TRG','2026-02-05','Night (noche)','GRC','Cecilia Pérez',null],
  ['100491',1,'Almacén','2026-02-06','Day (día)','GRB','Angélica Alemán',null],
  ['100492',1,'Almacén','2026-02-06','Day (día)','GRB','Nathalie López',null],
  ['100493',1,'TRG','2026-02-06','Day (día)','ICB','Yusley Montes',null],
  ['100494',1,'HV (High Value)','2026-02-06','Day (día)','GRA','Angélica Alemán','PED-2026-011'],
  ['100495',1,'Almacén','2026-02-06','Day (día)','GRB','Nathalie López',null],
  ['100496',1,'BOX','2026-02-06','Day (día)','DNP','Yusley Montes',null],
  ['100497',1,'Almacén','2026-02-06','Night (noche)','GRB','Cecilia Pérez',null],
  ['100498',1,'Almacén','2026-02-06','Night (noche)','GRB','Cecilia Pérez',null],
  ['100503',1,'Almacén','2026-02-09','Day (día)','GRB','Angélica Alemán',null],
  ['100504',1,'TRG','2026-02-09','Day (día)','GRA','Nathalie López',null],
  ['100505',1,'Almacén','2026-02-09','Day (día)','GRB','Yusley Montes',null],
  ['100506',1,'HV (High Value)','2026-02-09','Day (día)','GRA','Angélica Alemán','PED-2026-011'],
  ['100507',1,'TRG','2026-02-09','Day (día)','GRB','Nathalie López',null],
  ['100508',1,'Almacén','2026-02-09','Day (día)','GRB','Yusley Montes',null],
  ['100509',1,'Almacén','2026-02-09','Night (noche)','GRB','Cecilia Pérez',null],
  ['100510',1,'TRG','2026-02-09','Night (noche)','GRB','Cecilia Pérez',null],
  ['100513',1,'Almacén','2026-02-10','Day (día)','GRB','Nathalie López',null],
  ['100514',1,'TRG','2026-02-10','Day (día)','ICC','Angélica Alemán',null],
  ['100515',2,'Almacén','2026-02-10','Day (día)','GRB','Yusley Montes',null],
  ['100516',1,'HV (High Value)','2026-02-10','Day (día)','GRA','Nathalie López','PED-2026-012'],
  ['100517',1,'Almacén','2026-02-10','Day (día)','GRB','Angélica Alemán',null],
  ['100518',1,'BOX','2026-02-10','Day (día)','BOX','Yusley Montes',null],
  ['100519',1,'Almacén','2026-02-10','Night (noche)','GRB','Cecilia Pérez',null],
  ['100520',1,'Almacén','2026-02-10','Night (noche)','GRC','Cecilia Pérez',null],
  ['100523',1,'TRG','2026-02-11','Day (día)','GRB','Angélica Alemán',null],
  ['100524',1,'Almacén','2026-02-11','Day (día)','GRB','Nathalie López',null],
  ['100525',1,'Almacén','2026-02-11','Day (día)','GRA','Yusley Montes',null],
  ['100526',1,'HV (High Value)','2026-02-11','Day (día)','GRA','Angélica Alemán','PED-2026-012'],
  ['100527',1,'Almacén','2026-02-11','Day (día)','GRB','Nathalie López',null],
  ['100528',1,'TRG','2026-02-11','Day (día)','ICB','Yusley Montes',null],
  ['100529',1,'Almacén','2026-02-11','Night (noche)','GRB','Cecilia Pérez',null],
  ['100530',1,'BOX','2026-02-11','Night (noche)','DMA','Cecilia Pérez',null],
  ['100533',1,'Almacén','2026-02-12','Day (día)','GRB','Nathalie López',null],
  ['100534',1,'TRG','2026-02-12','Day (día)','GRB','Angélica Alemán',null],
  ['100535',1,'Almacén','2026-02-12','Day (día)','GRB','Yusley Montes',null],
  ['100536',1,'HV (High Value)','2026-02-12','Day (día)','GRA','Nathalie López',null],
  ['100537',1,'Almacén','2026-02-12','Day (día)','GRB','Angélica Alemán',null],
  ['100538',1,'TRG','2026-02-12','Day (día)','GRA','Yusley Montes',null],
  ['100539',1,'Almacén','2026-02-12','Night (noche)','GRB','Cecilia Pérez',null],
  ['100540',1,'TRG','2026-02-12','Night (noche)','GRB','Cecilia Pérez',null],
  ['100543',1,'Almacén','2026-02-13','Day (día)','GRB','Angélica Alemán',null],
  ['100544',1,'Almacén','2026-02-13','Day (día)','GRB','Nathalie López',null],
  ['100545',1,'HV (High Value)','2026-02-13','Day (día)','GRA','Yusley Montes','PED-2026-013'],
  ['100546',1,'TRG','2026-02-13','Day (día)','ICX','Angélica Alemán',null],
  ['100547',2,'Almacén','2026-02-13','Day (día)','GRB','Nathalie López',null],
  ['100548',1,'BOX','2026-02-13','Day (día)','DMT','Yusley Montes',null],
  ['100549',1,'Almacén','2026-02-13','Night (noche)','GRB','Cecilia Pérez',null],
  ['100550',1,'Almacén','2026-02-13','Night (noche)','GRB','Cecilia Pérez',null],
  ['100555',1,'TRG','2026-02-16','Day (día)','GRB','Angélica Alemán',null],
  ['100556',1,'Almacén','2026-02-16','Day (día)','GRB','Nathalie López',null],
  ['100557',1,'Almacén','2026-02-16','Day (día)','GRA','Yusley Montes',null],
  ['100558',1,'HV (High Value)','2026-02-16','Day (día)','GRA','Angélica Alemán','PED-2026-013'],
  ['100559',1,'Almacén','2026-02-16','Day (día)','GRB','Nathalie López',null],
  ['100560',1,'TRG','2026-02-16','Day (día)','GRB','Yusley Montes',null],
  ['100561',1,'Almacén','2026-02-16','Night (noche)','GRB','Cecilia Pérez',null],
  ['100562',1,'TRG','2026-02-16','Night (noche)','GRC','Cecilia Pérez',null],
  ['100565',1,'Almacén','2026-02-17','Day (día)','GRB','Nathalie López',null],
  ['100566',1,'TRG','2026-02-17','Day (día)','GRA','Angélica Alemán',null],
  ['100567',1,'Almacén','2026-02-17','Day (día)','GRB','Yusley Montes',null],
  ['100568',1,'HV (High Value)','2026-02-17','Day (día)','GRA','Nathalie López','PED-2026-014'],
  ['100569',1,'Almacén','2026-02-17','Day (día)','GRB','Angélica Alemán',null],
  ['100570',1,'BOX','2026-02-17','Day (día)','BOX','Yusley Montes',null],
  ['100571',1,'Almacén','2026-02-17','Night (noche)','GRB','Cecilia Pérez',null],
  ['100572',1,'Almacén','2026-02-17','Night (noche)','GRB','Cecilia Pérez',null],
  ['100575',1,'Almacén','2026-02-18','Day (día)','GRB','Angélica Alemán',null],
  ['100576',1,'TRG','2026-02-18','Day (día)','ICB','Nathalie López',null],
  ['100577',1,'Almacén','2026-02-18','Day (día)','GRB','Yusley Montes',null],
  ['100578',2,'HV (High Value)','2026-02-18','Day (día)','GRA','Angélica Alemán','PED-2026-014'],
  ['100579',1,'Almacén','2026-02-18','Day (día)','GRB','Nathalie López',null],
  ['100580',1,'TRG','2026-02-18','Day (día)','GRB','Yusley Montes',null],
  ['100581',1,'Almacén','2026-02-18','Night (noche)','GRB','Cecilia Pérez',null],
  ['100582',1,'BOX','2026-02-18','Night (noche)','DNP','Cecilia Pérez',null],
  ['100585',1,'Almacén','2026-02-19','Day (día)','GRB','Nathalie López',null],
  ['100586',1,'TRG','2026-02-19','Day (día)','GRB','Angélica Alemán',null],
  ['100587',1,'Almacén','2026-02-19','Day (día)','GRA','Yusley Montes',null],
  ['100588',1,'HV (High Value)','2026-02-19','Day (día)','GRA','Nathalie López',null],
  ['100589',1,'Almacén','2026-02-19','Day (día)','GRB','Angélica Alemán',null],
  ['100590',1,'TRG','2026-02-19','Day (día)','ICC','Yusley Montes',null],
  ['100591',1,'Almacén','2026-02-19','Night (noche)','GRB','Cecilia Pérez',null],
  ['100592',1,'TRG','2026-02-19','Night (noche)','GRB','Cecilia Pérez',null],
  ['100595',1,'Almacén','2026-02-20','Day (día)','GRB','Angélica Alemán',null],
  ['100596',1,'Almacén','2026-02-20','Day (día)','GRB','Nathalie López',null],
  ['100597',1,'TRG','2026-02-20','Day (día)','GRB','Yusley Montes',null],
  ['100598',1,'HV (High Value)','2026-02-20','Day (día)','GRA','Angélica Alemán','PED-2026-015'],
  ['100599',1,'Almacén','2026-02-20','Day (día)','GRB','Nathalie López',null],
  ['100600',1,'BOX','2026-02-20','Day (día)','BOX','Yusley Montes',null],
  ['100601',1,'Almacén','2026-02-20','Night (noche)','GRB','Cecilia Pérez',null],
  ['100602',1,'Almacén','2026-02-20','Night (noche)','GRC','Cecilia Pérez',null],
  ['100607',1,'TRG','2026-02-23','Day (día)','GRB','Angélica Alemán',null],
  ['100608',1,'Almacén','2026-02-23','Day (día)','GRB','Nathalie López',null],
  ['100609',1,'Almacén','2026-02-23','Day (día)','GRA','Yusley Montes',null],
  ['100610',1,'HV (High Value)','2026-02-23','Day (día)','GRA','Angélica Alemán','PED-2026-015'],
  ['100611',1,'Almacén','2026-02-23','Day (día)','GRB','Nathalie López',null],
  ['100612',1,'TRG','2026-02-23','Day (día)','ICD','Yusley Montes',null],
  ['100613',1,'Almacén','2026-02-23','Night (noche)','GRB','Cecilia Pérez',null],
  ['100614',1,'TRG','2026-02-23','Night (noche)','GRB','Cecilia Pérez',null],
  ['100617',1,'Almacén','2026-02-24','Day (día)','GRB','Nathalie López',null],
  ['100618',1,'TRG','2026-02-24','Day (día)','GRA','Angélica Alemán',null],
  ['100619',1,'Almacén','2026-02-24','Day (día)','GRB','Yusley Montes',null],
  ['100620',1,'HV (High Value)','2026-02-24','Day (día)','GRA','Nathalie López','PED-2026-016'],
  ['100621',1,'Almacén','2026-02-24','Day (día)','GRB','Angélica Alemán',null],
  ['100622',2,'BOX','2026-02-24','Day (día)','BOX','Yusley Montes',null],
  ['100623',1,'Almacén','2026-02-24','Night (noche)','GRB','Cecilia Pérez',null],
  ['100624',1,'Almacén','2026-02-24','Night (noche)','GRB','Cecilia Pérez',null],
  ['100627',1,'Almacén','2026-02-25','Day (día)','GRB','Angélica Alemán',null],
  ['100628',1,'TRG','2026-02-25','Day (día)','GRB','Nathalie López',null],
  ['100629',1,'Almacén','2026-02-25','Day (día)','GRB','Yusley Montes',null],
  ['100630',1,'HV (High Value)','2026-02-25','Day (día)','GRA','Angélica Alemán','PED-2026-016'],
  ['100631',1,'Almacén','2026-02-25','Day (día)','ICB','Nathalie López',null],
  ['100632',1,'TRG','2026-02-25','Day (día)','GRB','Yusley Montes',null],
  ['100633',1,'Almacén','2026-02-25','Night (noche)','GRB','Cecilia Pérez',null],
  ['100634',1,'BOX','2026-02-25','Night (noche)','DMA','Cecilia Pérez',null],
  ['100637',1,'TRG','2026-02-26','Day (día)','GRB','Nathalie López',null],
  ['100638',1,'Almacén','2026-02-26','Day (día)','GRB','Angélica Alemán',null],
  ['100639',1,'Almacén','2026-02-26','Day (día)','GRA','Yusley Montes',null],
  ['100640',1,'HV (High Value)','2026-02-26','Day (día)','GRA','Nathalie López',null],
  ['100641',1,'Almacén','2026-02-26','Day (día)','GRB','Angélica Alemán',null],
  ['100642',1,'TRG','2026-02-26','Day (día)','ICX','Yusley Montes',null],
  ['100643',1,'Almacén','2026-02-26','Night (noche)','GRB','Cecilia Pérez',null],
  ['100644',1,'TRG','2026-02-26','Night (noche)','GRB','Cecilia Pérez',null],
  ['100647',1,'Almacén','2026-02-27','Day (día)','GRB','Angélica Alemán',null],
  ['100648',1,'TRG','2026-02-27','Day (día)','GRA','Nathalie López',null],
  ['100649',1,'Almacén','2026-02-27','Day (día)','GRB','Yusley Montes',null],
  ['100650',1,'HV (High Value)','2026-02-27','Day (día)','GRA','Angélica Alemán','PED-2026-017'],
  ['100651',2,'Almacén','2026-02-27','Day (día)','GRB','Nathalie López',null],
  ['100652',1,'BOX','2026-02-27','Day (día)','DMT','Yusley Montes',null],
  ['100653',1,'Almacén','2026-02-27','Night (noche)','GRB','Cecilia Pérez',null],
  ['100654',1,'Almacén','2026-02-27','Night (noche)','GRC','Cecilia Pérez',null],
  // === MARZO 2026 ===
  ['100660',1,'Almacén','2026-03-02','Day (día)','GRB','Angélica Alemán',null],
  ['100661',1,'TRG','2026-03-02','Day (día)','GRB','Nathalie López',null],
  ['100662',1,'Almacén','2026-03-02','Day (día)','GRA','Yusley Montes',null],
  ['100663',1,'HV (High Value)','2026-03-02','Day (día)','GRA','Angélica Alemán','PED-2026-017'],
  ['100664',1,'TRG','2026-03-02','Day (día)','ICB','Nathalie López',null],
  ['100665',1,'Almacén','2026-03-02','Day (día)','GRB','Yusley Montes',null],
  ['100666',1,'Almacén','2026-03-02','Night (noche)','GRB','Cecilia Pérez',null],
  ['100667',1,'TRG','2026-03-02','Night (noche)','GRB','Cecilia Pérez',null],
  ['100670',1,'Almacén','2026-03-03','Day (día)','GRB','Nathalie López',null],
  ['100671',1,'TRG','2026-03-03','Day (día)','GRA','Angélica Alemán',null],
  ['100672',1,'Almacén','2026-03-03','Day (día)','GRB','Yusley Montes',null],
  ['100673',1,'HV (High Value)','2026-03-03','Day (día)','GRA','Nathalie López','PED-2026-018'],
  ['100674',1,'Almacén','2026-03-03','Day (día)','GRB','Angélica Alemán',null],
  ['100675',1,'BOX','2026-03-03','Day (día)','BOX','Yusley Montes',null],
  ['100676',1,'Almacén','2026-03-03','Night (noche)','GRB','Cecilia Pérez',null],
  ['100677',1,'Almacén','2026-03-03','Night (noche)','GRB','Cecilia Pérez',null],
  ['100680',1,'TRG','2026-03-04','Day (día)','GRB','Angélica Alemán',null],
  ['100681',1,'Almacén','2026-03-04','Day (día)','GRB','Nathalie López',null],
  ['100682',1,'Almacén','2026-03-04','Day (día)','GRB','Yusley Montes',null],
  ['100683',2,'HV (High Value)','2026-03-04','Day (día)','GRA','Angélica Alemán','PED-2026-018'],
  ['100684',1,'Almacén','2026-03-04','Day (día)','ICC','Nathalie López',null],
  ['100685',1,'TRG','2026-03-04','Day (día)','GRB','Yusley Montes',null],
  ['100686',1,'Almacén','2026-03-04','Night (noche)','GRB','Cecilia Pérez',null],
  ['100687',1,'BOX','2026-03-04','Night (noche)','DNP','Cecilia Pérez',null],
  ['100690',1,'Almacén','2026-03-05','Day (día)','GRB','Nathalie López',null],
  ['100691',1,'TRG','2026-03-05','Day (día)','GRB','Angélica Alemán',null],
  ['100692',1,'Almacén','2026-03-05','Day (día)','GRA','Yusley Montes',null],
  ['100693',1,'HV (High Value)','2026-03-05','Day (día)','GRA','Nathalie López',null],
  ['100694',1,'Almacén','2026-03-05','Day (día)','GRB','Angélica Alemán',null],
  ['100695',1,'TRG','2026-03-05','Day (día)','ICB','Yusley Montes',null],
  ['100696',1,'Almacén','2026-03-05','Night (noche)','GRB','Cecilia Pérez',null],
  ['100697',1,'TRG','2026-03-05','Night (noche)','GRB','Cecilia Pérez',null],
  ['100700',1,'Almacén','2026-03-06','Day (día)','GRB','Angélica Alemán',null],
  ['100701',1,'Almacén','2026-03-06','Day (día)','GRB','Nathalie López',null],
  ['100702',1,'TRG','2026-03-06','Day (día)','GRA','Yusley Montes',null],
  ['100703',1,'HV (High Value)','2026-03-06','Day (día)','GRA','Angélica Alemán','PED-2026-019'],
  ['100704',1,'Almacén','2026-03-06','Day (día)','GRB','Nathalie López',null],
  ['100705',1,'BOX','2026-03-06','Day (día)','BOX','Yusley Montes',null],
  ['100706',1,'Almacén','2026-03-06','Night (noche)','GRB','Cecilia Pérez',null],
  ['100707',1,'Almacén','2026-03-06','Night (noche)','GRC','Cecilia Pérez',null],
  ['100712',1,'TRG','2026-03-09','Day (día)','GRB','Angélica Alemán',null],
  ['100713',1,'Almacén','2026-03-09','Day (día)','GRB','Nathalie López',null],
  ['100714',1,'Almacén','2026-03-09','Day (día)','GRB','Yusley Montes',null],
  ['100715',1,'HV (High Value)','2026-03-09','Day (día)','GRA','Angélica Alemán','PED-2026-019'],
  ['100716',1,'Almacén','2026-03-09','Day (día)','GRB','Nathalie López',null],
  ['100717',1,'TRG','2026-03-09','Day (día)','ICD','Yusley Montes',null],
  ['100718',1,'Almacén','2026-03-09','Night (noche)','GRB','Cecilia Pérez',null],
  ['100719',1,'TRG','2026-03-09','Night (noche)','GRB','Cecilia Pérez',null],
  ['100722',1,'Almacén','2026-03-10','Day (día)','GRB','Nathalie López',null],
  ['100723',1,'TRG','2026-03-10','Day (día)','GRA','Angélica Alemán',null],
  ['100724',1,'Almacén','2026-03-10','Day (día)','GRB','Yusley Montes',null],
  ['100725',1,'HV (High Value)','2026-03-10','Day (día)','GRA','Nathalie López','PED-2026-020'],
  ['100726',2,'Almacén','2026-03-10','Day (día)','GRB','Angélica Alemán',null],
  ['100727',1,'BOX','2026-03-10','Day (día)','DMT','Yusley Montes',null],
  ['100728',1,'Almacén','2026-03-10','Night (noche)','GRB','Cecilia Pérez',null],
  ['100729',1,'Almacén','2026-03-10','Night (noche)','GRB','Cecilia Pérez',null],
  ['100732',1,'Almacén','2026-03-11','Day (día)','GRB','Angélica Alemán',null],
  ['100733',1,'TRG','2026-03-11','Day (día)','GRB','Nathalie López',null],
  ['100734',1,'Almacén','2026-03-11','Day (día)','GRA','Yusley Montes',null],
  ['100735',1,'HV (High Value)','2026-03-11','Day (día)','GRA','Angélica Alemán','PED-2026-020'],
  ['100736',1,'Almacén','2026-03-11','Day (día)','GRB','Nathalie López',null],
  ['100737',1,'TRG','2026-03-11','Day (día)','ICB','Yusley Montes',null],
  ['100738',1,'Almacén','2026-03-11','Night (noche)','GRB','Cecilia Pérez',null],
  ['100739',1,'BOX','2026-03-11','Night (noche)','BOX','Cecilia Pérez',null],
  ['100742',1,'TRG','2026-03-12','Day (día)','GRB','Nathalie López',null],
  ['100743',1,'Almacén','2026-03-12','Day (día)','GRB','Angélica Alemán',null],
  ['100744',1,'Almacén','2026-03-12','Day (día)','GRB','Yusley Montes',null],
  ['100745',1,'HV (High Value)','2026-03-12','Day (día)','GRA','Nathalie López',null],
  ['100746',1,'Almacén','2026-03-12','Day (día)','GRB','Angélica Alemán',null],
  ['100747',1,'TRG','2026-03-12','Day (día)','GRA','Yusley Montes',null],
  ['100748',1,'Almacén','2026-03-12','Night (noche)','GRB','Cecilia Pérez',null],
  ['100749',1,'TRG','2026-03-12','Night (noche)','GRB','Cecilia Pérez',null],
  ['100752',1,'Almacén','2026-03-13','Day (día)','GRB','Angélica Alemán',null],
  ['100753',1,'Almacén','2026-03-13','Day (día)','GRB','Nathalie López',null],
  ['100754',1,'TRG','2026-03-13','Day (día)','ICC','Yusley Montes',null],
  ['100755',1,'HV (High Value)','2026-03-13','Day (día)','GRA','Angélica Alemán','PED-2026-021'],
  ['100756',1,'Almacén','2026-03-13','Day (día)','GRB','Nathalie López',null],
  ['100757',1,'BOX','2026-03-13','Day (día)','DMA','Yusley Montes',null],
  ['100758',1,'Almacén','2026-03-13','Night (noche)','GRB','Cecilia Pérez',null],
  ['100759',1,'Almacén','2026-03-13','Night (noche)','GRC','Cecilia Pérez',null],
  // Mar 16 + 17 (hoy)
  ['100764',1,'Almacén','2026-03-16','Day (día)','GRB','Angélica Alemán',null],
  ['100765',1,'TRG','2026-03-16','Day (día)','GRB','Nathalie López',null],
  ['100766',1,'Almacén','2026-03-16','Day (día)','GRA','Yusley Montes',null],
  ['100767',1,'HV (High Value)','2026-03-16','Day (día)','GRA','Angélica Alemán','PED-2026-021'],
  ['100768',1,'Almacén','2026-03-16','Day (día)','GRB','Nathalie López',null],
  ['100769',1,'TRG','2026-03-16','Day (día)','GRB','Yusley Montes',null],
  ['100770',1,'Almacén','2026-03-16','Night (noche)','GRB','Cecilia Pérez',null],
  ['100771',1,'TRG','2026-03-16','Night (noche)','GRB','Cecilia Pérez',null],
  // HOY Mar 17
  ['100774',1,'Almacén','2026-03-17','Day (día)','GRB','Angélica Alemán',null],
  ['100775',1,'TRG','2026-03-17','Day (día)','GRA','Nathalie López',null],
  ['100776',1,'Almacén','2026-03-17','Day (día)','GRB','Yusley Montes',null],
  ['100777',1,'HV (High Value)','2026-03-17','Day (día)','GRA','Angélica Alemán','PED-2026-022'],
  ['100778',1,'Almacén','2026-03-17','Day (día)','GRB','Nathalie López',null],
  ['100779',1,'TRG','2026-03-17','Day (día)','ICB','Yusley Montes',null],
];

const ERRORES = [
  ['100240','2026-01-06','Etiqueta dañada',null],
  ['100264','2026-01-08','Producto aplastado',null],
  ['100271','2026-01-09','Film roto',null],
  ['100304','2026-01-14','Pallet astillado',null],
  ['100328','2026-01-16','Contaminación',null],
  ['100338','2026-01-17','Producto húmedo',null],
  ['100348','2026-01-20','Etiqueta ilegible','HV'],
  ['100366','2026-01-22','Film roto, Etiqueta dañada',null],
  ['100371','2026-01-22','Producto aplastado',null],
  ['100391','2026-01-24','Pallet astillado',null],
  ['100412','2026-01-28','Contaminación',null],
  ['100425','2026-01-29','Producto húmedo',null],
  ['100433','2026-01-30','Film roto',null],
  ['100443','2026-01-31','Producto aplastado',null],
  ['100455','2026-02-02','Etiqueta dañada',null],
  ['100475','2026-02-04','Pallet astillado',null],
  ['100493','2026-02-06','Film roto',null],
  ['100506','2026-02-09','Etiqueta ilegible','HV'],
  ['100514','2026-02-10','Contaminación, Producto aplastado',null],
  ['100530','2026-02-11','Producto húmedo',null],
  ['100546','2026-02-13','Pallet astillado',null],
  ['100558','2026-02-16','Etiqueta ilegible','HV'],
  ['100576','2026-02-18','Film roto',null],
  ['100582','2026-02-18','Producto aplastado',null],
  ['100590','2026-02-19','Contaminación',null],
  ['100612','2026-02-23','Pallet astillado',null],
  ['100634','2026-02-25','Producto húmedo',null],
  ['100642','2026-02-26','Etiqueta dañada, Film roto',null],
  ['100652','2026-02-27','Producto aplastado',null],
  ['100664','2026-03-02','Film roto',null],
  ['100684','2026-03-04','Contaminación',null],
  ['100687','2026-03-04','Pallet astillado',null],
  ['100717','2026-03-09','Producto aplastado',null],
  ['100739','2026-03-11','Etiqueta ilegible','HV'],
  ['100754','2026-03-13','Film roto, Producto húmedo',null],
  ['100757','2026-03-13','Contaminación',null],
  ['100779','2026-03-17','Film roto',null],
];

async function seed() {
  let pool;
  try {
    pool = mysql.createPool(config.db);
    console.log('Conectando a MySQL...');
    await pool.query('SELECT 1');
    console.log('✓ MySQL conectado\n');

    // Create database if not exists
    try {
      await pool.query(`CREATE DATABASE IF NOT EXISTS ${config.db.database}`);
    } catch { /* may not have CREATE DB perms, table creation will fail if db doesn't exist */ }

    // Create tables
    console.log('Creando tablas...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS pallets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        pallet_id VARCHAR(50) NOT NULL,
        cantidad INT DEFAULT 1,
        producto VARCHAR(255) DEFAULT NULL,
        destino VARCHAR(100) NOT NULL,
        fecha DATE NOT NULL,
        turno VARCHAR(50) DEFAULT NULL,
        condicion VARCHAR(100) DEFAULT NULL,
        operador VARCHAR(100) DEFAULT NULL,
        pedido VARCHAR(100) DEFAULT NULL,
        observaciones VARCHAR(500) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_pallet_id (pallet_id),
        INDEX idx_fecha (fecha),
        INDEX idx_operador (operador),
        INDEX idx_turno (turno)
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS errores_pallet (
        id INT AUTO_INCREMENT PRIMARY KEY,
        pallet_id VARCHAR(50) NOT NULL,
        fecha DATE NOT NULL,
        defecto VARCHAR(255) NOT NULL,
        tipo VARCHAR(100) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_pallet_id (pallet_id),
        INDEX idx_fecha (fecha)
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS pallet_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        pallet_ref_id INT,
        pallet_id VARCHAR(50) NOT NULL,
        sku VARCHAR(100) NOT NULL,
        cantidad INT DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_pallet_id (pallet_id),
        INDEX idx_pallet_ref (pallet_ref_id)
      )
    `);
    console.log('✓ Tablas listas\n');

    // Check existing data
    const [[existing]] = await pool.query('SELECT COUNT(*) as c FROM pallets');
    if (existing.c > 0) {
      console.log(`⚠ Ya hay ${existing.c} pallets en la base.`);
      console.log('  Limpiando datos anteriores...');
      await pool.query('DELETE FROM pallet_items');
      await pool.query('DELETE FROM errores_pallet');
      await pool.query('DELETE FROM pallets');
      await pool.query('ALTER TABLE pallets AUTO_INCREMENT = 1');
      await pool.query('ALTER TABLE errores_pallet AUTO_INCREMENT = 1');
      console.log('  ✓ Datos anteriores eliminados\n');
    }

    // Insert pallets
    console.log(`Insertando ${PALLETS.length} pallets...`);
    const palletValues = PALLETS.map(p => [p[0], p[1], null, p[2], p[3], p[4], p[5], p[6], p[7], p[6]]);
    // Insert in batches of 50
    for (let i = 0; i < palletValues.length; i += 50) {
      const batch = palletValues.slice(i, i + 50);
      await pool.query(
        'INSERT INTO pallets (pallet_id, cantidad, producto, destino, fecha, turno, condicion, operador, pedido, observaciones) VALUES ?',
        [batch]
      );
      process.stdout.write(`  ${Math.min(i + 50, palletValues.length)}/${palletValues.length}\r`);
    }
    console.log(`✓ ${PALLETS.length} pallets insertados      \n`);

    // Insert errores
    console.log(`Insertando ${ERRORES.length} errores...`);
    const errorValues = ERRORES.map(e => [e[0], e[1], e[2], e[3]]);
    await pool.query(
      'INSERT INTO errores_pallet (pallet_id, fecha, defecto, tipo) VALUES ?',
      [errorValues]
    );
    console.log(`✓ ${ERRORES.length} errores insertados\n`);

    // Verify
    console.log('═══════════════════════════════════════');
    console.log('  VERIFICACIÓN');
    console.log('═══════════════════════════════════════');
    const [[pc]] = await pool.query('SELECT COUNT(*) as c FROM pallets');
    const [[ec]] = await pool.query('SELECT COUNT(*) as c FROM errores_pallet');
    console.log(`  Pallets en BD:  ${pc.c}`);
    console.log(`  Errores en BD:  ${ec.c}`);

    const [[todayCount]] = await pool.query("SELECT COUNT(*) as c FROM pallets WHERE fecha = CURDATE()");
    console.log(`  Pallets de hoy: ${todayCount.c}`);

    const [destinos] = await pool.query('SELECT destino, COUNT(*) as total FROM pallets GROUP BY destino ORDER BY total DESC');
    console.log('\n  Por destino:');
    destinos.forEach(d => console.log(`    ${d.destino}: ${d.total}`));

    const [turnos] = await pool.query('SELECT turno, COUNT(*) as total FROM pallets GROUP BY turno');
    console.log('\n  Por turno:');
    turnos.forEach(t => console.log(`    ${t.turno}: ${t.total}`));

    const [ops] = await pool.query('SELECT operador, COUNT(*) as total FROM pallets GROUP BY operador ORDER BY total DESC');
    console.log('\n  Por operador:');
    ops.forEach(o => console.log(`    ${o.operador}: ${o.total}`));

    console.log('\n═══════════════════════════════════════');
    console.log('  ✓ SEED COMPLETO — Listo para usar');
    console.log('  Ejecuta: node server.js');
    console.log('  Abre: http://localhost:3009');
    console.log('═══════════════════════════════════════\n');

    await pool.end();
  } catch (e) {
    console.error('\n✗ ERROR:', e.message);
    if (e.code === 'ECONNREFUSED') {
      console.error('\n  MySQL no está corriendo.');
      console.error('  Solución: Abre MySQL Workbench o ejecuta:');
      console.error('    net start MySQL84');
      console.error('  Luego vuelve a ejecutar: node seed.js\n');
    }
    if (pool) await pool.end();
    process.exit(1);
  }
}

seed();
