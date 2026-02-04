import { Result, Spin } from "antd";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useAppSelector } from "../../app/hooks";
import { fetchMyPermissions } from "../../services/communityPublic";

const DEFAULT_MESSAGE = "你没有访问该页面的权限";

type PermissionGuardProps = {
  required?: string | string[];
  children: ReactNode;
};

export default function PermissionGuard({
  required,
  children,
}: PermissionGuardProps) {
  const { role } = useAppSelector((state) => state.auth);
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState<string[]>([]);

  const requiredList = useMemo(() => {
    if (!required) return [];
    return Array.isArray(required) ? required : [required];
  }, [required]);

  useEffect(() => {
    let mounted = true;
    if (role === "super_admin") {
      setLoading(false);
      return () => {
        mounted = false;
      };
    }

    const load = async () => {
      try {
        const res = await fetchMyPermissions();
        if (mounted) {
          setPermissions((res?.data as string[]) || []);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      mounted = false;
    };
  }, [role]);

  if (loading) {
    return (
      <div style={{ padding: 48, textAlign: "center" }}>
        <Spin />
      </div>
    );
  }

  if (role === "super_admin") {
    return <>{children}</>;
  }

  const allowed =
    requiredList.length === 0 ||
    requiredList.every((code) => permissions.includes(code));

  if (!allowed) {
    return <Result status="403" title="无权限" subTitle={DEFAULT_MESSAGE} />;
  }

  return <>{children}</>;
}
