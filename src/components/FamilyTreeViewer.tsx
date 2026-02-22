import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { useFamilyStore } from '../store';
import { FamilyMember } from '../types';

interface ViewerProps {
    viewMode: 'normal' | 'vertical' | 'polar';
    onSelect: (id: string | null) => void;
}

interface TreeNode {
    id: string;
    member: FamilyMember;
    spouse?: FamilyMember;
    children: TreeNode[];
}

function buildTree(members: Record<string, FamilyMember>): TreeNode | null {
    const all = Object.values(members);
    const isParent = (id: string) => all.some(m => m.parentId1 === id);
    // 找出沒有父母且有小孩的人（或隨便一個無父母者）作為血脈根節點
    const realRoot = all.find(m => !m.parentId1 && isParent(m.id)) || all.find(m => !m.parentId1);

    if (!realRoot) return null;

    function buildNode(member: FamilyMember): TreeNode {
        const spouse = member.spouseId ? members[member.spouseId] : undefined;
        // 小孩的 parentId1 指向 member 或是 spouse
        let childrenMembers = all.filter(m => m.parentId1 === member.id || (spouse && m.parentId1 === spouse.id));
        // 由大到小排序 (左至右)
        childrenMembers.sort((a, b) => (a.birthYear || 0) - (b.birthYear || 0));

        return {
            id: member.id,
            member,
            spouse,
            children: childrenMembers.map(buildNode)
        };
    }
    return buildNode(realRoot);
}

export default function FamilyTreeViewer({ viewMode, onSelect }: ViewerProps) {
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const members = useFamilyStore((state) => state.members);

    useEffect(() => {
        if (!svgRef.current || !containerRef.current) return;
        const svg = d3.select(svgRef.current);
        const width = containerRef.current.clientWidth;

        svg.selectAll('*').remove();
        const g = svg.append('g');

        const zoom = d3.zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.1, 4])
            .on('zoom', (event) => g.attr('transform', event.transform));

        svg.call(zoom);
        svg.call(zoom.transform, d3.zoomIdentity.translate(width / 2, 100));

        const treeData = buildTree(members);
        if (!treeData) return;

        // 將資料轉為 d3 hierarchy
        const root = d3.hierarchy<TreeNode>(treeData);

        // 建立 Tree Layout
        // nodeSize 指定每個節點佔用的空間寬高 (一般家庭樹 x, y)
        // 考慮配偶的寬度，節點寬度設為 200，高度 150
        const treeLayout = d3.tree<TreeNode>().nodeSize([250, 120]);
        treeLayout(root);

        // 依據 viewMode 調整 y 座標
        if (viewMode === 'vertical') {
            const minYear = d3.min(root.descendants(), d => d.data.member.birthYear) || 1900;
            root.each(d => {
                // 每 1 年對應 10px 高度
                d.y = (d.data.member.birthYear - minYear) * 12;
            });
        }

        // 繪製連線 (Links)
        g.selectAll('.link')
            .data(root.links())
            .enter()
            .append('path')
            .attr('class', 'link')
            .attr('fill', 'none')
            .attr('stroke', '#cbd5e1')
            .attr('stroke-width', 2)
            .attr('d', (d) => {
                let sx = d.source.x || 0;
                let sy = d.source.y || 0;
                let parentBottomY = sy + 25;

                // 起點 (父母) 邏輯
                if (d.source.data.spouse) {
                    if (viewMode === 'vertical') {
                        // 垂直模式: 為了配偶的高低差，中點的座標是各自偏移的平均
                        sx += 60;
                        const dy = ((d.source.data.spouse.birthYear - d.source.data.member.birthYear) * 12);
                        sy += dy / 2;
                        parentBottomY = Math.max(sy + 25, (d.source.y || 0) + dy + 25);
                    } else {
                        // 一般模式: 兩人平均分配在左右(-60 和 +60)，中點剛好就是 sx, sy
                        parentBottomY = sy + 25;
                    }
                } else {
                    sy += 25; // 沒配偶，直接從框框正下方連出
                }

                // 終點 (子女) 邏輯
                let tx = d.target.x || 0;
                let ty = d.target.y || 0;

                if (viewMode !== 'vertical' && d.target.data.spouse) {
                    tx -= 60; // 子女如果在一般模式有配偶，他本人的格子會往左偏 -60，線要連到格子正上方
                }
                ty -= 25; // 從框框正上方進入

                // 取中轉折點的 Y 軸高度，避免穿越父母的方塊
                let midY = (sy + ty) / 2;
                if (midY < parentBottomY + 15) {
                    midY = parentBottomY + 15;
                }

                // 繪製直角折線 (Elbow line)
                return `M ${sx},${sy} L ${sx},${midY} L ${tx},${midY} L ${tx},${ty}`;
            });

        // 繪製節點群組 (Node Groups)
        const nodeGroup = g.selectAll('.node')
            .data(root.descendants())
            .enter()
            .append('g')
            .attr('class', 'node')
            .attr('transform', d => `translate(${d.x},${d.y})`);

        // --- 繪製直系成員 ---
        const memberGroup = nodeGroup.append('g')
            .attr('class', 'member-group')
            .attr('transform', d => (viewMode !== 'vertical' && d.data.spouse) ? `translate(-60, 0)` : `translate(0, 0)`)
            .attr('cursor', 'pointer')
            .on('click', (event, d) => {
                event.stopPropagation();
                onSelect(d.data.member.id);
            });

        memberGroup.append('rect')
            .attr('x', -45)
            .attr('y', -25)
            .attr('width', 90)
            .attr('height', 50)
            .attr('rx', 8)
            .attr('fill', d => d.data.member.gender === 'M' ? '#bae6fd' : d.data.member.gender === 'F' ? '#fecdd3' : '#e2e8f0')
            .attr('stroke', '#64748b')
            .attr('stroke-width', 1);

        memberGroup.append('text')
            .attr('dy', -2)
            .attr('text-anchor', 'middle')
            .attr('font-size', '14px')
            .attr('font-weight', '500')
            .attr('fill', '#1e293b')
            .text(d => d.data.member.name);

        memberGroup.append('text')
            .attr('dy', 16)
            .attr('text-anchor', 'middle')
            .attr('font-size', '11px')
            .attr('fill', '#64748b')
            .text(d => d.data.member.birthYear);

        // --- 繪製配偶 (如果有) ---
        const spouseNodes = nodeGroup.filter(d => !!d.data.spouse);

        // 配偶相連的水平線或折線
        spouseNodes.append('path')
            .attr('fill', 'none')
            .attr('stroke', '#94a3b8')
            .attr('stroke-width', 2)
            .attr('d', d => {
                if (viewMode === 'vertical') {
                    const dy = (d.data.spouse!.birthYear - d.data.member.birthYear) * 12;
                    // member 邊緣在 x=45, spouse 邊緣在 x=75, x=60處折彎
                    return `M 45,0 L 60,0 L 60,${dy} L 75,${dy}`;
                } else {
                    // normal: member 中心在 -60(右緣 30)，spouse 中心在 60(左緣 -30) 但此節點的 g transform 已無關聯。在這裡使用 M -15 L 15.
                    // Wait, the group is not translated. `d.x` is the center.
                    // member rect is at x = -45, width 90. So member right edge is 45. 
                    // But in normal mode, member is translate(-60, 0). Right edge is -60 + 45 = -15.
                    // Spouse is translate(60, 0). Left edge is 60 - 45 = 15.
                    return `M -15,0 L 15,0`;
                }
            });

        const spouseGroup = spouseNodes.append('g')
            .attr('transform', d => {
                if (viewMode === 'vertical') {
                    const dy = (d.data.spouse!.birthYear - d.data.member.birthYear) * 12;
                    return `translate(120, ${dy})`;
                } else {
                    return `translate(60, 0)`;
                }
            })
            .attr('class', 'spouse-group')
            .attr('cursor', 'pointer')
            .on('click', (event, d) => {
                event.stopPropagation();
                onSelect(d.data.spouse!.id);
            });

        spouseGroup.append('rect')
            .attr('x', -45)
            .attr('y', -25)
            .attr('width', 90)
            .attr('height', 50)
            .attr('rx', 8)
            .attr('fill', d => d.data.spouse!.gender === 'M' ? '#bae6fd' : d.data.spouse!.gender === 'F' ? '#fecdd3' : '#e2e8f0')
            .attr('stroke', '#64748b')
            .attr('stroke-width', 1);

        spouseGroup.append('text')
            .attr('dy', -2)
            .attr('text-anchor', 'middle')
            .attr('font-size', '14px')
            .attr('font-weight', '500')
            .attr('fill', '#1e293b')
            .text(d => d.data.spouse!.name);

        spouseGroup.append('text')
            .attr('dy', 16)
            .attr('text-anchor', 'middle')
            .attr('font-size', '11px')
            .attr('fill', '#64748b')
            .text(d => d.data.spouse!.birthYear);

    }, [members, viewMode]);

    return (
        <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" onClick={() => onSelect(null)}>
            <svg ref={svgRef} className="w-full h-full" />
        </div>
    );
}
