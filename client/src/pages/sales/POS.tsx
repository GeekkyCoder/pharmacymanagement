import React, { useState } from 'react';
import { Card, Input, Button, Table, Space, InputNumber, Select, message, Modal } from 'antd';
import { useQuery } from '@tanstack/react-query';
import axios from '../../api/axios';
import ReceiptPreview from '../../components/ReceiptPreview';

interface Batch { batchNo: string; quantity: number; salePrice: number; expiryDate: string; }
// API returns `id` (mapped from Mongo `_id`); we keep compatibility allowing optional `_id`.
interface Medicine { id: string; _id?: string; productName: string; brand?: string; group?: string; type?: string; batches: Batch[]; salePrice?: number; }
interface CartItem { medicine: Medicine; batchNo: string; quantity: number; unitPrice: number; discountType: string; discountValue: number; }

const POS: React.FC = () => {
  const { data: medicines, isLoading: loadingMedicines } = useQuery({ queryKey: ['medicines'], queryFn: async () => (await axios.get('/api/inventory/medicines')).data });
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastSale, setLastSale] = useState<any | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);

  const filtered = (medicines || []).filter((m: Medicine) => m.productName?.toLowerCase().includes(search.toLowerCase()));

  const addToCart = (med: Medicine, batchNo: string) => {
    const batch = med.batches.find((b: any) => b.batchNo === batchNo);
    if (!batch) return;
    setCart(c => {
      const medId = med._id || med.id;
      const existingIndex = c.findIndex(ci => (ci.medicine._id || ci.medicine.id) === medId && ci.batchNo === batchNo);
      if (existingIndex >= 0) {
        // Increment quantity if already in cart
        return c.map((ci, i) => i === existingIndex ? { ...ci, quantity: ci.quantity + 1 } : ci);
      }
      return [...c, { medicine: med, batchNo, quantity: 1, unitPrice: batch.salePrice || med.salePrice || 0, discountType: 'none', discountValue: 0 }];
    });
  };

  const update = (index: number, patch: Partial<CartItem>) => {
    setCart(c => c.map((item, i) => i === index ? { ...item, ...patch } : item));
  };

  const remove = (index: number) => setCart(c => c.filter((_, i) => i !== index));

  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'other'>('cash');
  const [amountTendered, setAmountTendered] = useState<number | undefined>(undefined);

  const checkout = async () => {
    if (cart.length === 0) return message.warning('Cart empty');
    if (paymentMethod === 'cash') {
      const total = totals.total;
      if (!amountTendered || amountTendered <= 0) return message.warning('Enter amount tendered');
      if (amountTendered < total) return message.warning('Amount tendered is less than total');
    }
    setLoading(true);
    try {
      const res = await axios.post('/api/sales', {
        items: cart.map(it => ({
          medicine: (it.medicine._id || it.medicine.id),
          batchNo: it.batchNo,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          discountType: it.discountType,
          discountValue: it.discountValue
        })), paymentMethod, amountTendered: paymentMethod === 'cash' ? amountTendered : undefined
      });
      message.success('Sale completed');
      setLastSale(res.data);
      setShowReceipt(true);
      setCart([]);
      setAmountTendered(undefined);
    } catch (e: any) {
      message.error(e?.response?.data?.message || 'Sale failed');
    } finally { setLoading(false); }
  };

  const columns = [
    { title: 'Medicine', render: (_: any, r: CartItem) => r.medicine.productName },
    { title: 'Batch', dataIndex: 'batchNo' },
    { title: 'Qty', render: (_: any, r: CartItem, idx: number) => <InputNumber min={1} value={r.quantity} onChange={(v) => update(idx, { quantity: Number(v) })} /> },
    { title: 'Unit Price', render: (_: any, r: CartItem, idx: number) => <InputNumber min={0} value={r.unitPrice} onChange={(v) => update(idx, { unitPrice: Number(v) })} /> },
    {
      title: 'Discount', render: (_: any, r: CartItem, idx: number) => <Space>
        <Select value={r.discountType} style={{ width: 100 }} onChange={val => update(idx, { discountType: val })} options={[{ value: 'none', label: 'None' }, { value: 'flat', label: 'Flat' }, { value: 'percent', label: '%' }]} />
        {r.discountType !== 'none' && <InputNumber min={0} value={r.discountValue} onChange={v => update(idx, { discountValue: Number(v) })} />}
      </Space>
    },
    {
      title: 'Line Total', render: (_: any, r: CartItem) => {
        const base = r.unitPrice * r.quantity;
        let discount = 0;
        if (r.discountType === 'flat') discount = r.discountValue;
        if (r.discountType === 'percent') discount = base * (r.discountValue / 100);
        return (base - discount).toFixed(2);
      }
    },
    { title: 'Action', render: (_: any, __: CartItem, idx: number) => <Button danger onClick={() => remove(idx)}>Remove</Button> }
  ];

  const totals = cart.reduce((acc, it) => {
    const base = it.unitPrice * it.quantity;
    let discount = 0;
    if (it.discountType === 'flat') discount = it.discountValue;
    if (it.discountType === 'percent') discount = base * (it.discountValue / 100);
    acc.subtotal += base; acc.discount += discount; acc.total += (base - discount); return acc;
  }, { subtotal: 0, discount: 0, total: 0 });

  const changeDue = paymentMethod === 'cash' && amountTendered ? (amountTendered - totals.total) : 0;

  return (
    <div>
      <Card
        title="Point of Sale"
        extra={<Space>
          <Select
            value={paymentMethod}
            onChange={(v) => setPaymentMethod(v)}
            options={[{ value: 'cash', label: 'Cash' }, { value: 'card', label: 'Card' }, { value: 'other', label: 'Other' }]}
            style={{ width: 110 }}
          />
          {paymentMethod === 'cash' && (
            <InputNumber
              placeholder="Amount Tendered"
              value={amountTendered}
              min={0}
              onChange={v => setAmountTendered(v ? Number(v) : undefined)}
            />
          )}
          <Button
            type="primary"
            onClick={checkout}
            loading={loading}
            disabled={paymentMethod === 'cash' && (!amountTendered || amountTendered < totals.total)}
          >Checkout</Button>
        </Space>}
      >
        <Space style={{ marginBottom: 12 }}>
          <Input placeholder="Search medicine" value={search} onChange={(e) => setSearch(e.target.value)} />
        </Space>
        <div style={{ display: 'flex', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <h4>Results</h4>
            <div style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid #eee', padding: 8 }}>
              {loadingMedicines && <div style={{ textAlign: 'center', padding: 40 }}>Loading medicines...</div>}
              {!loadingMedicines && filtered.map((m: Medicine) => (
                <div key={(m._id || m.id)} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span>{m.productName}</span>
                  <Select
                    placeholder="Batch"
                    style={{ width: 160 }}
                    onChange={(val) => addToCart(m, val)}
                    options={m.batches.map((b: Batch) => ({
                      value: b.batchNo,
                      label: `${b.batchNo} (${b.quantity})`,
                      disabled: b.quantity <= 0
                    }))}
                  />
                </div>
              ))}
            </div>
          </div>
          <div style={{ flex: 2 }}>
            <h4>Cart</h4>
            <Table dataSource={cart} rowKey={(r) => (r.medicine._id || r.medicine.id) + r.batchNo} columns={columns} pagination={false} size="small" />
            <div style={{ marginTop: 16, textAlign: 'right' }}>
              <div>Subtotal: {totals.subtotal.toFixed(2)}</div>
              <div>Discount: {totals.discount.toFixed(2)}</div>
              <div style={{ fontWeight: 600 }}>Total: {totals.total.toFixed(2)}</div>
              {paymentMethod === 'cash' && (
                <>
                  <div>Amount Tendered: {amountTendered ? amountTendered.toFixed(2) : '—'}</div>
                  <div>Change Due: {amountTendered && amountTendered >= totals.total ? changeDue.toFixed(2) : '—'}</div>
                </>
              )}
            </div>
          </div>
        </div>
      </Card>
      <Modal open={showReceipt} onCancel={() => setShowReceipt(false)} footer={null} width={500} title={`Receipt ${lastSale?.receiptNumber}`}>
        {lastSale && <ReceiptPreview sale={lastSale} onClose={() => setShowReceipt(false)} />}
      </Modal>
    </div>
  );
};

export default POS;
