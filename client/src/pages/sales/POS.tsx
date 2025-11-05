import React, { useState } from 'react';
import { Card, Input, Button, Table, Space, InputNumber, Select, message, Modal } from 'antd';
import { useQuery } from '@tanstack/react-query';
import axios from '../../api/axios';
import ReceiptPreview from '../../components/ReceiptPreview';

interface Medicine { id: string; name: string; strength?: string; batches: any[]; }
interface CartItem { medicine: Medicine; batchNo: string; quantity: number; unitPrice: number; discountType: string; discountValue: number; }

const POS: React.FC = () => {
  const { data: medicines } = useQuery({ queryKey: ['medicines'], queryFn: async () => (await axios.get('/api/inventory/medicines')).data });
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastSale, setLastSale] = useState<any | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);

  const filtered = (medicines||[]).filter((m:any) => m.name.toLowerCase().includes(search.toLowerCase()));

  const addToCart = (med: any, batchNo: string) => {
    const batch = med.batches.find((b:any) => b.batchNo === batchNo);
    if (!batch) return;
    setCart(c => [...c, { medicine: med, batchNo, quantity: 1, unitPrice: batch.salePrice, discountType: 'none', discountValue: 0 }]);
  };

  const update = (index:number, patch: Partial<CartItem>) => {
    setCart(c => c.map((item,i) => i===index ? { ...item, ...patch } : item));
  };

  const remove = (index:number) => setCart(c => c.filter((_,i)=>i!==index));

  const checkout = async () => {
    if (cart.length === 0) return message.warning('Cart empty');
    setLoading(true);
    try {
      const res = await axios.post('/api/sales', { items: cart.map(it => ({
        medicine: it.medicine.id,
        batchNo: it.batchNo,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        discountType: it.discountType,
        discountValue: it.discountValue
      })) });
      message.success('Sale completed');
      setLastSale(res.data);
      setShowReceipt(true);
      setCart([]);
    } catch (e:any) { message.error('Sale failed'); } finally { setLoading(false); }
  };

  const columns = [
    { title: 'Medicine', render: (_:any, r:CartItem) => r.medicine.name },
    { title: 'Batch', dataIndex: 'batchNo' },
    { title: 'Qty', render: (_:any, r:CartItem, idx:number) => <InputNumber min={1} value={r.quantity} onChange={(v)=>update(idx,{quantity:Number(v)})} /> },
    { title: 'Unit Price', render: (_:any, r:CartItem, idx:number) => <InputNumber min={0} value={r.unitPrice} onChange={(v)=>update(idx,{unitPrice:Number(v)})} /> },
    { title: 'Discount', render: (_:any, r:CartItem, idx:number) => <Space>
        <Select value={r.discountType} style={{width:100}} onChange={val=>update(idx,{discountType:val})} options={[{value:'none',label:'None'},{value:'flat',label:'Flat'},{value:'percent',label:'%'}]} />
        {r.discountType !== 'none' && <InputNumber min={0} value={r.discountValue} onChange={v=>update(idx,{discountValue:Number(v)})} />}
      </Space> },
    { title: 'Line Total', render: (_:any, r:CartItem) => {
      const base = r.unitPrice * r.quantity;
      let discount = 0;
      if (r.discountType==='flat') discount = r.discountValue;
      if (r.discountType==='percent') discount = base * (r.discountValue/100);
      return (base - discount).toFixed(2);
    } },
    { title: 'Action', render: (_:any, __:CartItem, idx:number) => <Button danger onClick={()=>remove(idx)}>Remove</Button> }
  ];

  const totals = cart.reduce((acc, it) => {
    const base = it.unitPrice * it.quantity;
    let discount = 0;
    if (it.discountType==='flat') discount = it.discountValue;
    if (it.discountType==='percent') discount = base * (it.discountValue/100);
    acc.subtotal += base; acc.discount += discount; acc.total += (base-discount); return acc;
  }, { subtotal:0, discount:0, total:0 });

  return (
    <div>
      <Card title="Point of Sale" extra={<Button type="primary" onClick={checkout} loading={loading}>Checkout</Button>}>
        <Space style={{ marginBottom: 12 }}>
          <Input placeholder="Search medicine" value={search} onChange={(e)=>setSearch(e.target.value)} />
        </Space>
        <div style={{ display:'flex', gap:16 }}>
          <div style={{ flex:1 }}>
            <h4>Results</h4>
            <div style={{ maxHeight:300, overflowY:'auto', border:'1px solid #eee', padding:8 }}>
              {filtered.map((m:any) => (
                <div key={m.id} style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                  <span>{m.name}</span>
                  <Select placeholder="Batch" style={{ width:140 }} onChange={(val)=>addToCart(m,val)} options={m.batches.map((b:any)=>({value:b.batchNo,label:`${b.batchNo} (${b.quantity})`}))} />
                </div>
              ))}
            </div>
          </div>
          <div style={{ flex:2 }}>
            <h4>Cart</h4>
            <Table dataSource={cart} rowKey={(r)=>r.medicine.id + r.batchNo} columns={columns} pagination={false} size="small" />
            <div style={{ marginTop: 16, textAlign:'right' }}>
              <div>Subtotal: {totals.subtotal.toFixed(2)}</div>
              <div>Discount: {totals.discount.toFixed(2)}</div>
              <div style={{ fontWeight:600 }}>Total: {totals.total.toFixed(2)}</div>
            </div>
          </div>
        </div>
      </Card>
      <Modal open={showReceipt} onCancel={()=>setShowReceipt(false)} footer={null} width={500} title={`Receipt ${lastSale?.receiptNumber}`}> 
        {lastSale && <ReceiptPreview sale={lastSale} onClose={()=>setShowReceipt(false)} />}
      </Modal>
    </div>
  );
};

export default POS;
