import React, { useContext, useEffect, useRef, useState } from 'react';
import type { FormInstance, InputRef, TableProps } from 'antd';
import { Form } from 'antd';
import raiseDeferredError from '@fable/common/dist/deferred-error';
import { DeleteOutlined } from '@ant-design/icons';
import { DatasetConfig, TableColumn, TableRow } from '../../types';
import { DATASET_COL_ID_ID } from '../../utils';
import Input from '../input';

const EditableContext = React.createContext<FormInstance | null>(null);
interface Item {
  key: string;
  name: string;
  age: string;
  address: string;
}

interface EditableRowProps {
  dataset: DatasetConfig;
  updateDataset: () => void;
}

export function EditableRow({ dataset, updateDataset, ...props }: EditableRowProps) : JSX.Element {
  const [form] = Form.useForm();

  return (
    <Form form={form} component={false}>
      <EditableContext.Provider value={form}>
        <tr {...props} />
      </EditableContext.Provider>
    </Form>
  );
}

interface EditableCellProps {
  dataset: DatasetConfig;
  onUpdateRow: (record: TableRow) => void;
  onDeleteRow: (rowId: string) => void;
  title: string;
  editable: boolean;
  dataIndex: keyof Item;
  record: Record<string, string>;
  children: JSX.Element
}

export function EditableCell({
  dataset,
  onUpdateRow,
  onDeleteRow,
  record,
  ...props
}: EditableCellProps): JSX.Element {
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const form = useContext(EditableContext)!;

  const [col, setCol] = useState<TableColumn | null>(null);
  const [value, setValue] = useState<string | null>(null);
  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
    }
  }, [editing]);

  useEffect(() => {
    if (dataset && props.title) {
      const column = dataset.data.table.columns.find(colm => colm.name === props.title);
      if (column) {
        setValue(record[column.id]);
        setCol(column);
      }
    }
  }, []);

  function toggleEdit(): void {
    setEditing(!editing);
  }

  async function save() : Promise<void> {
    try {
      const data = form.getFieldsValue(true);
      onUpdateRow({ ...record, ...data });
      toggleEdit();
    } catch (errInfo) {
      raiseDeferredError(new Error(`Save failed:${errInfo}`));
    }
  }

  let childNode = props.children;

  if (props.title !== 'id' && props.title !== 'Delete') {
    childNode = (editing && (value !== null) && col) ? (
      <Form.Item style={{ margin: 0 }} name={props.dataIndex}>
        <Input
          innerRef={inputRef}
          label=""
          onBlur={() => save()}
          value={value}
          onChange={(e) => {
            form.setFieldsValue({ [col.id]: e.target.value });
            setValue(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') save();
          }}
          style={{
            height: 'fit-content',
            padding: '1px 3px',
            lineHeight: 'unset',
            borderRadius: '2px'
          }}
        />
      </Form.Item>
    ) : (
      <div
        className="editable-cell-value-wrap"
        style={{ paddingInlineEnd: 24, minHeight: '1.5rem' }}
        onClick={toggleEdit}
      >
        {props.children}
      </div>
    );
  }

  if (props.title === 'Delete') {
    childNode = (
      <div>
        <DeleteOutlined
          style={{ display: 'block', cursor: 'pointer' }}
          onClick={() => { onDeleteRow(record[DATASET_COL_ID_ID]); }}
        />
      </div>
    );
  }

  return <td {...props}>{childNode}</td>;
}
