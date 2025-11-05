import React, { useState } from 'react';
import { Card, Upload, Button, Table, message } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import axios from '../../api/axios';

const UploadExcel: React.FC = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const props = {
    beforeUpload: async (file: File) => {
      const form = new FormData();
      form.append('file', file);
      setLoading(true);
      try {
        const res = await axios.post('/api/inventory/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } });
        setRows(res.data.items);
        message.success(`Imported ${res.data.count} items`);
      } catch (e:any) {
        message.error('Upload failed');
      } finally { setLoading(false); }
      return false;
    }
  };

  return (
    <Card title="Upload Medicines via Excel">
      <Upload {...props} showUploadList={false}>
        <Button icon={<UploadOutlined />} loading={loading}>Select File</Button>
      </Upload>
      <Table style={{ marginTop: 16 }} dataSource={rows} rowKey="_id" columns={[
        { title: 'Name', dataIndex: 'name' },
        { title: 'Strength', dataIndex: 'strength' },
        { title: 'Quantity', render: (_, r:any) => r.batches?.[0]?.quantity },
        { title: 'Batch', render: (_, r:any) => r.batches?.[0]?.batchNo },
      ]} />
    </Card>
  );
};

export default UploadExcel;
