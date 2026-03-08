export type Gender = 'M' | 'F' | 'Other';

export interface FamilyMember {
    id: string; // 唯一識別碼
    name: string;
    gender: Gender;
    birthYear: number;
    deathYear?: number; // 忌日 (選填)
    parentId1?: string; // 父親或母親 ID (直系長輩)
    parentId2?: string; // 尚未支援非親生父母等多個複雜關係，但保留欄位。實務上樹狀結構一端只連向血親。
    spouseId?: string; // 配偶 ID
    photoUrl?: string; // 照片 URL
    notes?: string; // 備註
}

export interface UIConfig {
    showBirthYear: boolean;
    nodeWritingMode: 'vertical-rl' | 'horizontal-tb';
    yearSpacing: number;
    generationSpacingNormal: number;
    polarGenerationRadii: number[];
    fontSize: number;
}

export interface FamilyState {
    uiConfig: UIConfig;
    updateUIConfig: (config: Partial<UIConfig>) => void;
    members: Record<string, FamilyMember>;
    addMember: (member: FamilyMember) => void;
    updateMember: (id: string, member: Partial<FamilyMember>) => void;
    deleteMember: (id: string) => void;
    importData: (members: Record<string, FamilyMember>) => void;
}
