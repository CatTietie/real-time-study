export interface PasswordStrength {
  score: number;
  label: string;
  color: string;
  isValid: boolean;
  requirements: {
    met: boolean;
    text: string;
  }[];
}

export const getPasswordStrength = (password: string): PasswordStrength => {
  const requirements = [
    { met: password.length >= 8, text: "至少8个字符" },
    { met: /[A-Z]/.test(password), text: "包含大写字母" },
    { met: /[a-z]/.test(password), text: "包含小写字母" },
    { met: /[0-9]/.test(password), text: "包含数字" },
    { met: /[!@#$%^&*(),.?":{}|<>]/.test(password), text: "包含特殊字符" },
  ];

  const metCount = requirements.filter(r => r.met).length;
  
  let score = 0;
  let label = "弱";
  let color = "#ff4d4f";

  if (metCount >= 5) {
    score = 100;
    label = "非常强";
    color = "#52c41a";
  } else if (metCount >= 4) {
    score = 80;
    label = "强";
    color = "#73d13d";
  } else if (metCount >= 3) {
    score = 60;
    label = "中等";
    color = "#faad14";
  } else if (metCount >= 2) {
    score = 40;
    label = "弱";
    color = "#fa8c16";
  } else {
    score = 20;
    label = "非常弱";
    color = "#ff4d4f";
  }

  const isValid = metCount >= 3;

  return { score, label, color, isValid, requirements };
};

export const validatePasswordStrength = (password: string): { isValid: boolean; message: string } => {
  if (!password) {
    return { isValid: true, message: "密码为空，不进行修改" };
  }

  const result = getPasswordStrength(password);
  
  if (!result.isValid) {
    const unmetRequirements = result.requirements.filter(r => !r.met);
    const unmetTexts = unmetRequirements.map(r => r.text).join("、");
    return {
      isValid: false,
      message: `密码强度不足，请满足以下要求：${unmetTexts}`
    };
  }
  
  return { isValid: true, message: "密码强度符合要求" };
};
