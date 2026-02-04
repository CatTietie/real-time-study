import { Button, Result } from "antd";
import { Link } from "react-router-dom";

export default function ComingSoon() {
  return (
    <Result
      status="info"
      title="学生端暂未开放"
      subTitle="你可以先体验管理端功能"
      extra={
        <Button type="primary">
          <Link to="/admin/login">返回登录</Link>
        </Button>
      }
    />
  );
}
