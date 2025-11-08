import { Layout } from 'antd';
import { GithubOutlined, LinkedinOutlined } from '@ant-design/icons';

const { Footer } = Layout;

export default function AppFooter() {
  return (
    <Footer style={{ textAlign: 'center', background: '#fff', padding: '16px 0' }}>
      Developed by
      <a href={`https://github.com/GeekkyCoder`} target="_blank" rel="noopener noreferrer" style={{ margin: '0 8px' }}>
        <GithubOutlined style={{ fontSize: '18px' }} /> GeekkyCoder
      </a>
      |
      <a href={`https://www.linkedin.com/in/farazlin/`} target="_blank" rel="noopener noreferrer" style={{ margin: '0 8px' }}>
        <LinkedinOutlined style={{ fontSize: '18px' }} /> LinkedIn
      </a>
    </Footer>
  );
}
