// 验证工具
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password: string): boolean => {
  return password.length >= 8;
};

export interface PasswordStrengthResult {
  isValid: boolean;
  score: number;
  label: string;
  requirements: {
    met: boolean;
    text: string;
  }[];
}

export const getPasswordStrength = (password: string): PasswordStrengthResult => {
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

  if (metCount >= 5) {
    score = 100;
    label = "非常强";
  } else if (metCount >= 4) {
    score = 80;
    label = "强";
  } else if (metCount >= 3) {
    score = 60;
    label = "中等";
  } else if (metCount >= 2) {
    score = 40;
    label = "弱";
  } else {
    score = 20;
    label = "非常弱";
  }

  const unmetRequirements = requirements.filter(r => !r.met);
  const isValid = metCount >= 3;

  return { 
    isValid, 
    score, 
    label, 
    requirements 
  };
};

export const validatePasswordStrength = (password: string): { isValid: boolean; message: string } => {
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

export const validateUsername = (username: string): boolean => {
  return username.length >= 3 && username.length <= 20;
};

export const validateURL = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};
