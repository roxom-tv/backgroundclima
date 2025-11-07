export interface MarketData {
  symbol: string;
  name: string;
  value: number;
  change: number; // porcentaje
  changeAmount: number; // valor absoluto
  changeType?: string; // 'intraday', '24h', 'daily', etc.
}

export interface MarketPlate {
  id: number;
  type: 'indices' | 'forex' | 'commodities';
  title: string;
  data: MarketData[];
}

export const MARKET_PLATES: MarketPlate[] = [
  // Plate 1: Indices
  {
    id: 1,
    type: 'indices',
    title: 'GLOBAL INDICES',
    data: [
      { symbol: 'S&P 500', name: 'S&P 500 Index', value: 4785.32, change: 0.85, changeAmount: 40.25 },
      { symbol: 'NASDAQ', name: 'NASDAQ Composite', value: 15023.45, change: 1.12, changeAmount: 166.78 },
      { symbol: 'DOW', name: 'Dow Jones', value: 37850.12, change: 0.45, changeAmount: 170.33 },
      { symbol: 'FTSE', name: 'FTSE 100', value: 7689.23, change: -0.23, changeAmount: -17.89 },
      { symbol: 'NIKKEI', name: 'Nikkei 225', value: 33850.67, change: 0.67, changeAmount: 225.45 },
    ],
  },
  // Plate 2: Forex
  {
    id: 2,
    type: 'forex',
    title: 'MAJOR FOREX',
    data: [
      { symbol: 'USD/EUR', name: 'US Dollar / Euro', value: 0.9234, change: 0.12, changeAmount: 0.0011 },
      { symbol: 'USD/GBP', name: 'US Dollar / British Pound', value: 0.7891, change: -0.08, changeAmount: -0.0006 },
      { symbol: 'USD/JPY', name: 'US Dollar / Japanese Yen', value: 149.23, change: 0.34, changeAmount: 0.51 },
      { symbol: 'EUR/GBP', name: 'Euro / British Pound', value: 0.8545, change: -0.15, changeAmount: -0.0013 },
      { symbol: 'USD/CHF', name: 'US Dollar / Swiss Franc', value: 0.8678, change: 0.09, changeAmount: 0.0008 },
    ],
  },
  // Plate 3: Commodities
  {
    id: 3,
    type: 'commodities',
    title: 'COMMODITIES',
    data: [
      { symbol: 'Gold', name: 'Gold (OZ)', value: 2034.56, change: 0.78, changeAmount: 15.82 },
      { symbol: 'Crude Oil', name: 'Crude Oil (Barrel)', value: 78.45, change: -0.45, changeAmount: -0.35 },
      { symbol: 'Silver', name: 'Silver (OZ)', value: 24.12, change: 1.23, changeAmount: 0.30 },
      { symbol: 'Copper', name: 'Copper (Lb)', value: 3.89, change: 0.52, changeAmount: 0.02 },
      { symbol: 'Natural Gas', name: 'Natural Gas', value: 2.67, change: -0.67, changeAmount: -0.02 },
    ],
  },
  // Plate 4: Indices (different)
  {
    id: 4,
    type: 'indices',
    title: 'ASIAN INDICES',
    data: [
      { symbol: 'HANG SENG', name: 'Hang Seng Index', value: 16523.45, change: 0.92, changeAmount: 150.78 },
      { symbol: 'SHANGHAI', name: 'Shanghai Composite', value: 3023.67, change: -0.34, changeAmount: -10.23 },
      { symbol: 'ASX 200', name: 'ASX 200', value: 7523.89, change: 0.56, changeAmount: 42.12 },
      { symbol: 'SENSEX', name: 'BSE Sensex', value: 72345.67, change: 0.78, changeAmount: 560.45 },
      { symbol: 'KOSPI', name: 'KOSPI Index', value: 2567.89, change: 0.45, changeAmount: 11.56 },
    ],
  },
  // Plate 5: Forex (different)
  {
    id: 5,
    type: 'forex',
    title: 'EMERGING FOREX',
    data: [
      { symbol: 'USD/MXN', name: 'US Dollar / Mexican Peso', value: 17.2345, change: 0.23, changeAmount: 0.0396 },
      { symbol: 'USD/BRL', name: 'US Dollar / Brazilian Real', value: 4.9234, change: -0.12, changeAmount: -0.0059 },
      { symbol: 'USD/CNY', name: 'US Dollar / Chinese Yuan', value: 7.1234, change: 0.08, changeAmount: 0.0057 },
      { symbol: 'EUR/JPY', name: 'Euro / Japanese Yen', value: 137.89, change: 0.45, changeAmount: 0.62 },
      { symbol: 'GBP/JPY', name: 'British Pound / Japanese Yen', value: 188.45, change: 0.34, changeAmount: 0.64 },
    ],
  },
  // Plate 6: Commodities (different)
  {
    id: 6,
    type: 'commodities',
    title: 'ENERGY & METALS',
    data: [
      { symbol: 'Brent', name: 'Brent Crude', value: 82.34, change: -0.23, changeAmount: -0.19 },
      { symbol: 'WTI', name: 'WTI Crude', value: 77.89, change: -0.34, changeAmount: -0.27 },
      { symbol: 'Platinum', name: 'Platinum (OZ)', value: 987.45, change: 0.89, changeAmount: 8.78 },
      { symbol: 'Palladium', name: 'Palladium (OZ)', value: 1023.67, change: -0.56, changeAmount: -5.76 },
      { symbol: 'Aluminum', name: 'Aluminum (Lb)', value: 0.98, change: 0.23, changeAmount: 0.0023 },
    ],
  },
  // Plate 7: Indices (different)
  {
    id: 7,
    type: 'indices',
    title: 'EUROPEAN INDICES',
    data: [
      { symbol: 'DAX', name: 'DAX Index', value: 16789.23, change: 0.67, changeAmount: 112.45 },
      { symbol: 'CAC 40', name: 'CAC 40', value: 7234.56, change: 0.45, changeAmount: 32.67 },
      { symbol: 'IBEX', name: 'IBEX 35', value: 9876.78, change: -0.12, changeAmount: -11.89 },
      { symbol: 'FTSE MIB', name: 'FTSE MIB', value: 30123.45, change: 0.78, changeAmount: 234.56 },
      { symbol: 'AEX', name: 'AEX Index', value: 723.45, change: 0.34, changeAmount: 2.46 },
    ],
  },
  // Plate 8: Forex (different)
  {
    id: 8,
    type: 'forex',
    title: 'EXOTIC FOREX',
    data: [
      { symbol: 'USD/ZAR', name: 'US Dollar / South African Rand', value: 18.4567, change: 0.45, changeAmount: 0.0831 },
      { symbol: 'USD/TRY', name: 'US Dollar / Turkish Lira', value: 30.1234, change: -0.23, changeAmount: -0.0693 },
      { symbol: 'USD/SGD', name: 'US Dollar / Singapore Dollar', value: 1.3456, change: 0.12, changeAmount: 0.0016 },
      { symbol: 'EUR/CHF', name: 'Euro / Swiss Franc', value: 0.9456, change: 0.08, changeAmount: 0.0008 },
      { symbol: 'AUD/USD', name: 'Australian Dollar / US Dollar', value: 0.6789, change: -0.15, changeAmount: -0.0010 },
    ],
  },
  // Plate 9: Commodities (different)
  {
    id: 9,
    type: 'commodities',
    title: 'AGRICULTURE',
    data: [
      { symbol: 'Wheat', name: 'Wheat (Bushel)', value: 6.78, change: 0.45, changeAmount: 0.0305 },
      { symbol: 'Corn', name: 'Corn (Bushel)', value: 4.56, change: -0.23, changeAmount: -0.0105 },
      { symbol: 'Soybeans', name: 'Soybeans (Bushel)', value: 12.34, change: 0.67, changeAmount: 0.0827 },
      { symbol: 'Coffee', name: 'Coffee (Lb)', value: 1.89, change: 0.89, changeAmount: 0.0168 },
      { symbol: 'Sugar', name: 'Sugar (Lb)', value: 0.23, change: -0.34, changeAmount: -0.0008 },
    ],
  },
  // Plate 10: Indices (different)
  {
    id: 10,
    type: 'indices',
    title: 'LATIN AMERICA INDICES',
    data: [
      { symbol: 'MERVAL', name: 'MERVAL Argentina', value: 1234567.89, change: 1.23, changeAmount: 15023.45 },
      { symbol: 'IBOVESPA', name: 'IBOVESPA Brazil', value: 134567.89, change: 0.89, changeAmount: 1198.23 },
      { symbol: 'IPC', name: 'IPC Mexico', value: 56789.12, change: 0.45, changeAmount: 255.56 },
      { symbol: 'IPSA', name: 'IPSA Chile', value: 6234.56, change: -0.12, changeAmount: -7.48 },
      { symbol: 'IGBC', name: 'IGBC Colombia', value: 1234.56, change: 0.67, changeAmount: 8.27 },
    ],
  },
];

export const MARKET_PLATE_DURATION = 15; // segundos

