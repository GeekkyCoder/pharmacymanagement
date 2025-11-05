import React from 'react';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { Input, Button, DatePicker, Card, Row, Col, Switch } from 'antd';
import axios from '../../api/axios';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';

// Enhanced validation schema for medicine + initial batch
const schema = Yup.object({
  name: Yup.string().trim().min(2, 'Name too short').max(120, 'Name too long').required('Name is required'),
  genericName: Yup.string().trim().min(2, 'Generic too short').max(120, 'Generic too long').optional(),
  form: Yup.string().trim().min(2, 'Form too short').max(50, 'Form too long').optional(),
  strength: Yup.string().trim().min(1, 'Strength required').max(50, 'Strength too long').optional(),
  category: Yup.string().trim().max(60, 'Category too long').optional(),
  controlled: Yup.boolean().optional(),
  lowStockThreshold: Yup.number().integer().min(1, 'Must be at least 1').max(10000, 'Too large').default(10),
  batchNo: Yup.string().trim().min(2, 'Batch too short').max(50, 'Batch too long').required('Batch number required'),
  expiryDate: Yup.date()
    .typeError('Expiry date required')
    .min(dayjs().add(1, 'day').startOf('day').toDate(), 'Expiry must be in the future')
    .required('Expiry date required'),
  quantity: Yup.number().typeError('Quantity must be a number').integer('Quantity must be whole')
    .min(1, 'Quantity must be at least 1').max(100000, 'Quantity too large').required('Quantity required'),
  purchasePrice: Yup.number().typeError('Purchase price must be a number').moreThan(0, 'Must be > 0').max(1000000, 'Too large').required('Purchase price required'),
  salePrice: Yup.number().typeError('Sale price must be a number').moreThan(0, 'Must be > 0')
    .max(1000000, 'Too large')
    .required('Sale price required')
    .test('margin', 'Sale price must be >= purchase price', function(value){
      const { purchasePrice } = this.parent;
      if (purchasePrice && value !== undefined) return value >= purchasePrice;
      return true;
    }),
});

const AddMedicine: React.FC = () => {
  const navigate = useNavigate();
  return (
    <Card title="Add Medicine" style={{ maxWidth: 1000, margin: '0 auto' }}>
      <Formik
        initialValues={{
          name:'', genericName:'', form:'', strength:'', category:'', controlled:false, lowStockThreshold:10,
          batchNo:'', expiryDate:'', quantity:1, purchasePrice:0, salePrice:0
        }}
        validationSchema={schema}
        onSubmit={async (values, { setSubmitting }) => {
          try {
            await axios.post('/api/inventory/medicines', {
              name: values.name,
              genericName: values.genericName || undefined,
              form: values.form || undefined,
              strength: values.strength || undefined,
              category: values.category || undefined,
              controlled: values.controlled,
              lowStockThreshold: values.lowStockThreshold,
              batch: {
                batchNo: values.batchNo,
                expiryDate: values.expiryDate,
                quantity: values.quantity,
                purchasePrice: values.purchasePrice,
                salePrice: values.salePrice
              }
            });
            navigate('/dashboard/inventory');
          } finally { setSubmitting(false); }
        }}
      >
        {({ handleChange, setFieldValue, values, errors, touched, isSubmitting }) => (
          <Form>
            <Row gutter={16}>
              <Col span={12}>
                <label htmlFor="name" style={{ fontWeight: 600 }}>Medicine Name *</label>
                <Input id="name" name="name" placeholder="e.g. Panadol" value={values.name} onChange={handleChange} />
                {touched.name && errors.name && <div className="error-text">{errors.name}</div>}
              </Col>
              <Col span={12}>
                <label htmlFor="genericName" style={{ fontWeight: 600 }}>Generic Name</label>
                <Input id="genericName" name="genericName" placeholder="e.g. Paracetamol" value={values.genericName} onChange={handleChange} />
                {touched.genericName && errors.genericName && <div className="error-text">{errors.genericName}</div>}
              </Col>
            </Row>
            <Row gutter={16} style={{ marginTop: 12 }}>
              <Col span={8}>
                <label htmlFor="form" style={{ fontWeight: 600 }}>Dosage Form</label>
                <Input id="form" name="form" placeholder="e.g. Tablet" value={values.form} onChange={handleChange} />
                {touched.form && errors.form && <div className="error-text">{errors.form}</div>}
              </Col>
              <Col span={8}>
                <label htmlFor="strength" style={{ fontWeight: 600 }}>Strength</label>
                <Input id="strength" name="strength" placeholder="e.g. 500mg" value={values.strength} onChange={handleChange} />
                {touched.strength && errors.strength && <div className="error-text">{errors.strength}</div>}
              </Col>
              <Col span={8}>
                <label htmlFor="category" style={{ fontWeight: 600 }}>Category</label>
                <Input id="category" name="category" placeholder="e.g. Analgesic" value={values.category} onChange={handleChange} />
                {touched.category && errors.category && <div className="error-text">{errors.category}</div>}
              </Col>
            </Row>
            <Row gutter={16} style={{ marginTop: 12 }}>
              <Col span={8}>
                <label htmlFor="lowStockThreshold" style={{ fontWeight: 600 }}>Low Stock Threshold</label>
                <Input id="lowStockThreshold" name="lowStockThreshold" type="number" min={1} value={values.lowStockThreshold} onChange={handleChange} />
                {touched.lowStockThreshold && errors.lowStockThreshold && <div className="error-text">{errors.lowStockThreshold}</div>}
              </Col>
              <Col span={8}>
                <label htmlFor="controlled" style={{ fontWeight: 600 }}>Controlled Substance</label>
                <div style={{ marginTop: 4 }}>
                  <Switch checked={values.controlled} onChange={(checked)=> setFieldValue('controlled', checked)} />
                </div>
              </Col>
            </Row>
            <Card title="Initial Batch" size="small" style={{ marginTop: 20 }}>
              <Row gutter={16}>
                <Col span={8}>
                  <label htmlFor="batchNo" style={{ fontWeight: 600 }}>Batch Number *</label>
                  <Input id="batchNo" name="batchNo" placeholder="Batch Number" value={values.batchNo} onChange={handleChange} />
                  {touched.batchNo && errors.batchNo && <div className="error-text">{errors.batchNo}</div>}
                </Col>
                <Col span={8}>
                  <label htmlFor="expiryDate" style={{ fontWeight: 600 }}>Expiry Date *</label>
                  <DatePicker id="expiryDate" style={{ width:'100%' }}
                    value={values.expiryDate ? dayjs(values.expiryDate) : undefined}
                    onChange={(date) => setFieldValue('expiryDate', date ? date.toDate() : '')} />
                  {touched.expiryDate && errors.expiryDate && <div className="error-text">{errors.expiryDate}</div>}
                </Col>
                <Col span={8}>
                  <label htmlFor="quantity" style={{ fontWeight: 600 }}>Quantity *</label>
                  <Input id="quantity" name="quantity" type="number" min={1} value={values.quantity} onChange={handleChange} />
                  {touched.quantity && errors.quantity && <div className="error-text">{errors.quantity}</div>}
                </Col>
              </Row>
              <Row gutter={16} style={{ marginTop: 12 }}>
                <Col span={8}>
                  <label htmlFor="purchasePrice" style={{ fontWeight: 600 }}>Purchase Price *</label>
                  <Input id="purchasePrice" name="purchasePrice" type="number" min={0.01} step={0.01} value={values.purchasePrice} onChange={handleChange} />
                  {touched.purchasePrice && errors.purchasePrice && <div className="error-text">{errors.purchasePrice}</div>}
                </Col>
                <Col span={8}>
                  <label htmlFor="salePrice" style={{ fontWeight: 600 }}>Sale Price *</label>
                  <Input id="salePrice" name="salePrice" type="number" min={0.01} step={0.01} value={values.salePrice} onChange={handleChange} />
                  {touched.salePrice && errors.salePrice && <div className="error-text">{errors.salePrice}</div>}
                </Col>
              </Row>
              <div style={{ marginTop: 8, fontSize: 12, color: '#555' }}>
                Sale price must be greater than or equal to purchase price.
              </div>
            </Card>
            <Button style={{ marginTop: 24 }} type="primary" htmlType="submit" loading={isSubmitting}>Save Medicine</Button>
          </Form>
        )}
      </Formik>
      <style>{`
        .error-text { color: #d4380d; font-size: 12px; margin-top: 4px; }
      `}</style>
    </Card>
  );
};

export default AddMedicine;
