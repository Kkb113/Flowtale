import React, { useEffect, useState } from 'react';
import { Table } from 'antd';
import { ColumnsType } from 'antd/es/table';
import { getRandomId } from '@fable/common/dist/utils';
import { DatasetConfig, TableComponents, TableRow } from '../../types';
import {
  DATASET_COL_ID_ID,
  getTableColumnsAndRowsFromDataset,
} from '../../utils';
import * as Tags from './styled';
import { EditableCell, EditableRow } from './editable-data-row';
import { EditableHeaderCell, EditableHeaderRow } from './editable-header-row';
import RenameCreateColModal from './rename-create-col-modal';
import { showDeleteConfirm } from '../demo-hub-editor/delete-confirm';
import {
  addColumnToDataset, addRowToDataset, delColumnFromDataset,
  delRowFromDataset, renameColumnInDataset, updateRowInDataset,
} from './config-utils';
import { P_Dataset } from '../../entity-processor';

function getTableComponents(
  dataset: DatasetConfig,
  onUpdateRow: (row: Record<string, string>) => void,
  onDeleteRow: (rowId: string) => void,
  onDeleteColumn: (name: string) => void,
  onRenameColumn: (name: string) => void,
) : TableComponents {
  return ({
    body: {
      row: (props) => <EditableRow dataset={dataset} updateDataset={() => {}} {...props} />,
      cell: (props) => <EditableCell
        dataset={dataset}
        onUpdateRow={onUpdateRow}
        onDeleteRow={onDeleteRow}
        {...props}
      />,
    },
    header: {
      cell: (props) => <EditableHeaderCell
        onDelete={onDeleteColumn}
        onRename={onRenameColumn}
        dataset={dataset}
        {...props}
      />,
      row: (props) => <EditableHeaderRow dataset={dataset} {...props} />,
    },
  });
}

interface EditableTableProps {
  dataset: DatasetConfig,
  data: P_Dataset,
  onDatasetConfigChange: (name: string, config: DatasetConfig) => void;
}

const TABLE_COL_WIDTH = 180;
const specialColumns = ['Delete'];

function EditableTable(props: EditableTableProps): JSX.Element {
  const [dataSource, setDataSource] = useState<TableRow[]>([]);
  const [showAddColumnModal, setShowAddColumnModal] = useState(false);
  const [dataset, setDataset] = useState(props.dataset);
  const [columnsState, setColumnsState] = useState<ColumnsType<TableRow>>([]);
  const [renameModalStatus, setRenameModalStatus] = useState<null | {oldName: string, oldDesc?: string}>(null);

  const deleteRow = (rowId: string): void => {
    setDataset(d => delRowFromDataset(d, rowId));
  };

  const addRow = (): void => {
    setDataset(d => addRowToDataset(d));
  };

  const updateRow = (row: Record<string, string>): void => {
    setDataset(d => updateRowInDataset(d, row));
  };

  function deleteColumn(name: string): void {
    setDataset(d => delColumnFromDataset(d, name));
  }

  function addColumn(newColumnName: string, newDesc: string): void {
    setDataset(d => addColumnToDataset(d, newColumnName, newDesc));
  }

  const renameColumn = (oldName: string, newName: string, newDesc: string): void => {
    setDataset(d => renameColumnInDataset(d, oldName, newName, newDesc));
  };

  function onAddColumn(newColumnName: string, newDesc: string): void {
    addColumn(newColumnName, newDesc);
    setShowAddColumnModal(false);
  }

  function onDeleteColumn(name: string): void {
    if (name === 'id') return;
    showDeleteConfirm(() => { deleteColumn(name); }, 'Are you sure you want to delete this column?');
  }

  function onDeleteRow(rowId: string): void {
    showDeleteConfirm(() => { deleteRow(rowId); }, 'Are you sure you want to delete this row?');
  }

  function onRenameColumn(oldName: string): void {
    if (oldName === 'id') return;
    const column = dataset.data.table.columns.find(col => col.name === oldName);
    setRenameModalStatus({ oldName, oldDesc: column?.desc });
  }

  const getSpecialColumns = (): ColumnsType<TableRow> => specialColumns.map(colName => ({
    key: colName,
    title: colName,
    onCell: (record) => ({
      record,
      title: colName,
    }),
    onHeaderCell: () => ({
      title: colName
    }),
    width: TABLE_COL_WIDTH,
  }));

  const columns: ColumnsType<TableRow> = columnsState
    .filter(col => col.title !== 'id')
    .map((col) => ({
      key: getRandomId(),
      ...col,
      onCell: (record) => ({
        record,
        title: typeof col.title === 'string' ? col.title : undefined,
      }),
      onHeaderCell: () => ({
        title: typeof col.title === 'string' ? col.title : undefined!
      }),
      width: TABLE_COL_WIDTH,
    }));
  columns.push(...getSpecialColumns());

  const components = getTableComponents(dataset, updateRow, onDeleteRow, onDeleteColumn, onRenameColumn);

  useEffect(() => {
    const tableData = getTableColumnsAndRowsFromDataset(dataset);
    setDataSource(tableData.rows);
    setColumnsState(tableData.columns);
  }, [dataset]);

  useEffect(() => {
    if (props.dataset.lastUpdatedAt !== dataset?.lastUpdatedAt) {
      props.onDatasetConfigChange(props.data.name, dataset);
    }
  }, [dataset]);

  useEffect(() => {
    setDataset(props.dataset);
  }, [props.dataset]);

  return (
    <>
      <Tags.EditableTable style={{ display: 'flex', justifyContent: 'center' }}>
        <div>
          {
            columns.length > 1 ? (
              <div style={{ width: '680px' }}>
                <Table
                  size="small"
                  components={components}
                  rowClassName={() => 'editable-row'}
                  rowKey={(row) => row[DATASET_COL_ID_ID]}
                  bordered
                  dataSource={dataSource}
                  columns={columns}
                  pagination={false}
                  scroll={{ y: 420 }}
                />
              </div>
            ) : (
              <div className="empty-ds-con">
                <div className="typ-reg"> Empty dataset </div>
                <div className="typ-sm"> Create a column to start</div>
              </div>
            )
          }
          {
            columns.length > 1 && (
              <button
                onClick={() => addRow()}
                type="button"
                className="add-row-btn"
                style={{
                  width: '100%',
                }}
              >
                +
              </button>
            )
          }
        </div>
        <button
          type="button"
          className="add-col-btn"
          onClick={() => setShowAddColumnModal(true)}
        >
          +
        </button>
      </Tags.EditableTable>
      {
        showAddColumnModal && (
          <RenameCreateColModal
            type="Create"
            showModal={showAddColumnModal}
            onSave={(newName, newDesc) => onAddColumn(newName, newDesc)}
            closeModal={() => setShowAddColumnModal(false)}
            columns={dataset.data.table.columns}
            initialName=""
            initialDesc=""
            specialColumnNames={specialColumns}
          />
        )
      }
      {
        renameModalStatus && (
          <RenameCreateColModal
            type="Rename"
            showModal={!!renameModalStatus}
            onSave={(newName, newDesc) => renameColumn(renameModalStatus.oldName, newName, newDesc)}
            closeModal={() => setRenameModalStatus(null)}
            columns={dataset.data.table.columns}
            initialName={renameModalStatus.oldName}
            initialDesc={renameModalStatus.oldDesc || ''}
            specialColumnNames={specialColumns}
          />
        )
      }
    </>
  );
}

export default EditableTable;
