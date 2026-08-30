import { getCurrentUtcUnixTime, getRandomId } from '@fable/common/dist/utils';
import { DatasetConfig, Table, TableColumn, TableRow } from '../../types';
import { DATASET_COL_ID_ID } from '../../utils';

export const newConfigFrom = (config: DatasetConfig): DatasetConfig => {
  const newConfig: DatasetConfig = {
    ...config,
    data: {
      ...config.data,
      table: {
        ...config.data.table
      }
    }
  };
  newConfig.lastUpdatedAt = getCurrentUtcUnixTime();
  return newConfig;
};

export const addColumnToDataset = (
  config: DatasetConfig,
  newColumnName: string,
  newColumnDesc: string
): DatasetConfig => {
  const newConfig = newConfigFrom(config);
  const newColSeq = newConfig.data.table.colSeq + 1;
  const newColumn: TableColumn = {
    id: newColSeq,
    name: newColumnName,
    desc: newColumnDesc,
  };

  newConfig.data.table.colSeq = newColSeq;
  newConfig.data.table.columns.push(newColumn);

  return newConfig;
};

export const delColumnFromDataset = (
  config: DatasetConfig,
  columnName: string,
): DatasetConfig => {
  const newConfig = newConfigFrom(config);
  const table = newConfig.data.table;
  const cols = table.columns;
  const colToBeDeleted = cols.find(col => col.name === columnName);
  let newCols = [...cols];
  let newRows = [...table.rows];

  if (colToBeDeleted) {
    newCols = cols.filter(col => col.id !== colToBeDeleted.id);
    newRows = newRows.map(row => {
      const newRow = { ...row };
      delete newRow[colToBeDeleted.id];
      return newRow;
    });
  }

  newConfig.data.table.columns = newCols;
  newConfig.data.table.rows = newRows;

  return newConfig;
};

export const renameColumnInDataset = (
  config: DatasetConfig,
  columnName: string,
  newColumnName: string,
  newColumnDesc: string,
): DatasetConfig => {
  if (!(isColUpdated(config.data.table, columnName, newColumnName, newColumnDesc))) return config;

  const newConfig = newConfigFrom(config);
  const table = newConfig.data.table;
  const cols = table.columns;
  const colToBeRenamed = cols.find(col => col.name === columnName);

  let newCols = [...cols];
  if (colToBeRenamed) {
    newCols = cols.map(col => {
      if (col.id === colToBeRenamed.id) {
        return {
          ...col,
          name: newColumnName,
          desc: newColumnDesc,
        };
      }
      return { ...col };
    });
  }

  newConfig.data.table.columns = newCols;

  return newConfig;
};

export const addRowToDataset = (
  config: DatasetConfig,
): DatasetConfig => {
  const newConfig = newConfigFrom(config);
  const newRow: TableRow = {};

  newConfig.data.table.columns.forEach(col => {
    newRow[col.id] = '';
  });
  newRow[DATASET_COL_ID_ID] = getRandomId();

  newConfig.data.table.rows.push(newRow);

  return newConfig;
};

export const delRowFromDataset = (
  config: DatasetConfig,
  rowId: string,
): DatasetConfig => {
  const newConfig = newConfigFrom(config);
  const rows = newConfig.data.table.rows;

  newConfig.data.table.rows = rows.filter(row => row[DATASET_COL_ID_ID] !== rowId);

  return newConfig;
};

export const updateRowInDataset = (
  config: DatasetConfig,
  updatedRow: TableRow,
): DatasetConfig => {
  if (!isRowUpdated(config.data.table, updatedRow)) return config;

  const newConfig = newConfigFrom(config);
  const rows = newConfig.data.table.rows;

  newConfig.data.table.rows = rows.map(row => {
    if (row[DATASET_COL_ID_ID] === updatedRow[DATASET_COL_ID_ID]) {
      return updatedRow;
    }
    return row;
  });

  return newConfig;
};

function isRowUpdated(table: Table, updatedRow: TableRow): boolean {
  const prevRow = table.rows.find(row => row[DATASET_COL_ID_ID] === updatedRow[DATASET_COL_ID_ID]);
  if (!prevRow) return false;

  for (const col of table.columns) {
    if (prevRow[col.id] !== updatedRow[col.id]) {
      return true;
    }
  }

  return false;
}

function isColUpdated(
  table: Table,
  oldName: string,
  newName: string,
  newDesc: string
): boolean {
  const prevCol = table.columns.find(col => col.name === oldName);
  if (!prevCol) return false;

  if (prevCol.name !== newName) return true;
  if (prevCol.desc !== newDesc) return true;

  return false;
}
