import { useState, useEffect } from 'react';
import { useFamilyStore } from '../store';
import { FamilyMember } from '../types';

interface SidebarProps {
    selectedId: string | null;
    onClose: () => void;
}

export default function Sidebar({ selectedId, onClose }: SidebarProps) {
    const { members, updateMember, deleteMember, addMember } = useFamilyStore();
    const [formData, setFormData] = useState<Partial<FamilyMember>>({});

    const member = selectedId ? members[selectedId] : null;

    useEffect(() => {
        if (member) {
            setFormData(member);
        }
    }, [member]);

    if (!selectedId || !member) {
        return (
            <div className="text-slate-500 text-sm mt-4 p-4 bg-slate-50 rounded-md border border-slate-100">
                請點擊畫布上的成員以編輯資訊。
            </div>
        );
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'birthYear' || name === 'deathYear' ? (value ? Number(value) : undefined) : value
        }));
    };

    const handleSave = () => {
        updateMember(selectedId, formData);
    };

    return (
        <div className="flex flex-col gap-4 mt-4">
            <div className="flex justify-between items-center bg-slate-100 p-2 rounded-md">
                <span className="font-medium text-slate-700">{member.name} 的資料</span>
                <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            {formData.photoUrl && (
                <div className="flex justify-center my-2">
                    <img src={formData.photoUrl} alt="個人照片" className="w-32 h-32 object-cover rounded-full border-4 border-white shadow-sm" />
                </div>
            )}

            <div className="flex flex-col gap-3 text-sm">
                <label className="flex flex-col">
                    <span className="text-slate-600 mb-1">姓名</span>
                    <input className="border border-slate-300 rounded px-2 py-1.5 focus:ring focus:ring-blue-200 outline-none" name="name" value={formData.name || ''} onChange={handleChange} />
                </label>

                <label className="flex flex-col">
                    <span className="text-slate-600 mb-1">性別</span>
                    <select className="border border-slate-300 rounded px-2 py-1.5 focus:ring focus:ring-blue-200 outline-none" name="gender" value={formData.gender || 'M'} onChange={handleChange}>
                        <option value="M">男</option>
                        <option value="F">女</option>
                        <option value="Other">其他</option>
                    </select>
                </label>

                <label className="flex flex-col">
                    <span className="text-slate-600 mb-1">出生年份</span>
                    <input type="number" className="border border-slate-300 rounded px-2 py-1.5 focus:ring focus:ring-blue-200 outline-none" name="birthYear" value={formData.birthYear || ''} onChange={handleChange} />
                </label>

                <label className="flex flex-col">
                    <span className="text-slate-600 mb-1">忌日年份 (選填)</span>
                    <input type="number" className="border border-slate-300 rounded px-2 py-1.5 focus:ring focus:ring-blue-200 outline-none" name="deathYear" value={formData.deathYear || ''} onChange={handleChange} />
                </label>

                <label className="flex flex-col">
                    <span className="text-slate-600 mb-1">照片 URL (選填)</span>
                    <input className="border border-slate-300 rounded px-2 py-1.5 focus:ring focus:ring-blue-200 outline-none" name="photoUrl" value={formData.photoUrl || ''} onChange={handleChange} />
                </label>

                <label className="flex flex-col">
                    <span className="text-slate-600 mb-1">備註 (選填)</span>
                    <textarea className="border border-slate-300 rounded px-2 py-1.5 focus:ring focus:ring-blue-200 outline-none min-h-[60px]" name="notes" value={formData.notes || ''} onChange={handleChange} />
                </label>
            </div>

            <div className="mt-2 flex gap-2">
                <button onClick={handleSave} className="flex-1 bg-blue-600 text-white rounded py-2 font-medium hover:bg-blue-700 transition-colors">儲存</button>
                <button onClick={() => deleteMember(selectedId)} className="bg-red-50 text-red-600 rounded px-4 py-2 hover:bg-red-100 transition-colors">刪除</button>
            </div>

            <div className="border-t border-slate-200 pt-4 mt-2">
                <h3 className="text-sm font-semibold text-slate-700 mb-2">新增親屬</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                    <button className="bg-slate-100 border border-slate-200 rounded py-1.5 hover:bg-slate-200 text-slate-700"
                        onClick={() => {
                            const id = Date.now().toString();
                            addMember({ id, name: '新子女', gender: 'Other', birthYear: (member.birthYear || 2000) + 25, parentId1: member.id });
                        }}
                    >+ 新增子女</button>

                    {!member.spouseId && (
                        <button className="bg-slate-100 border border-slate-200 rounded py-1.5 hover:bg-slate-200 text-slate-700"
                            onClick={() => {
                                const id = Date.now().toString();
                                addMember({ id, name: '新配偶', gender: member.gender === 'M' ? 'F' : 'M', birthYear: Math.round(Math.random() * 5) + (member.birthYear || 2000), spouseId: member.id });
                                updateMember(member.id, { spouseId: id });
                            }}
                        >+ 新增配偶</button>
                    )}
                </div>
            </div>
        </div>
    );
}
