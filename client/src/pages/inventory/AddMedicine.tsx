import React from 'react';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { Input, Button, DatePicker, Card, Row, Col, Switch, Typography, Divider, Tooltip } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import axios from '../../api/axios';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';

// Validation schema for new medicine structure with initial batch
const schema = Yup.object({
  type: Yup.string().trim().min(2,'Type too short').max(60,'Type too long').required('Type required'),
  group: Yup.string().trim().min(2,'Group too short').max(120,'Group too long').required('Group required'),
  brand: Yup.string().trim().min(1,'Brand required').max(120,'Brand too long').required('Brand required'),
  productName: Yup.string().trim().min(2,'Product name too short').max(160,'Product name too long').required('Product name required'),
  printName: Yup.string().trim().min(2,'Print name too short').max(160,'Print name too long').optional(),
  purchasePrice: Yup.number().typeError('Must be number').moreThan(0,'> 0').required('Purchase price required'),
  salePrice: Yup.number().typeError('Must be number').moreThan(0,'> 0').required('Sale price required').test('margin','Sale >= Purchase',function(value){
    const { purchasePrice } = this.parent; return purchasePrice ? value >= purchasePrice : true;
  }),
  purchaseDate: Yup.date().typeError('Purchase date required').max(dayjs().endOf('day').toDate(),'Purchase cannot be future').required('Purchase date required'),
  expiryDate: Yup.date().typeError('Expiry date required').min(dayjs().add(1,'day').startOf('day').toDate(),'Expiry must be future').required('Expiry date required').test('afterPurchase','Expiry must be after purchase', function(value){
    const { purchaseDate } = this.parent; return purchaseDate && value ? value > purchaseDate : true;
  }),
  batchNo: Yup.string().trim().min(2,'Batch too short').max(50,'Batch too long').required('Batch number required'),
  quantity: Yup.number().typeError('Quantity must be number').integer('Whole number').min(1,'At least 1').max(100000,'Too large').required('Quantity required'),
  controlled: Yup.boolean().optional(),
  lockStockThreshold: Yup.number().integer().min(0,'>=0').max(100000,'Too large').default(10)
});

const { Title, Text } = Typography;

const AddMedicine: React.FC = () => {
  const navigate = useNavigate();
  return (
    <Card style={{ maxWidth: 1100, margin: '0 auto', borderRadius: 12 }}>
      <Title level={3} style={{ marginBottom: 4 }}>Create Medicine</Title>
      <Text type="secondary">Add a new product with pricing, lifecycle dates and an initial stock batch.</Text>
      <Divider />
      <Formik
        initialValues={{
          type:'', group:'', brand:'', productName:'', printName:'', purchasePrice:0, salePrice:0,
          purchaseDate: dayjs().startOf('day').toDate(), expiryDate:'', batchNo:'', quantity:1,
          controlled:false, lockStockThreshold:10
        }}
        validationSchema={schema}
        onSubmit={async (values,{ setSubmitting }) => {
          try {
            await axios.post('/api/inventory/medicines', {
              type: values.type,
              group: values.group,
              brand: values.brand,
              productName: values.productName,
              printName: values.printName || values.productName,
              purchasePrice: values.purchasePrice,
              salePrice: values.salePrice,
              purchaseDate: values.purchaseDate,
              expiryDate: values.expiryDate,
              batchNo: values.batchNo,
              quantity: values.quantity,
              controlled: values.controlled,
              lockStockThreshold: values.lockStockThreshold
            });
            navigate('/dashboard/inventory');
          } finally { setSubmitting(false); }
        }}
      >
        {({ values, errors, touched, handleChange, setFieldValue, isSubmitting }) => (
          <Form>
            <Row gutter={16}>
              <Col span={6}>
                <label className="fld">Type *</label>
                <Input name="type" value={values.type} placeholder="Tablet" onChange={handleChange} />
                {touched.type && errors.type && <div className="error-text">{errors.type}</div>}
              </Col>
              <Col span={6}>
                <label className="fld">Group *</label>
                <Input name="group" value={values.group} placeholder="Paracetamol" onChange={handleChange} />
                {touched.group && errors.group && <div className="error-text">{errors.group}</div>}
              </Col>
              <Col span={6}>
                <label className="fld">Brand *</label>
                <Input name="brand" value={values.brand} placeholder="GSK" onChange={handleChange} />
                {touched.brand && errors.brand && <div className="error-text">{errors.brand}</div>}
              </Col>
              <Col span={6}>
                <label className="fld">Product Name *</label>
                <Input name="productName" value={values.productName} placeholder="Panadol 500mg" onChange={(e)=>{
                  handleChange(e);
                  if(!touched.printName && !values.printName) setFieldValue('printName', e.target.value);
                }} />
                {touched.productName && errors.productName && <div className="error-text">{errors.productName}</div>}
              </Col>
            </Row>
            <Row gutter={16} style={{ marginTop:12 }}>
              <Col span={6}>
                <label className="fld">Print Name</label>
                <Input name="printName" value={values.printName} placeholder="Auto from product" onChange={handleChange} />
                {touched.printName && errors.printName && <div className="error-text">{errors.printName}</div>}
              </Col>
              <Col span={6}>
                <label className="fld">Purchase Price *</label>
                <Input name="purchasePrice" type="number" min={0.01} step={0.01} value={values.purchasePrice} onChange={handleChange} />
                {touched.purchasePrice && errors.purchasePrice && <div className="error-text">{errors.purchasePrice}</div>}
              </Col>
              <Col span={6}>
                <label className="fld">Sale Price *</label>
                <Input name="salePrice" type="number" min={0.01} step={0.01} value={values.salePrice} onChange={handleChange} />
                {touched.salePrice && errors.salePrice && <div className="error-text">{errors.salePrice}</div>}
              </Col>
              <Col span={6}>
                <label className="fld">Lock Stock Threshold</label>
                <Input name="lockStockThreshold" type="number" min={0} value={values.lockStockThreshold} onChange={handleChange} />
                {touched.lockStockThreshold && errors.lockStockThreshold && <div className="error-text">{errors.lockStockThreshold}</div>}
              </Col>
            </Row>
            <Card size="small" title={<><b>Lifecycle Dates</b> <Tooltip title="Purchase date is when stock entered; expiry must be in the future."><InfoCircleOutlined /></Tooltip></>} style={{ marginTop:16 }}>
              <Row gutter={16}>
                <Col span={12}>
                  <label className="fld">Purchase Date *</label>
                  <DatePicker style={{ width:'100%' }} value={values.purchaseDate ? dayjs(values.purchaseDate) : undefined} onChange={(d)=> setFieldValue('purchaseDate', d? d.toDate(): '')} />
                  {touched.purchaseDate && errors.purchaseDate && <div className="error-text">{String(errors.purchaseDate)}</div>}
                </Col>
                <Col span={12}>
                  <label className="fld">Expiry Date *</label>
                  <DatePicker style={{ width:'100%' }} value={values.expiryDate ? dayjs(values.expiryDate) : undefined} onChange={(d)=> setFieldValue('expiryDate', d? d.toDate(): '')} />
                  {touched.expiryDate && errors.expiryDate && <div className="error-text">{String(errors.expiryDate)}</div>}
                </Col>
              </Row>
            </Card>
            <Card size="small" title={<><b>Initial Batch</b> <Tooltip title="Creates first batch for this product."><InfoCircleOutlined /></Tooltip></>} style={{ marginTop:16 }}>
              <Row gutter={16}>
                <Col span={8}>
                  <label className="fld">Batch No *</label>
                  <Input name="batchNo" value={values.batchNo} placeholder="BATCH-001" onChange={handleChange} />
                  {touched.batchNo && errors.batchNo && <div className="error-text">{errors.batchNo}</div>}
                </Col>
                <Col span={8}>
                  <label className="fld">Quantity *</label>
                  <Input name="quantity" type="number" min={1} value={values.quantity} onChange={handleChange} />
                  {touched.quantity && errors.quantity && <div className="error-text">{errors.quantity}</div>}
                </Col>
                <Col span={8}>
                  <label className="fld">Controlled</label>
                  <div style={{ marginTop:6 }}>
                    <Switch checked={values.controlled} onChange={(v)=> setFieldValue('controlled', v)} />
                  </div>
                </Col>
              </Row>
              <div style={{ marginTop:8, fontSize:12, color:'#555' }}>Sale price must be &gt;= purchase price for margin protection.</div>
            </Card>
            <Button style={{ marginTop:24 }} type="primary" htmlType="submit" loading={isSubmitting}>Save Medicine</Button>
          </Form>
        )}
      </Formik>
      <style>{`
        .error-text { color:#d4380d; font-size:12px; margin-top:4px; }
        .fld { font-weight:600; }
      `}</style>
    </Card>
  );
};

export default AddMedicine;
