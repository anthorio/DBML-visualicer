import { loadAllTables as loadDbmlTables } from './dbmlLoader.js';
import { loadAllTxtTables } from './txtLoader.js';

// Alias para mantener consistencia
const loadTxtTables = loadAllTxtTables;

// Tipos de fuente de datos disponibles
export const DATA_SOURCES = {
  DBML: 'dbml',
  TXT: 'txt'
};

// Función principal para cargar tablas según la fuente seleccionada
export const loadTablesBySource = async (source = DATA_SOURCES.DBML) => {
  try {
    switch (source) {
      case DATA_SOURCES.DBML:
        return await loadDbmlTables();
      case DATA_SOURCES.TXT:
        return await loadTxtTables();
      default:
        console.warn(`Unknown data source: ${source}. Defaulting to TXT.`);
        return await loadTxtTables();
    }
  } catch (error) {
    console.error(`Error loading tables from source ${source}:`, error);
    return [];
  }
};

// Función para obtener estadísticas de las fuentes disponibles
export const getSourceStats = async () => {
  try {
    const [dbmlTables, txtTables] = await Promise.all([
      loadDbmlTables(),
      loadTxtTables()
    ]);
    
    return {
      [DATA_SOURCES.DBML]: {
        count: dbmlTables.length,
        files: [...new Set(dbmlTables.map(t => t.fileName))].length,
        totalColumns: dbmlTables.reduce((sum, t) => sum + t.columns.length, 0)
      },
      [DATA_SOURCES.TXT]: {
        count: txtTables.length,
        files: [...new Set(txtTables.map(t => t.fileName))].length,
        totalColumns: txtTables.reduce((sum, t) => sum + t.columns.length, 0)
      }
    };
  } catch (error) {
    console.error('Error getting source stats:', error);
    return {
      [DATA_SOURCES.DBML]: { count: 0, files: 0, totalColumns: 0 },
      [DATA_SOURCES.TXT]: { count: 0, files: 0, totalColumns: 0 }
    };
  }
};