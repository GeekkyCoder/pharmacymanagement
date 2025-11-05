import React from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from '../../api/axios';
import { Row, Col, Card, Statistic, List, Tag, Skeleton } from 'antd';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend } from 'recharts';
import dayjs from 'dayjs';

interface DailyRevenue { day: string; revenue: number; count: number; }
interface TopSelling { medicineId: string; name: string; quantity: number; }
interface LowStockPreview { id: string; name: string; quantity: number; threshold: number; }
interface DashboardStats {
  dailyRevenue: DailyRevenue[];
  topSelling: TopSelling[];
  today: { revenue: number; subtotal: number; discount: number; salesCount: number; avgDiscountPercent: number; };
  inventory: { medicineCount: number; totalStockUnits: number; inventoryValue: number; lowStockCount: number; lowStockPreview: LowStockPreview[] };
}

const COLORS = ['#1677ff', '#52c41a', '#faad14', '#eb2f96', '#722ed1'];

const AdminOverview: React.FC = () => {
  const { data, isLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboardStats'],
    queryFn: async () => (await axios.get('/api/reports/dashboard')).data as DashboardStats,
    refetchInterval: 60_000 // refresh every minute
  });

  if (isLoading) return <Skeleton active paragraph={{ rows: 8 }} />;
  if (!data) return <div>No data</div>;

  const { dailyRevenue, topSelling, today, inventory } = data;
  // Cumulative line series
  let cumulative = 0;
  const cumulativeSeries = dailyRevenue.map((d: DailyRevenue) => { cumulative += d.revenue; return { day: d.day.slice(5), cumulative }; });

  return (
    <div style={{ paddingBottom: 32 }}>
      <Row gutter={[16,16]}>
        <Col xs={12} md={6}>
          <Card size="small"><Statistic title="Today's Revenue" value={today.revenue} precision={2} prefix="Rs" /></Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small"><Statistic title="Sales Today" value={today.salesCount} /></Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small"><Statistic title="Discount Given" value={today.discount} precision={2} prefix="Rs" /></Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small"><Statistic title="Avg Discount %" value={today.avgDiscountPercent} precision={2} suffix="%" /></Card>
        </Col>
      </Row>

      <Row gutter={[16,16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={14}>
          <Card title="Daily Revenue (14 days)">
            <div style={{ width: '100%', height: 280 }}>
              <ResponsiveContainer>
                <BarChart data={dailyRevenue}>
                  <XAxis dataKey="day" tickFormatter={(d: string)=> d.slice(5)} />
                  <YAxis />
                  <Tooltip formatter={(v: number)=> `Rs ${v}`} />
                  <Bar dataKey="revenue" fill="#1677ff" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card title="Cumulative Revenue">
            <div style={{ width: '100%', height: 280 }}>
              <ResponsiveContainer>
                <LineChart data={cumulativeSeries}>
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip formatter={(v: number)=> `Rs ${v}`} />
                  <Line type="monotone" dataKey="cumulative" stroke="#52c41a" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16,16]} style={{ marginTop: 16 }}>
        <Col xs={24} md={12}>
          <Card title="Top Selling (7 days)">
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie dataKey="quantity" data={topSelling} outerRadius={110} label={(e: TopSelling)=> e.name}>
                    {topSelling.map((_: TopSelling, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Legend />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="Low Stock Preview">
            <List
              dataSource={inventory.lowStockPreview}
              renderItem={(item: LowStockPreview) => (
                <List.Item>
                  <div style={{ display:'flex', justifyContent:'space-between', width:'100%' }}>
                    <span>{item.name}</span>
                    <span>
                      <Tag color="red">{item.quantity}</Tag>
                      <Tag color="volcano">Threshold {item.threshold}</Tag>
                    </span>
                  </div>
                </List.Item>
              )}
            />
            {inventory.lowStockCount === 0 && <div style={{ color:'#52c41a' }}>All stock above thresholds ✓</div>}
          </Card>
        </Col>
      </Row>

      <Row gutter={[16,16]} style={{ marginTop: 16 }}>
        <Col xs={24} md={8}>
          <Card size="small"><Statistic title="Medicines" value={inventory.medicineCount} /></Card>
        </Col>
        <Col xs={24} md={8}>
          <Card size="small"><Statistic title="Total Stock Units" value={inventory.totalStockUnits} /></Card>
        </Col>
        <Col xs={24} md={8}>
          <Card size="small"><Statistic title="Inventory Value (Potential)" value={inventory.inventoryValue} precision={2} prefix="Rs" /></Card>
        </Col>
      </Row>
      <div style={{ marginTop: 24, fontSize:12, color:'#888' }}>Updated {dayjs().format('HH:mm:ss')} • Refreshes every minute</div>
    </div>
  );
};

export default AdminOverview;
