import React from 'react';
import { Button, Divider, Typography, Table } from 'antd';

interface SaleItem {
  medicine: string; // id
  batchNo: string;
  quantity: number;
  unitPrice: number;
  discountType: string;
  discountValue: number;
  lineTotal: number;
}
interface Sale {
  receiptNumber: string;
  items: SaleItem[];
  subtotal: number;
  totalDiscount: number;
  total: number;
  createdAt: string;
  paymentMethod: string;
}

const ReceiptPreview: React.FC<{ sale: Sale; onClose?: () => void }> = ({ sale, onClose }) => {
  const print = () => {
    const content = document.getElementById('printable-receipt');
    if (!content) return;
    const win = window.open('', 'PRINT', 'height=650,width=400');
    if (!win) return;
    win.document.write('<html><head><title>Receipt</title><style>body{font-family:Arial;padding:8px;} table{width:100%;border-collapse:collapse;} th,td{font-size:12px;padding:4px;border-bottom:1px solid #ddd;} h2{margin:4px 0;} .totals div{display:flex;justify-content:space-between;} </style></head><body>');
    win.document.write(content.innerHTML);
    win.document.write('</body></html>');
    win.document.close();
    win.focus();
    win.print();
    win.close();
  };

  return (
    <div>
      <div id="printable-receipt">
        <Typography.Title level={4} style={{ textAlign:'center' }}>Pharmacy Receipt</Typography.Title>
        <div>Receipt: <strong>{sale.receiptNumber}</strong></div>
        <div>Date: {new Date(sale.createdAt).toLocaleString()}</div>
        <Divider style={{ margin:'8px 0' }}/>
        <Table
          size="small"
          pagination={false}
          dataSource={sale.items}
          rowKey={(r)=>r.medicine + r.batchNo}
          columns={[
            { title: 'Medicine', dataIndex: 'medicine' },
            { title: 'Batch', dataIndex: 'batchNo' },
            { title: 'Qty', dataIndex: 'quantity' },
            { title: 'Unit', dataIndex: 'unitPrice' },
            { title: 'Disc', render: (_, r:SaleItem) => r.discountType==='none' ? '-' : `${r.discountType==='percent'?r.discountValue+'%':r.discountValue}` },
            { title: 'Line', dataIndex: 'lineTotal' },
          ]}
        />
        <Divider style={{ margin:'8px 0' }}/>
        <div className="totals">
          <div><span>Subtotal</span><span>{sale.subtotal.toFixed(2)}</span></div>
          <div><span>Discount</span><span>{sale.totalDiscount.toFixed(2)}</span></div>
          <div style={{ fontWeight:600 }}><span>Total</span><span>{sale.total.toFixed(2)}</span></div>
        </div>
        <div style={{ marginTop:8 }}>Payment: {sale.paymentMethod}</div>
        <div style={{ marginTop:8, fontSize:12, textAlign:'center' }}>Thank you for your purchase!</div>
      </div>
      <Divider />
      <Button type="primary" onClick={print} style={{ marginRight:8 }}>Print</Button>
      {onClose && <Button onClick={onClose}>Close</Button>}
    </div>
  );
};

export default ReceiptPreview;
