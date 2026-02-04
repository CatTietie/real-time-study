import { Model } from "sequelize";
export declare class SensitiveWord extends Model {
    id: number;
    word: string;
    category?: string;
    createdAt: Date;
}
export default SensitiveWord;
//# sourceMappingURL=sensitive-word.model.d.ts.map