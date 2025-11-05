import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from '../../api/axios';
import { Table, Button, Space, Modal, Input, Form, message, Typography } from 'antd';
import { useAuth } from '../../hooks/useAuth';

interface Employee { _id: string; name: string; email: string; role: string; active: boolean }

const Employees: React.FC = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data, isLoading } = useQuery({ queryKey: ['employees'], queryFn: async () => (await axios.get('/api/auth/employees')).data as Employee[] });
  const [editing, setEditing] = useState<Employee | null>(null);
  const [passwordResetId, setPasswordResetId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createForm] = Form.useForm();
  const [resetForm] = Form.useForm();

  const updateMutation = useMutation({
    mutationFn: async (payload: { id: string; name: string; email: string }) => {
      await axios.patch(`/api/auth/employees/${payload.id}`, { name: payload.name, email: payload.email });
    },
    onSuccess: () => { message.success('Updated'); qc.invalidateQueries({ queryKey: ['employees'] }); setEditing(null); }
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async (id: string) => { await axios.patch(`/api/auth/employees/${id}/toggle-active`); },
    onSuccess: () => { message.success('Status toggled'); qc.invalidateQueries({ queryKey: ['employees'] }); }
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (payload: { id: string; password: string }) => { await axios.post(`/api/auth/employees/${payload.id}/reset-password`, { password: payload.password }); },
    onSuccess: () => { message.success('Password reset'); setPasswordResetId(null); }
  });

  const createEmployeeMutation = useMutation({
    mutationFn: async (payload: { name: string; email: string; password: string }) => {
      await axios.post('/api/auth/employees', payload);
    },
    onSuccess: () => { message.success('Employee created'); qc.invalidateQueries({ queryKey: ['employees'] }); setCreating(false); },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Create failed';
      message.error(msg);
    }
  });

  return (
    <div>
      <Space style={{ marginBottom: 12 }}>
        {user?.role === 'admin' && <Button type="primary" onClick={()=>setCreating(true)}>Add Employee</Button>}
        <Typography.Text type="secondary">Manage employees (edit, activate/deactivate, reset password)</Typography.Text>
      </Space>
      <Table loading={isLoading} dataSource={data||[]} rowKey="_id" columns={[
        { title: 'Name', dataIndex: 'name' },
        { title: 'Email', dataIndex: 'email' },
        { title: 'Active', dataIndex: 'active', render: (v:boolean) => v ? 'Yes' : 'No' },
        { title: 'Actions', render: (_:any, r:Employee) => <Space>
            <Button size="small" onClick={()=>setEditing(r)}>Edit</Button>
            <Button size="small" onClick={()=>toggleActiveMutation.mutate(r._id)}>{r.active? 'Deactivate':'Activate'}</Button>
            <Button size="small" onClick={()=>setPasswordResetId(r._id)}>Reset PW</Button>
          </Space> }
      ]} />

      <Modal open={creating} onCancel={()=>!createEmployeeMutation.isPending && setCreating(false)} footer={null} title="Add Employee" destroyOnClose>
        {creating && (
          <Form
            layout="vertical"
            onFinish={(vals)=>createEmployeeMutation.mutate({ name: vals.name.trim(), email: vals.email.trim().toLowerCase(), password: vals.password })}
            validateTrigger={['onBlur','onChange']}
            form={createForm}
          >
            <Form.Item label="Name" name="name" rules={[
              { required: true, message: 'Name required' },
              { min: 2, message: 'Min 2 characters' },
              { validator:(_,v)=> v && v.trim().length<2 ? Promise.reject('Too short') : Promise.resolve() }
            ]}>
              <Input placeholder="Employee Name" autoComplete="off" />
            </Form.Item>
            <Form.Item label="Email" name="email" rules={[
              { required: true, message: 'Email required' },
              { type: 'email', message: 'Invalid email format' }
            ]}>
              <Input placeholder="employee@example.com" autoComplete="off" />
            </Form.Item>
            <Form.Item label="Password" name="password" rules={[
              { required: true, message: 'Password required' },
              { min: 8, message: 'Min 8 characters' },
              { validator:(_,v)=> {
                  if(!v) return Promise.resolve();
                  const complexity = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
                  return complexity.test(v) ? Promise.resolve() : Promise.reject('Include upper, lower, number, special');
                }
              }
            ]}>
              <Input.Password placeholder="Strong Password" autoComplete="new-password" />
            </Form.Item>
            <Form.Item label="Confirm Password" name="confirm" dependencies={['password']} rules={[
              { required: true, message: 'Confirm password' },
              { validator:(_,v)=> {
                  if(!v) return Promise.resolve();
                  return v === createForm.getFieldValue('password') ? Promise.resolve() : Promise.reject('Passwords do not match');
                } }
            ]}>
              <Input.Password placeholder="Re-enter Password" autoComplete="new-password" />
            </Form.Item>
            <Space>
              <Button onClick={()=>!createEmployeeMutation.isPending && setCreating(false)} disabled={createEmployeeMutation.isPending}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={createEmployeeMutation.isPending}>Create</Button>
            </Space>
          </Form>
        )}
      </Modal>

      <Modal open={!!editing} onCancel={()=>setEditing(null)} footer={null} title="Edit Employee">
        {editing && (
          <Form layout="vertical" onFinish={(vals)=>updateMutation.mutate({ id: editing._id, name: vals.name, email: vals.email })} initialValues={{ name: editing.name, email: editing.email }}>
            <Form.Item label="Name" name="name" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item label="Email" name="email" rules={[{ required: true, type:'email' }]}>
              <Input />
            </Form.Item>
            <Space>
              <Button onClick={()=>setEditing(null)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={updateMutation.isPending}>Save</Button>
            </Space>
          </Form>
        )}
      </Modal>

      <Modal open={!!passwordResetId} onCancel={()=>!resetPasswordMutation.isPending && setPasswordResetId(null)} footer={null} title="Reset Password" destroyOnClose>
        {passwordResetId && (
          <Form
            layout="vertical"
            validateTrigger={['onBlur','onChange']}
            onFinish={(vals)=>resetPasswordMutation.mutate({ id: passwordResetId, password: vals.password })}
            form={resetForm}
          >
            <Form.Item label="New Password" name="password" rules={[
              { required: true, message:'Password required' },
              { min: 8, message:'Min 8 characters' },
              { validator:(_,v)=> {
                  if(!v) return Promise.resolve();
                  const complexity = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
                  return complexity.test(v) ? Promise.resolve() : Promise.reject('Weak password: need upper, lower, number, special');
                }
              }
            ]}>
              <Input.Password autoComplete="new-password" />
            </Form.Item>
            <Form.Item label="Confirm Password" name="confirm" dependencies={['password']} rules={[
              { required: true, message:'Confirm password' },
              { validator:(_,v)=> v === resetForm.getFieldValue('password') ? Promise.resolve() : Promise.reject('Mismatch') }
            ]}>
              <Input.Password autoComplete="new-password" />
            </Form.Item>
            <Space>
              <Button onClick={()=>!resetPasswordMutation.isPending && setPasswordResetId(null)} disabled={resetPasswordMutation.isPending}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={resetPasswordMutation.isPending}>Reset</Button>
            </Space>
          </Form>
        )}
      </Modal>
    </div>
  );
};

export default Employees;
