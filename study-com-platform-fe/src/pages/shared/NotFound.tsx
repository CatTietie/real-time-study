import { Result, Button } from "antd";
import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <Result
      status="404"
      title="404"
      subTitle="页面不存在"
      extra={
        <Button type="primary">
          <Link to="/admin/dashboard">返回首页</Link>
        </Button>
      }
    />
  );
}
