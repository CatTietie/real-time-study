export declare const checkSensitiveWords: (text: string) => Promise<{
    hit: boolean;
    matches: string[];
}>;
export declare const filterSensitiveWords: (text: string) => Promise<string>;
export declare const clearSensitiveWordCache: () => void;
//# sourceMappingURL=sensitive-word.service.d.ts.map