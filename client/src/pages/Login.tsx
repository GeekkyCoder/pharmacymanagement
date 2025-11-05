import React, { useState } from 'react';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { Button, Card, Input, Typography, Tabs, message } from 'antd';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import axios from '../api/axios';

const loginSchema = Yup.object({
  email: Yup.string().email('Invalid email').required('Required'),
  password: Yup.string().min(4, 'Min 4 characters').required('Required')
});

const registerSchema = Yup.object({
  name: Yup.string().min(2, 'Min 2 characters').required('Required'),
  email: Yup.string().email('Invalid email').required('Required'),
  password: Yup.string().min(6, 'Min 6 characters').required('Required'),
  confirmPassword: Yup.string().oneOf([Yup.ref('password')], 'Passwords must match').required('Required')
});

const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [activeKey, setActiveKey] = useState('login');

  return (
    <div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'100vh', background:'#f5f7fa'}}>
      <Card style={{ width: 400 }} bodyStyle={{ paddingTop: 8 }}>
        <Typography.Title level={3} style={{ textAlign:'center', marginBottom: 8 }}>Pharmacy Portal</Typography.Title>
        <Tabs activeKey={activeKey} onChange={setActiveKey} items={[
          { key:'login', label:'Login', children: (
            <Formik initialValues={{ email: '', password: '' }} validationSchema={loginSchema} onSubmit={async (values, { setSubmitting }) => {
              try {
                await login(values.email, values.password);
                navigate('/dashboard');
              } catch (e:any) {
                // message handled globally by axios
              } finally { setSubmitting(false); }
            }}>
              {({ errors, touched, isSubmitting, handleChange }) => (
                <Form>
                  <div style={{ marginBottom: 12 }}>
                    <Input name="email" placeholder="Email" onChange={handleChange} />
                    {touched.email && errors.email && <div style={{color:'red'}}>{errors.email}</div>}
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <Input.Password name="password" placeholder="Password" onChange={handleChange} />
                    {touched.password && errors.password && <div style={{color:'red'}}>{errors.password}</div>}
                  </div>
                  <Button type="primary" htmlType="submit" block loading={isSubmitting}>Login</Button>
                </Form>
              )}
            </Formik>
          )},
          { key:'register', label:'Register Admin', children: (
            <Formik initialValues={{ name:'', email:'', password:'', confirmPassword:'' }} validationSchema={registerSchema} onSubmit={async (values, { setSubmitting }) => {
              try {
                const res = await axios.post('/api/auth/register-admin', { name: values.name, email: values.email, password: values.password });
                localStorage.setItem('token', res.data.token);
                localStorage.setItem('user', JSON.stringify(res.data.user));
                message.success('Admin registered');
                navigate('/dashboard');
              } catch (e:any) {
                // global error already shown
              } finally { setSubmitting(false); }
            }}>
              {({ errors, touched, isSubmitting, handleChange }) => (
                <Form>
                  <div style={{ marginBottom: 12 }}>
                    <Input name="name" placeholder="Full Name" onChange={handleChange} />
                    {touched.name && errors.name && <div style={{color:'red'}}>{errors.name}</div>}
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <Input name="email" placeholder="Email" onChange={handleChange} />
                    {touched.email && errors.email && <div style={{color:'red'}}>{errors.email}</div>}
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <Input.Password name="password" placeholder="Password" onChange={handleChange} />
                    {touched.password && errors.password && <div style={{color:'red'}}>{errors.password}</div>}
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <Input.Password name="confirmPassword" placeholder="Confirm Password" onChange={handleChange} />
                    {touched.confirmPassword && errors.confirmPassword && <div style={{color:'red'}}>{errors.confirmPassword}</div>}
                  </div>
                  <Button type="primary" htmlType="submit" block loading={isSubmitting}>Register & Login</Button>
                </Form>
              )}
            </Formik>
          )}
        ]} />
      </Card>
    </div>
  );
};

export default Login;
