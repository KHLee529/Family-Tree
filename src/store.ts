import { create } from 'zustand';
import { FamilyState, FamilyMember } from './types';

const mockData: Record<string, FamilyMember> = {
    "1": { id: "1", name: "一一一", gender: "M", birthYear: 1935, spouseId: "2", parentId1: "" },
    "2": { id: "2", name: "二二二", gender: "F", birthYear: 1938, spouseId: "1", parentId1: "" },
    "5": { id: "5", name: "三三三", gender: "F", birthYear: 1957, spouseId: "6", parentId1: "1" },
    "6": { id: "6", name: "四四四", gender: "M", birthYear: 1954, spouseId: "5", parentId1: "" },
    "17": { id: "17", name: "五五五", gender: "M", birthYear: 1963, spouseId: "18", parentId1: "1" },
    "18": { id: "18", name: "六六六", gender: "F", birthYear: 1963, spouseId: "17", parentId1: "" },
    "19": { id: "19", name: "七七七", gender: "M", birthYear: 1966, spouseId: "20", parentId1: "1" },
    "20": { id: "20", name: "八八八", gender: "F", birthYear: 1967, spouseId: "17", parentId1: "" },
    "21": { id: "21", name: "九九九", gender: "M", birthYear: 1969, spouseId: "22", parentId1: "1" },
    "22": { id: "22", name: "十十十", gender: "F", birthYear: 1971, spouseId: "21", parentId1: "" },
    "23": { id: "23", name: "高高高", gender: "F", birthYear: 1973, spouseId: "", parentId1: "1" },
    "28": { id: "28", name: "通通通", gender: "M", birthYear: 1972, spouseId: "58", parentId1: "5" },
    "29": { id: "29", name: "益益益", gender: "F", birthYear: 1974, spouseId: "59", parentId1: "5" },
    "30": { id: "30", name: "以以以", gender: "F", birthYear: 1976, spouseId: "60", parentId1: "5" },
    "31": { id: "31", name: "後後後", gender: "F", birthYear: 1977, spouseId: "61", parentId1: "5" },
    "32": { id: "32", name: "備備備", gender: "M", birthYear: 1980, spouseId: "62", parentId1: "5" },
    "48": { id: "48", name: "對對對", gender: "F", birthYear: 1987, spouseId: "73", parentId1: "17" },
    "49": { id: "49", name: "的的的", gender: "F", birthYear: 1989, spouseId: "", parentId1: "17" },
    "50": { id: "50", name: "機機機", gender: "F", birthYear: 1991, spouseId: "", parentId1: "17" },
    "51": { id: "51", name: "時時時", gender: "M", birthYear: 1996, spouseId: "", parentId1: "17" },
    "52": { id: "52", name: "整整整", gender: "F", birthYear: 1993, spouseId: "74", parentId1: "19" },
    "53": { id: "53", name: "有有有", gender: "M", birthYear: 2000, spouseId: "", parentId1: "19" },
    "54": { id: "54", name: "要要要", gender: "M", birthYear: 1998, spouseId: "", parentId1: "21" },
    "55": { id: "55", name: "南南南", gender: "F", birthYear: 2001, spouseId: "", parentId1: "21" },
    "58": { id: "58", name: "滿滿滿", gender: "F", birthYear: 1975, spouseId: "28", parentId1: "" },
    "59": { id: "59", name: "遇遇遇", gender: "M", birthYear: 1974, spouseId: "29", parentId1: "" },
    "60": { id: "60", name: "里里里", gender: "M", birthYear: 1975, spouseId: "30", parentId1: "" },
    "61": { id: "61", name: "界界界", gender: "M", birthYear: 1978, spouseId: "31", parentId1: "" },
    "62": { id: "62", name: "貴貴貴", gender: "F", birthYear: 1978, spouseId: "32", parentId1: "" },
    "71": { id: "71", name: "愚愚愚", gender: "M", birthYear: 1991, spouseId: "41", parentId1: "" },
    "72": { id: "72", name: "甫甫甫", gender: "F", birthYear: 1987, spouseId: "47", parentId1: "" },
    "73": { id: "73", name: "辛辛辛", gender: "M", birthYear: 1990, spouseId: "48", parentId1: "" },
    "74": { id: "74", name: "中中中", gender: "M", birthYear: 1993, spouseId: "52", parentId1: "" },
    "77": { id: "77", name: "商商商", gender: "F", birthYear: 1997, spouseId: "", parentId1: "28" },
    "78": { id: "78", name: "第第第", gender: "F", birthYear: 1998, spouseId: "", parentId1: "28" },
    "79": { id: "79", name: "釀釀釀", gender: "M", birthYear: 2002, spouseId: "", parentId1: "28" },
    "80": { id: "80", name: "護護護", gender: "M", birthYear: 2002, spouseId: "", parentId1: "29" },
    "81": { id: "81", name: "個個個", gender: "M", birthYear: 2006, spouseId: "", parentId1: "29" },
    "82": { id: "82", name: "萬萬萬", gender: "M", birthYear: 2006, spouseId: "", parentId1: "30" },
    "83": { id: "83", name: "規規規", gender: "F", birthYear: 2008, spouseId: "", parentId1: "30" },
    "84": { id: "84", name: "火火火", gender: "M", birthYear: 2016, spouseId: "", parentId1: "31" },
    "85": { id: "85", name: "而而而", gender: "M", birthYear: 2010, spouseId: "", parentId1: "32" },
    "86": { id: "86", name: "閱閱閱", gender: "M", birthYear: 2011, spouseId: "", parentId1: "32" },
    "106": { id: "106", name: "又又又", gender: "F", birthYear: 2025, spouseId: "", parentId1: "48" },
    "107": { id: "107", name: "剛剛剛", gender: "F", birthYear: 2025, spouseId: "", parentId1: "52" }
};

export const useFamilyStore = create<FamilyState>((set) => ({
    members: mockData,
    uiConfig: {
        showBirthYear: true,
        nodeWritingMode: 'vertical-rl',
        yearSpacing: 20,
        generationSpacingNormal: 240,
        polarGenerationRadii: [300, 300, 250, 200, 200, 200, 200, 200, 200, 200], // Pre-populate some defaults
        fontSize: 35,
    },
    updateUIConfig: (config) =>
        set((state) => ({
            uiConfig: { ...state.uiConfig, ...config }
        })),
    addMember: (member) =>
        set((state) => ({
            members: { ...state.members, [member.id]: member }
        })),
    updateMember: (id, memberUpdate) =>
        set((state) => ({
            members: {
                ...state.members,
                [id]: { ...state.members[id], ...memberUpdate }
            }
        })),
    deleteMember: (id) =>
        set((state) => {
            // 簡單的刪除邏輯。實務上應該連帶處理關聯的 spouseId, parentId 的清空與孤立節點的問題。
            const newMembers = { ...state.members };
            delete newMembers[id];
            // 清除配偶關聯
            Object.values(newMembers).forEach(m => {
                if (m.spouseId === id) {
                    newMembers[m.id] = { ...m, spouseId: undefined };
                }
            });
            return { members: newMembers };
        }),
    importData: (newMembers) => set({ members: newMembers }),
}));
