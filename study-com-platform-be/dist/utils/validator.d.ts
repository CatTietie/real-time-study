export declare const validateEmail: (email: string) => boolean;
export declare const validatePassword: (password: string) => boolean;
export interface PasswordStrengthResult {
    isValid: boolean;
    score: number;
    label: string;
    requirements: {
        met: boolean;
        text: string;
    }[];
}
export declare const getPasswordStrength: (password: string) => PasswordStrengthResult;
export declare const validatePasswordStrength: (password: string) => {
    isValid: boolean;
    message: string;
};
export declare const validateUsername: (username: string) => boolean;
export declare const validateURL: (url: string) => boolean;
//# sourceMappingURL=validator.d.ts.map