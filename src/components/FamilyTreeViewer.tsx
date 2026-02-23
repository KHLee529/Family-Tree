import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { useFamilyStore } from '../store';
import { FamilyMember } from '../types';

interface ViewerProps {
    viewMode: 'normal' | 'vertical' | 'polar' | 'polar-time';
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

        // 依據 viewMode 調整 y 座標 (半徑)
        if (viewMode === 'vertical') {
            const minYear = d3.min(root.descendants(), d => d.data.member.birthYear) || 1900;
            root.each(d => {
                // 每 1 年對應 12px 高度
                d.y = (d.data.member.birthYear - minYear) * 12;
            });
        } else if (viewMode.startsWith('polar')) {
            const minYear = d3.min(root.descendants(), d => d.data.member.birthYear) || 1900;
            let minX = d3.min(root.descendants(), d => (d as any).x as number) || 0;
            let maxX = d3.max(root.descendants(), d => (d as any).x as number) || 1;
            if (minX === maxX) { minX -= 1; maxX += 1; } // 防呆

            root.each(d => {
                let r: number;
                if (viewMode === 'polar-time') {
                    // 時間極座標：依據年份向外擴張
                    r = (d.data.member.birthYear - minYear) * 15 + 150;
                } else {
                    // 一般極座標：依據世代 (depth) 擴張
                    r = d.depth * 250 + 150;
                }

                // 整個家族樹展開 360 度 (2*Math.PI)，預留一點切口避免頭尾相連
                const angleRange = Math.PI * 1.8;
                // 角度映射: minX~maxX 映射到 -angleRange/2 ~ angleRange/2
                const dx = (d as any).x || 0;
                const theta = ((dx - minX) / (maxX - minX)) * angleRange - angleRange / 2;

                // 儲存極座標資訊供後續繪圖使用
                (d as any).theta = theta;
                (d as any).r = r;

                // 計算直角座標位置
                (d as any).x = r * Math.sin(theta);
                (d as any).y = -r * Math.cos(theta);
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
                if (viewMode.startsWith('polar')) {
                    const sourceTheta = (d.source as any).theta || 0;
                    let sourceR = (d.source as any).r || 0;

                    if (d.source.data.spouse) {
                        // 配偶有高低差的話取平均半徑
                        if (viewMode === 'polar-time') {
                            const spouseR = sourceR + ((d.source.data.spouse.birthYear - d.source.data.member.birthYear) * 15);
                            sourceR = (sourceR + spouseR) / 2;
                        }
                    }
                    // 加上方塊高度一半(因反向旋轉180度後，向外的邊緣會多出 25 的半徑)
                    sourceR += 25;

                    let targetTheta = (d.target as any).theta || 0;
                    let targetR = (d.target as any).r || 0;

                    if (d.target.data.spouse) {
                        const isTargetMale = d.target.data.member.gender !== 'F';
                        // 極座標中，因 180 度翻轉，如果他是男性，local X = 65。
                        // 這會讓他在 Cartesian 上往左偏移。映射回 theta，偏移角約為 -65 / R。
                        const localX = isTargetMale ? 65 : -65;
                        targetTheta += -localX / targetR;
                    }

                    // 減去方塊高度一半(上緣向內，半徑少 25)
                    targetR -= 25;

                    // 中途轉折的半徑，用於畫弧線
                    const midR = (sourceR + targetR) / 2;

                    const p1x = sourceR * Math.sin(sourceTheta);
                    const p1y = -sourceR * Math.cos(sourceTheta);

                    const p2x = midR * Math.sin(sourceTheta);
                    const p2y = -midR * Math.cos(sourceTheta);

                    const p3x = midR * Math.sin(targetTheta);
                    const p3y = -midR * Math.cos(targetTheta);

                    const p4x = targetR * Math.sin(targetTheta);
                    const p4y = -targetR * Math.cos(targetTheta);

                    // 判斷是否需要大弧以及掃掠方向
                    const isLargeArc = Math.abs(targetTheta - sourceTheta) > Math.PI ? 1 : 0;
                    const sweepFlag = targetTheta > sourceTheta ? 1 : 0;

                    return `M ${p1x},${p1y} ` +
                        `L ${p2x},${p2y} ` +
                        `A ${midR} ${midR} 0 ${isLargeArc} ${sweepFlag} ${p3x} ${p3y} ` +
                        `L ${p4x},${p4y}`;
                }

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
                    const isTargetMale = d.target.data.member.gender !== 'F';
                    tx += isTargetMale ? -60 : 60; // 子女男左女右偏移
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
            .attr('transform', d => {
                let deg = viewMode.startsWith('polar') ? ((d as any).theta * 180 / Math.PI + 180) : 0;
                const isMale = d.data.member.gender !== 'F';

                let translation = `translate(0, 0)`;
                if (d.data.spouse) {
                    if (viewMode === 'normal') {
                        translation = isMale ? `translate(-60, 0)` : `translate(60, 0)`;
                    } else if (viewMode.startsWith('polar')) {
                        // 極座標中，因 180 度翻轉，local X = -65 為視覺右側，local X = 65 為視覺左側
                        translation = isMale ? `translate(65, 0)` : `translate(-65, 0)`;
                    }
                }
                return `rotate(${deg}) ${translation}`;
            })
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
            // 如果極座標的旋轉角度讓文字上下顛倒 (如頂點附近)，將文字反轉 180 度
            .attr('transform', d => {
                if (viewMode.startsWith('polar')) {
                    let deg = ((d as any).theta * 180 / Math.PI + 180) % 360;
                    if (deg < 0) deg += 360;
                    // 當節點位於下方半圓 (90~270度左右)，字體會反，把它轉正。
                    // 但因為整個 group 預設被旋轉 deg，所以 deg 的方向決定了文字是否顛倒。
                    if (deg > 90 && deg < 270) {
                        return `rotate(180) translate(0, -4)`;
                    }
                }
                return ``;
            })
            .text(d => d.data.member.name);

        memberGroup.append('text')
            .attr('dy', 16)
            .attr('text-anchor', 'middle')
            .attr('font-size', '11px')
            .attr('fill', '#64748b')
            .attr('transform', d => {
                if (viewMode.startsWith('polar')) {
                    let deg = ((d as any).theta * 180 / Math.PI + 180) % 360;
                    if (deg < 0) deg += 360;
                    if (deg > 90 && deg < 270) {
                        return `rotate(180) translate(0, -32)`; // 配合原本的 dy 調整
                    }
                }
                return ``;
            })
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
                } else if (viewMode === 'polar-time') {
                    const dr = (d.data.spouse!.birthYear - d.data.member.birthYear) * 15;
                    // member左緣 20，spouse右緣 -20；時間朝周邊延展，反轉後 -y 向外
                    return `M 20,0 L 0,0 L 0,${-dr} L -20,${-dr}`;
                } else {
                    // normal / polar-normal: member 右緣(極座標為左緣) 20，spouse 邊緣 -20
                    return viewMode.startsWith('polar') ? `M 20,0 L -20,0` : `M -20,0 L 20,0`;
                }
            })
            .attr('transform', d => {
                let deg = viewMode.startsWith('polar') ? ((d as any).theta * 180 / Math.PI + 180) : 0;
                return `rotate(${deg})`;
            });


        const spouseGroup = spouseNodes.append('g')
            .attr('transform', d => {
                let deg = viewMode.startsWith('polar') ? ((d as any).theta * 180 / Math.PI + 180) : 0;
                if (viewMode === 'vertical') {
                    const dy = (d.data.spouse!.birthYear - d.data.member.birthYear) * 12;
                    return `rotate(${deg}) translate(120, ${dy})`;
                } else if (viewMode === 'polar-time') {
                    const dr = (d.data.spouse!.birthYear - d.data.member.birthYear) * 15;
                    return `rotate(${deg}) translate(-65, ${-dr})`;
                } else {
                    return `rotate(${deg}) translate(${viewMode.startsWith('polar') ? -65 : 60}, 0)`;
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
            .attr('transform', d => {
                if (viewMode.startsWith('polar')) {
                    let deg = ((d as any).theta * 180 / Math.PI + 180) % 360;
                    if (deg < 0) deg += 360;
                    if (deg > 90 && deg < 270) {
                        return `rotate(180) translate(0, -4)`;
                    }
                }
                return ``;
            })
            .text(d => d.data.spouse!.name);

        spouseGroup.append('text')
            .attr('dy', 16)
            .attr('text-anchor', 'middle')
            .attr('font-size', '11px')
            .attr('fill', '#64748b')
            .attr('transform', d => {
                if (viewMode.startsWith('polar')) {
                    let deg = ((d as any).theta * 180 / Math.PI + 180) % 360;
                    if (deg < 0) deg += 360;
                    if (deg > 90 && deg < 270) {
                        return `rotate(180) translate(0, -32)`;
                    }
                }
                return ``;
            })
            .text(d => d.data.spouse!.birthYear);

    }, [members, viewMode]);

    return (
        <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" onClick={() => onSelect(null)}>
            <svg ref={svgRef} className="w-full h-full" />
        </div>
    );
}
