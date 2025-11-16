import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from '../../api/axios';
import { Table, Tag, Button, Space, message, Modal, Form, Input, InputNumber, DatePicker, Switch } from 'antd';
import { useNavigate } from 'react-router-dom';
import { EditOutlined, SearchOutlined } from '@ant-design/icons';
import * as XLSX from 'xlsx';
import dayjs from 'dayjs';

interface MedicineRow {
  id: string;
  productName: string;
  printName: string;
  brand: string;
  group: string;
  type: string;
  purchasePrice: number;
  salePrice: number;
  purchaseDate: string;
  expiryDate: string;
  totalQuantity: number;
  low: boolean;
  lockStockThreshold: number;
  controlled: boolean;
  batches: any[];
}

const InventoryList: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchText, setSearchText] = useState('');
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState<MedicineRow | null>(null);
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['medicines', searchText],
    queryFn: async () => {
      const url = searchText 
        ? `/api/inventory/medicines?search=${encodeURIComponent(searchText)}`
        : '/api/inventory/medicines';
      return (await axios.get(url)).data as MedicineRow[];
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (values: any) => {
      return await axios.put(`/api/inventory/medicines/${editingMedicine?.id}`, values);
    },
    onSuccess: () => {
      message.success('Medicine updated successfully');
      queryClient.invalidateQueries({ queryKey: ['medicines'] });
      setIsEditModalVisible(false);
      setEditingMedicine(null);
      form.resetFields();
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to update medicine');
    }
  });

  const handleEdit = (record: MedicineRow) => {
    setEditingMedicine(record);
    form.setFieldsValue({
      type: record.type,
      group: record.group,
      brand: record.brand,
      productName: record.productName,
      printName: record.printName,
      purchasePrice: record.purchasePrice,
      salePrice: record.salePrice,
      purchaseDate: record.purchaseDate ? dayjs(record.purchaseDate) : null,
      expiryDate: record.expiryDate ? dayjs(record.expiryDate) : null,
      controlled: record.controlled,
      lockStockThreshold: record.lockStockThreshold
    });
    setIsEditModalVisible(true);
  };

  const handleEditModalCancel = () => {
    setIsEditModalVisible(false);
    setEditingMedicine(null);
    form.resetFields();
  };

  const handleEditSubmit = async () => {
    try {
      const values = await form.validateFields();
      updateMutation.mutate({
        ...values,
        purchaseDate: values.purchaseDate?.toISOString(),
        expiryDate: values.expiryDate?.toISOString()
      });
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const handleExport = () => {
    if (!data || !data.length) {
      message.warning('No inventory data to export.');
      return;
    }
    const rows = data.map(m => ({
      Product: m.productName,
      Brand: m.brand,
      Group: m.group,
      Type: m.type,
      Quantity: m.totalQuantity,
      SalePrice: m.salePrice,
      Expiry: m.expiryDate ? new Date(m.expiryDate).toLocaleDateString() : '',
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
      <Space style={{ marginBottom: 12 }} wrap>
        <Button type="primary" onClick={() => navigate('/dashboard/inventory/add')}>Add Medicine</Button>
        <Button onClick={() => navigate('/dashboard/inventory/upload')}>Upload Excel</Button>
        <Button type="primary" onClick={handleExport} disabled={!data || !data.length}>Export Excel</Button>
      </Space>
      
      <Space style={{ marginBottom: 12, width: '100%' }} direction="vertical">
        <Input
          placeholder="Search medicines by product name, brand, group, or type..."
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ maxWidth: 600 }}
          allowClear
        />
      </Space>

      <Table 
        loading={isLoading} 
        rowKey="id" 
        dataSource={data} 
        columns={[
        { title: 'Product', dataIndex: 'productName' },
        { title: 'Brand', dataIndex: 'brand' },
        { title: 'Group', dataIndex: 'group' },
        { title: 'Type', dataIndex: 'type' },
        { title: 'Quantity', dataIndex: 'totalQuantity' },
        { title: 'Sale Price', dataIndex: 'salePrice' },
        { title: 'Expiry', dataIndex: 'expiryDate', render: (v:string) => v ? new Date(v).toLocaleDateString() : '' },
        { title: 'Status', render: (_, r:MedicineRow) => r.low ? <Tag color="red">Low</Tag> : <Tag color="green">OK</Tag> },
        { title: 'Batches', render: (_, r:MedicineRow) => r.batches.length },
        { 
          title: 'Actions', 
          render: (_, record:MedicineRow) => (
            <Button 
              type="link" 
              icon={<EditOutlined />} 
              onClick={() => handleEdit(record)}
            >
              Edit
            </Button>
          )
        }
      ]} 
      />

      <Modal
        title="Edit Medicine"
        open={isEditModalVisible}
        onOk={handleEditSubmit}
        onCancel={handleEditModalCancel}
        confirmLoading={updateMutation.isPending}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="type"
            label="Type"
            rules={[{ required: true, message: 'Please enter medicine type' }]}
          >
            <Input placeholder="e.g., Tablet, Syrup, Injection" />
          </Form.Item>

          <Form.Item
            name="group"
            label="Group"
            rules={[{ required: true, message: 'Please enter medicine group' }]}
          >
            <Input placeholder="e.g., Paracetamol, Ciprofloxacin" />
          </Form.Item>

          <Form.Item
            name="brand"
            label="Brand"
            rules={[{ required: true, message: 'Please enter brand' }]}
          >
            <Input placeholder="e.g., Sami, GSK" />
          </Form.Item>

          <Form.Item
            name="productName"
            label="Product Name"
            rules={[{ required: true, message: 'Please enter product name' }]}
          >
            <Input placeholder="Medicine name + strength" />
          </Form.Item>

          <Form.Item
            name="printName"
            label="Print Name"
          >
            <Input placeholder="Name to print on receipt" />
          </Form.Item>

          <Space style={{ width: '100%' }} size="large">
            <Form.Item
              name="purchasePrice"
              label="Purchase Price"
              rules={[{ required: true, message: 'Please enter purchase price' }]}
            >
              <InputNumber min={0} style={{ width: 150 }} />
            </Form.Item>

            <Form.Item
              name="salePrice"
              label="Sale Price"
              rules={[{ required: true, message: 'Please enter sale price' }]}
            >
              <InputNumber min={0} style={{ width: 150 }} />
            </Form.Item>
          </Space>

          <Space style={{ width: '100%' }} size="large">
            <Form.Item
              name="purchaseDate"
              label="Purchase Date"
              rules={[{ required: true, message: 'Please select purchase date' }]}
            >
              <DatePicker style={{ width: 150 }} />
            </Form.Item>

            <Form.Item
              name="expiryDate"
              label="Expiry Date"
              rules={[{ required: true, message: 'Please select expiry date' }]}
            >
              <DatePicker style={{ width: 150 }} />
            </Form.Item>
          </Space>

          <Space style={{ width: '100%' }} size="large">
            <Form.Item
              name="lockStockThreshold"
              label="Low Stock Threshold"
            >
              <InputNumber min={0} style={{ width: 150 }} />
            </Form.Item>

            <Form.Item
              name="controlled"
              label="Controlled Substance"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
          </Space>
        </Form>
      </Modal>
    </div>
  );
};

export default InventoryList;
