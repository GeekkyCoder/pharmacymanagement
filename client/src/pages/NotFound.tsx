import React from 'react';
import { Result, Button } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';

const NotFound: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <Result
      status="404"
      title="404"
      subTitle={`Sorry, the page '${location.pathname}' you visited does not exist.`}
      extra={
        <>
          <Button type="primary" onClick={() => navigate('/dashboard')}>Dashboard</Button>
          <Button style={{ marginLeft: 8 }} onClick={() => navigate(-1)}>Go Back</Button>
        </>
      }
    />
  );
};

export default NotFound;