import React, { useState } from 'react';
import { Card, Upload, Button, Table, message, Typography, Alert, Space, Spin } from 'antd';
import { UploadOutlined, DownloadOutlined } from '@ant-design/icons';
import axios from '../../api/axios';
import * as XLSX from 'xlsx';

const headers = [
  'Type','Group','Brand','Product Name','Print Name','Purchase Price','Sale Price','Purchase Date','Expiry Date','Batch No','Quantity'
];

const UploadExcel: React.FC = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false); // overall upload action
  const [tableLoading, setTableLoading] = useState(false); // specific table spinner

  const handleTemplate = () => {
    const sample = [
      {
        'Type': 'Tablet',
        'Group': 'Paracetamol',
        'Brand': 'GSK',
        'Product Name': 'Panadol 500mg',
        'Print Name': 'Panadol 500mg',
        'Purchase Price': 10,
        'Sale Price': 15,
        'Purchase Date': new Date().toISOString().substring(0,10),
        'Expiry Date': new Date(Date.now() + 31536000000).toISOString().substring(0,10),
        'Batch No': 'BATCH-001',
        'Quantity': 100
      }
    ];
    const ws = XLSX.utils.json_to_sheet(sample, { header: headers });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Medicines');
    XLSX.writeFile(wb, 'medicine-upload-template.xlsx');
  };

  const props = {
    beforeUpload: async (file: File) => {
      const form = new FormData();
      form.append('file', file);
      setLoading(true);
      setTableLoading(true); // show overlay spinner on table region
      try {
        const res = await axios.post('/api/inventory/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } });
        setRows(res.data.items);
        message.success(`Imported ${res.data.count} items`);
      } catch (e:any) {
        message.error(e?.response?.data?.message || 'Upload failed');
      } finally {
        setLoading(false);
        // small delay so user notices spinner for very fast uploads
        setTimeout(() => setTableLoading(false), 300);
      }
      return false; // prevent antd from auto uploading
    }
  };

  return (
    <Card title="Bulk Upload Medicines" style={{ borderRadius:12 }}>
      <Typography.Paragraph>
        Upload an Excel (.xlsx) file with the following columns exactly:
      </Typography.Paragraph>
      <Alert type="info" showIcon message={<div style={{ fontSize:12 }}><b>Headers:</b> {headers.join(', ')}</div>} style={{ marginBottom:12 }} />
      <Space>
        <Upload {...props} showUploadList={false} accept=".xlsx">
          <Button icon={<UploadOutlined />} loading={loading} type="primary">Select File</Button>
        </Upload>
        <Button icon={<DownloadOutlined />} onClick={handleTemplate}>Download Template</Button>
      </Space>
      <div style={{ position: 'relative', marginTop: 20 }}>
        <Table
          size="small"
          dataSource={rows}
          rowKey="_id"
          pagination={false}
          columns={[
            { title: 'Product', dataIndex: 'productName' },
            { title: 'Brand', dataIndex: 'brand' },
            { title: 'Group', dataIndex: 'group' },
            { title: 'Type', dataIndex: 'type' },
            { title: 'Batch', render: (_:any,r:any) => r.batches?.[0]?.batchNo },
            { title: 'Quantity', render: (_:any,r:any) => r.batches?.[0]?.quantity },
            { title: 'Sale Price', dataIndex: 'salePrice' },
            { title: 'Expiry', dataIndex: 'expiryDate', render: (v:string)=> v ? new Date(v).toLocaleDateString() : '' }
          ]}
        />
        {tableLoading && (
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(255,255,255,0.65)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
            backdropFilter: 'blur(2px)'
          }}>
            <Spin tip="Uploading & processing..." />
          </div>
        )}
      </div>
    </Card>
  );
};

export default UploadExcel;
