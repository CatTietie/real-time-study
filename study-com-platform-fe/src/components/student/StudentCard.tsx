import { Card } from "antd";
import type { CardProps } from "antd";

interface StudentCardProps extends CardProps {
  hoverable?: boolean;
  variant?: "default" | "filled" | "outlined";
}

export default function StudentCard({ 
  hoverable = true, 
  variant = "default",
  ...props 
}: StudentCardProps) {
  const baseClassName = "student-card";
  
  const variantClasses = {
    default: "",
    filled: "student-card-filled",
    outlined: "student-card-outlined"
  };
  
  const classNames = [
    baseClassName,
    variantClasses[variant],
    props.className
  ].filter(Boolean).join(" ");

  return (
    <Card
      hoverable={hoverable}
      {...props}
      className={classNames}
    />
  );
}