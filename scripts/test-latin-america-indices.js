// Script para verificar que los índices de Latinoamérica devuelven datos reales
const API_KEY = '8084cf3a16a449caba286882cb101c28';
const BASE_URL = 'https://api.twelvedata.com';

// Símbolos de Latinoamérica a verificar
const latinAmericaSymbols = {
  'MERVAL': 'MERV',
  'IBOVESPA': 'BVSP',
  'IPC': 'MXX',
  'IPSA': 'IPSA',
  'IGBC': 'IGBC',
};

// Otros índices importantes a verificar
const otherIndices = {
  'S&P 500': 'SPX',
  'NASDAQ': 'IXIC',
  'DOW': 'DJI',
  'FTSE': 'FTSE',
  'NIKKEI': 'N225',
  'HANG SENG': 'HSI',
  'SHANGHAI': '000001.SS',
  'ASX 200': 'AXJO',
  'SENSEX': 'BSESN',
  'KOSPI': 'KS11',
  'DAX': 'GDAXI',
  'CAC 40': 'FCHI',
  'IBEX': 'IBEX',
  'FTSE MIB': 'FTSEMIB',
  'AEX': 'AEX',
};

async function testSymbol(name, symbol) {
  try {
    const url = `${BASE_URL}/quote?symbol=${symbol}&apikey=${API_KEY}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      console.log(`❌ ${name} (${symbol}): HTTP ${response.status}`);
      return false;
    }
    
    const data = await response.json();
    
    // Verificar que tiene los campos necesarios
    if (data.close && data.close !== 'N/A' && 
        data.previous_close && data.previous_close !== 'N/A' &&
        data.percent_change && data.percent_change !== 'N/A') {
      console.log(`✅ ${name} (${symbol}): ${data.close} (${data.percent_change}%)`);
      return true;
    } else {
      console.log(`⚠️  ${name} (${symbol}): Datos incompletos`, data);
      return false;
    }
  } catch (error) {
    console.log(`❌ ${name} (${symbol}): Error - ${error.message}`);
    return false;
  }
}

async function testAll() {
  console.log('=== VERIFICANDO ÍNDICES DE LATINOAMÉRICA ===\n');
  let latinSuccess = 0;
  let latinTotal = 0;
  
  for (const [name, symbol] of Object.entries(latinAmericaSymbols)) {
    latinTotal++;
    const success = await testSymbol(name, symbol);
    if (success) latinSuccess++;
    // Esperar un poco para no exceder rate limit
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log(`\n📊 Latinoamérica: ${latinSuccess}/${latinTotal} funcionando\n`);
  
  console.log('=== VERIFICANDO OTROS ÍNDICES ===\n');
  let otherSuccess = 0;
  let otherTotal = 0;
  
  for (const [name, symbol] of Object.entries(otherIndices)) {
    otherTotal++;
    const success = await testSymbol(name, symbol);
    if (success) otherSuccess++;
    // Esperar un poco para no exceder rate limit
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log(`\n📊 Otros índices: ${otherSuccess}/${otherTotal} funcionando\n`);
  
  console.log('=== RESUMEN ===');
  console.log(`Total Latinoamérica: ${latinSuccess}/${latinTotal}`);
  console.log(`Total Otros: ${otherSuccess}/${otherTotal}`);
  console.log(`Total General: ${latinSuccess + otherSuccess}/${latinTotal + otherTotal}`);
}

testAll().catch(console.error);







