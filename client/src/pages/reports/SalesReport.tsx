import React, { useState } from 'react';
import { DatePicker, Card, Table, Space, Button, Typography, message } from 'antd';
import dayjs from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import axios from '../../api/axios';
import * as XLSX from 'xlsx';

const { RangePicker } = DatePicker;

const SalesReport: React.FC = () => {
  const [range, setRange] = useState<[string,string] | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ['sales-report', range],
    queryFn: async () => {
      const params: any = {};
      if (range) { params.from = range[0]; params.to = range[1]; }
      return (await axios.get('/api/reports/sales', { params })).data;
    }
  });

  const handleExport = () => {
    const sales = data?.sales || [];
    if (!sales.length) {
      message.warning('No sales data to export.');
      return;
    }

    // Build rows for worksheet
    const rows: Array<Record<string, string | number>> = sales.map((s: any) => ({
      Receipt: s.receiptNumber,
      Subtotal: typeof s.subtotal === 'number' ? s.subtotal : '',
      Discount: typeof s.totalDiscount === 'number' ? s.totalDiscount : '',
      Total: typeof s.total === 'number' ? s.total : '',
      Status: s.status,
      Date: s.createdAt ? dayjs(s.createdAt).format('YYYY-MM-DD HH:mm') : ''
    }));

    // Append a summary row
    rows.push({
      Receipt: '--- SUMMARY ---',
      Subtotal: typeof data?.subtotal === 'number' ? data?.subtotal : '',
      Discount: typeof data?.discount === 'number' ? data?.discount : '',
      Total: typeof data?.total === 'number' ? data?.total : '',
      Status: '',
      Date: ''
    });

  const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sales');

    // Autofit columns (approx) by computing max width per header
    const colWidths = Object.keys(rows[0]).map(key => ({
      wch: Math.max(
        key.length,
        ...rows.map((r) => r[key] ? String(r[key]).length : 0)
      ) + 2
    }));
    (ws as any)['!cols'] = colWidths;

    const fileNameBase = range ? `sales-report-${dayjs(range[0]).format('YYYYMMDD')}-to-${dayjs(range[1]).format('YYYYMMDD')}` : 'sales-report-all';
    XLSX.writeFile(wb, `${fileNameBase}.xlsx`);
    message.success('Sales report exported.');
  };

  return (
    <Card title="Sales Report" extra={
      <Space wrap>
        <RangePicker
          onChange={(vals)=>{
            if (vals && vals[0] && vals[1]) {
              setRange([vals[0].toISOString(), vals[1].toISOString()]);
            } else {
              setRange(null);
            }
          }}
          showTime
        />
        {range && <Button onClick={()=>setRange(null)}>Clear Range</Button>}
        <Button type="primary" onClick={handleExport} disabled={isLoading || !(data?.sales?.length)}>Export Excel</Button>
      </Space>
    }>
      <Space direction="vertical" style={{ marginBottom: 12, width: '100%' }}>
        <Typography.Text type="secondary">
          {range ? 'Filtered to selected date range.' : 'Showing all sales (no date filter). Use the picker to narrow results.'}
        </Typography.Text>
        <div>
          <strong>Total:</strong> {data?.total?.toFixed(2)} | <strong>Discount:</strong> {data?.discount?.toFixed(2)} | <strong>Subtotal:</strong> {data?.subtotal?.toFixed(2)}
        </div>
      </Space>
      <Table loading={isLoading} dataSource={data?.sales || []} rowKey="_id" columns={[
        { title: 'Receipt', dataIndex: 'receiptNumber' },
        { title: 'Subtotal', dataIndex: 'subtotal' },
        { title: 'Discount', dataIndex: 'totalDiscount' },
        { title: 'Total', dataIndex: 'total' },
        { title: 'Status', dataIndex: 'status' },
        { title: 'Date', dataIndex: 'createdAt', render: (v:string) => dayjs(v).format('YYYY-MM-DD HH:mm') }
      ]} />
    </Card>
  );
};

export default SalesReport;
