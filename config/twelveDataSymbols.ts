// Mapeo de símbolos a los símbolos de Twelve Data API
export const TWELVE_DATA_SYMBOLS: Record<string, string> = {
  // Indices
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
  'MERVAL': 'MERV',
  'IBOVESPA': 'BVSP',
  'IPC': 'MXX',
  'IPSA': 'IPSA',
  'IGBC': 'IGBC',
  
  // Forex - Monedas individuales (precio en USD)
  // Para calcular Satoshis: (precio_moneda_USD / precio_BTC_USD) * 100,000,000
  // USD se maneja especialmente: 1 USD = 1 USD (no necesita API call)
  'EUR': 'EUR/USD', // Euro en USD
  'GBP': 'GBP/USD', // British Pound en USD
  'JPY': 'USD/JPY', // Para JPY, necesitamos invertir: 1 JPY = 1/USD/JPY USD
  'CHF': 'USD/CHF', // Para CHF, necesitamos invertir: 1 CHF = 1/USD/CHF USD
  'MXN': 'USD/MXN', // Para MXN, necesitamos invertir: 1 MXN = 1/USD/MXN USD
  'BRL': 'USD/BRL', // Para BRL, necesitamos invertir: 1 BRL = 1/USD/BRL USD
  'CNY': 'USD/CNY', // Para CNY, necesitamos invertir: 1 CNY = 1/USD/CNY USD
  'AUD': 'AUD/USD', // Australian Dollar en USD
  'CAD': 'USD/CAD', // Para CAD, necesitamos invertir: 1 CAD = 1/USD/CAD USD
  'ZAR': 'USD/ZAR', // Para ZAR, necesitamos invertir: 1 ZAR = 1/USD/ZAR USD
  'TRY': 'USD/TRY', // Para TRY, necesitamos invertir: 1 TRY = 1/USD/TRY USD
  'SGD': 'USD/SGD', // Para SGD, necesitamos invertir: 1 SGD = 1/USD/SGD USD
  'NZD': 'NZD/USD', // New Zealand Dollar en USD
  'HKD': 'USD/HKD', // Para HKD, necesitamos invertir: 1 HKD = 1/USD/HKD USD
  
  // Bitcoin
  'BTC': 'BTC/USD', // Bitcoin en USD
  
  // Commodities
  // IMPORTANTE: Usar símbolos de futuros (=F) para evitar confusión con acciones
  'Gold': 'XAU/USD', // Metal precioso - símbolo correcto
  'Crude Oil': 'CL=F', // CL=F es el símbolo correcto para Crude Oil futures (CL solo es Colgate-Palmolive)
  'Silver': 'XAG/USD', // Metal precioso - símbolo correcto
  'Copper': 'HG=F', // HG=F es el símbolo correcto para Copper futures (HG solo puede ser Hamilton Insurance)
  'Natural Gas': 'NG=F', // NG=F es el símbolo correcto para Natural Gas futures (NG solo puede ser NovaGold)
  'Brent': 'BZ=F', // BZ=F para Brent Crude futures
  'WTI': 'CL=F', // WTI también usa CL=F (West Texas Intermediate)
  'Platinum': 'XPT/USD', // Metal precioso - símbolo correcto
  'Palladium': 'XPD/USD', // Metal precioso - símbolo correcto
  'Aluminum': 'ALI=F', // ALI=F para Aluminum futures (ALI solo puede ser una empresa)
  'Wheat': 'ZW=F', // ZW=F para Wheat futures
  'Corn': 'ZC=F', // ZC=F para Corn futures
  'Soybeans': 'ZS=F', // ZS=F para Soybeans futures
  'Coffee': 'KC=F', // KC=F para Coffee futures
  'Sugar': 'SB=F', // SB=F para Sugar futures
};

