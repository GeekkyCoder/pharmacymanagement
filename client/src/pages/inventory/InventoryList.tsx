import React from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from '../../api/axios';
import { Table, Tag, Button, Space, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';

interface MedicineRow {
  id: string;
  name: string;
  strength?: string;
  totalQuantity: number;
  low: boolean;
  batches: any[];
}

const InventoryList: React.FC = () => {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ['medicines'],
    queryFn: async () => (await axios.get('/api/inventory/medicines')).data as MedicineRow[]
  });

  const handleExport = () => {
    if (!data || !data.length) {
      message.warning('No inventory data to export.');
      return;
    }
    const rows = data.map(m => ({
      Name: m.name,
      Strength: m.strength || '',
      Quantity: m.totalQuantity,
      Status: m.low ? 'Low' : 'OK',
      Batches: m.batches?.length || 0
    }));
    // Try auto-sizing columns
    const ws = XLSX.utils.json_to_sheet(rows);
    type RowType = (typeof rows)[number];
    const keys = Object.keys(rows[0]) as Array<keyof RowType>;
    const colWidths = keys.map(key => ({
      wch: Math.max(
        String(key).length,
        ...rows.map(r => r[key] ? String(r[key]).length : 0)
      ) + 2
    }));
    (ws as any)['!cols'] = colWidths;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inventory');
    XLSX.writeFile(wb, 'inventory.xlsx');
    message.success('Inventory exported.');
  };

  return (
    <div>
      <Space style={{ marginBottom: 12 }}>
        <Button type="primary" onClick={() => navigate('/dashboard/inventory/add')}>Add Medicine</Button>
        <Button onClick={() => navigate('/dashboard/inventory/upload')}>Upload Excel</Button>
        <Button type="primary" onClick={handleExport} disabled={!data || !data.length}>Export Excel</Button>
      </Space>
      <Table loading={isLoading} rowKey="id" dataSource={data} columns={[
        { title: 'Name', dataIndex: 'name' },
        { title: 'Strength', dataIndex: 'strength' },
        { title: 'Quantity', dataIndex: 'totalQuantity' },
        { title: 'Status', render: (_, r:MedicineRow) => r.low ? <Tag color="red">Low</Tag> : <Tag color="green">OK</Tag> },
        { title: 'Batches', render: (_, r:MedicineRow) => r.batches.length }
      ]} />
    </div>
  );
};

export default InventoryList;
