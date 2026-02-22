import { create } from 'zustand';
import { FamilyState, FamilyMember } from './types';

const mockData: Record<string, FamilyMember> = {
    '1': { id: '1', name: 'Grandpa', gender: 'M', birthYear: 1930, spouseId: '2' },
    '2': { id: '2', name: 'Grandma', gender: 'F', birthYear: 1932, spouseId: '1' },
    '3': { id: '3', name: 'Father', gender: 'M', birthYear: 1955, parentId1: '1', spouseId: '4' },
    '4': { id: '4', name: 'Mother', gender: 'F', birthYear: 1957, spouseId: '3' },
    '5': { id: '5', name: 'Uncle', gender: 'M', birthYear: 1960, parentId1: '1', spouseId: '6' },
    '6': { id: '6', name: 'Aunt', gender: 'F', birthYear: 1962, spouseId: '5' },
    '7': { id: '7', name: 'Me', gender: 'M', birthYear: 1985, parentId1: '3', spouseId: '8' },
    '8': { id: '8', name: 'Wife', gender: 'F', birthYear: 1986, spouseId: '7' },
    '9': { id: '9', name: 'Cousin', gender: 'F', birthYear: 1990, parentId1: '5' },
    '10': { id: '10', name: 'Son', gender: 'M', birthYear: 2015, parentId1: '7' },
};

export const useFamilyStore = create<FamilyState>((set) => ({
    members: mockData,
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
