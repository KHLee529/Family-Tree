import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import * as d3 from 'd3';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import { useFamilyStore } from '../store';
import { FamilyMember } from '../types';

interface ViewerProps {
    viewMode: 'normal' | 'vertical' | 'polar' | 'polar-time';
    onSelect: (id: string | null) => void;
}

export interface FamilyTreeViewerRef {
    exportAsPNG: () => void;
    exportAsPDF: () => void;
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
    const realRoot = all.find(m => !m.parentId1 && isParent(m.id)) || all.find(m => !m.parentId1);

    if (!realRoot) return null;

    function buildNode(member: FamilyMember): TreeNode {
        const spouse = member.spouseId ? members[member.spouseId] : undefined;
        let childrenMembers = all.filter(m => m.parentId1 === member.id || (spouse && m.parentId1 === spouse.id));
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

const FamilyTreeViewer = forwardRef<FamilyTreeViewerRef, ViewerProps>(({ viewMode, onSelect }, ref) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const members = useFamilyStore((state) => state.members);

    useImperativeHandle(ref, () => ({
        exportAsPNG() {
            const svgElement = svgRef.current;
            const gElement = svgElement?.querySelector('g');

            if (!svgElement || !gElement) {
                console.error("SVG elements not found");
                return;
            }

            const originalTransform = gElement.getAttribute('transform');
            gElement.setAttribute('transform', '');
            const bbox = gElement.getBBox();
            gElement.setAttribute('transform', originalTransform || '');

            const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement;
            const gInClone = clonedSvg.querySelector('g');
            if (!gInClone) return;

            const padding = 50;
            const imageWidth = bbox.width + padding * 2;
            const imageHeight = bbox.height + padding * 2;

            clonedSvg.setAttribute('width', String(imageWidth));
            clonedSvg.setAttribute('height', String(imageHeight));
            gInClone.setAttribute('transform', `translate(${-bbox.x + padding}, ${-bbox.y + padding})`);

            toPng(clonedSvg as unknown as HTMLElement, { width: imageWidth, height: imageHeight, backgroundColor: '#ffffff' })
                .then((dataUrl) => {
                    const link = document.createElement('a');
                    link.download = 'family-tree.png';
                    link.href = dataUrl;
                    link.click();
                })
                .catch((err) => {
                    console.error('oops, something went wrong!', err);
                });
        },
        exportAsPDF() {
            const svgElement = svgRef.current;
            const gElement = svgElement?.querySelector('g');

            if (!svgElement || !gElement) {
                console.error("SVG elements not found");
                return;
            }

            const originalTransform = gElement.getAttribute('transform');
            gElement.setAttribute('transform', '');
            const bbox = gElement.getBBox();
            gElement.setAttribute('transform', originalTransform || '');

            const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement;
            const gInClone = clonedSvg.querySelector('g');
            if (!gInClone) return;

            const padding = 50;
            const imageWidth = bbox.width + padding * 2;
            const imageHeight = bbox.height + padding * 2;

            clonedSvg.setAttribute('width', String(imageWidth));
            clonedSvg.setAttribute('height', String(imageHeight));
            gInClone.setAttribute('transform', `translate(${-bbox.x + padding}, ${-bbox.y + padding})`);

            toPng(clonedSvg as unknown as HTMLElement, { width: imageWidth, height: imageHeight, backgroundColor: '#f8fafc' })
                .then((dataUrl) => {
                    const img = new Image();
                    img.src = dataUrl;
                    img.onload = () => {
                        const orientation = img.width > img.height ? 'l' : 'p';
                        const pdf = new jsPDF({
                            orientation,
                            unit: 'px',
                            format: [img.width, img.height]
                        });
                        pdf.addImage(dataUrl, 'PNG', 0, 0, img.width, img.height);
                        pdf.save('family-tree.pdf');
                    }
                })
                .catch((err) => {
                    console.error('oops, something went wrong!', err);
                });
        }
    }));


    useEffect(() => {
        const RectHeight = 80;
        const RectWidth = 30;
        const NameFontSize = '35px';
        const BirthYearFontSize = '20px';
        const VerticalYearOffset = 20;
        const PolarTimeYearOffset = 15;
        const ShowBirthYear = true;
        const PolarDepthRadius = [0, 300, 300, 250, 200];
        const SpouseOffset = RectWidth + 10;
        const PolarSpouseOffset = RectWidth + 10;
        const VerticalMode = true;
        const WritingMode = VerticalMode ? 'vertical-rl' : 'horizontal-tb';
        const TimeGridStep = 10;
        const MaleBGColor = '#bae6fd';
        const FemaleBGColor = '#fecdd3';
        const NonBinBGColor = '#e2e8f0';
        const TimeGridLineColor = '#b1cdf1';
        const TimeGridLabelColor = '#94a3b8';
        const TimeGridDashType = '20 50';
        const PolarNodeWidth = RectWidth * 4 + 40; // Polar view needs more space
        const CompactNodeWidth = 100; // More compact base width for normal/vertical
        const NodeHeight = RectHeight * 2 + 80;
        const GenerationColors = ['#355070', '#B56576', '#EAAC8B', '#6D597A', '#E56B6F', '#6366f1', '#8b5cf6'];

        //const MaleBGColor = '#87ccf1';
        //const FemaleBGColor = '#fff0f3';
        //const RectHeight = 75;
        //const FontSize = '45px';
        //const PolarDepthRadius = [0,550,200,200,200];

        if (!svgRef.current || !containerRef.current) return;
        const svg = d3.select(svgRef.current);
        const width = containerRef.current.clientWidth;

        svg.selectAll('*').remove();
        const g = svg.append('g');

        const zoom = d3.zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.1, 4])
            .on('zoom', (event) => g.attr('transform', event.transform));

        svg.call(zoom);

        const treeData = buildTree(members);
        if (!treeData) return;

        const root = d3.hierarchy<TreeNode>(treeData);

        // Conditionally use cluster layout for polar views for even distribution
        if (viewMode.startsWith('polar')) {
            d3.cluster<TreeNode>().nodeSize([PolarNodeWidth, NodeHeight])(root);
        } else {
            d3.tree<TreeNode>()
                .nodeSize([CompactNodeWidth, NodeHeight])
                .separation((a, b) => {
                    const aSpouse = !!a.data.spouse;
                    const bSpouse = !!b.data.spouse;
                    const sep = 1 + (aSpouse ? 0.6 : 0) + (bSpouse ? 0.6 : 0);
                    return (a.parent === b.parent ? 1 : 1.1) * sep;
                })(root);
        }

        // Get bounds of the tree
        let minX = 0, maxX = 0, minY = 0, maxY = 0;
        root.each(d => {
            if (d.x !== undefined && d.x < minX) minX = d.x;
            if (d.x !== undefined && d.x > maxX) maxX = d.x;
            if (d.y !== undefined && d.y < minY) minY = d.y;
            if (d.y !== undefined && d.y > maxY) maxY = d.y;
        });

        // Add some padding
        const padding = 100;
        const treeWidth = maxX - minX + 300; // Account for node width
        const treeHeight = maxY - minY + 200; // Account for node height

        const initialScale = Math.min(width / treeWidth, containerRef.current.clientHeight / treeHeight, 1);
        const initialX = width / 2 - (minX + maxX) / 2 * initialScale;
        const initialY = 100;

        svg.call(zoom.transform, d3.zoomIdentity.translate(initialX, initialY).scale(initialScale));

        // Calculate year range for time-based views
        const allDescendants = root.descendants();
        const minYear = d3.min(allDescendants, d => d.data.member.birthYear) || 1900;
        const maxYear = d3.max(allDescendants, d => d.data.member.birthYear) || new Date().getFullYear();

        // 依據 viewMode 調整 y 座標 (半徑)
        if (viewMode === 'vertical') {
            root.each(d => {
                // 每 1 年對應 12px 高度
                d.y = (d.data.member.birthYear - minYear) * VerticalYearOffset;
            });

            // Calculate shared turning point for vertical mode to ensure clean lines
            root.each(d => {
                if (d.children && d.children.length > 0) {
                    let sy = d.y || 0;
                    let parentBottomY = sy + RectHeight;
                    if (d.data.spouse) {
                        const dy = ((d.data.spouse.birthYear - d.data.member.birthYear) * VerticalYearOffset);
                        parentBottomY = Math.max(parentBottomY, sy + dy + RectHeight);
                    }

                    const minChildTopY = d3.min(d.children, c => (c.y || 0) - RectHeight) as number;
                    (d as any).sharedMidY = (parentBottomY + minChildTopY) / 2;
                }
            });
        } else if (viewMode.startsWith('polar')) {
            // Use d3.partition to allocate angle space based on the number of leaf nodes,
            // factoring in whether the leaf has a spouse (which makes it wider).
            root.sum(d => d.children.length === 0 ? (d.spouse ? 1.8 : 1) : 0);

            // Partition layout gives us proportional angles d.x0 and d.x1
            d3.partition<TreeNode>().size([2 * Math.PI, root.height + 1])(root);

            root.each(d => {
                let r: number = 0;
                if (viewMode === 'polar-time') {
                    r = (d.data.member.birthYear - minYear) * PolarTimeYearOffset + PolarDepthRadius[0];
                } else {
                    // Increase radius step to provide more tangential space
                    for (let i = 0; i <= d.depth; i++) {
                        r += PolarDepthRadius[i];
                    }
                }

                // The angle is the midpoint of the partition arc.
                const theta = ((d as any).x0 + (d as any).x1) / 2;

                (d as any).theta = theta;
                (d as any).r = r;
                // Use the original cartesian conversion to maintain compatibility with downstream drawing logic
                (d as any).x = r * Math.sin(theta);
                (d as any).y = -r * Math.cos(theta);
            });
        }

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
                    let spouseR = 0;

                    if (d.source.data.spouse) {
                        if (viewMode === 'polar-time') {
                            spouseR = sourceR + ((d.source.data.spouse.birthYear - d.source.data.member.birthYear) * PolarTimeYearOffset);
                            sourceR = (sourceR + spouseR) / 2;
                        }
                    }

                    let targetTheta = (d.target as any).theta || 0;
                    let targetR = (d.target as any).r || 0;

                    if (d.target.data.spouse) {
                        const isTargetMale = d.target.data.member.gender !== 'F';
                        const localX = isTargetMale ? -PolarSpouseOffset : PolarSpouseOffset;
                        targetTheta += -localX / targetR;
                    }

                    targetR -= RectHeight;
                    //let midR = (sourceR + targetR) / 2;
                    let midR = (spouseR == 0 ? sourceR : Math.max(sourceR, spouseR)) + 100;
                    if (midR - sourceR < RectHeight + 50) midR = sourceR + RectHeight + 50;

                    const p1x = sourceR * Math.sin(sourceTheta);
                    const p1y = -sourceR * Math.cos(sourceTheta);
                    const p2x = midR * Math.sin(sourceTheta);
                    const p2y = -midR * Math.cos(sourceTheta);
                    const p3x = midR * Math.sin(targetTheta);
                    const p3y = -midR * Math.cos(targetTheta);
                    const p4x = targetR * Math.sin(targetTheta);
                    const p4y = -targetR * Math.cos(targetTheta);

                    const isLargeArc = Math.abs(targetTheta - sourceTheta) > Math.PI ? 1 : 0;
                    const sweepFlag = targetTheta > sourceTheta ? 1 : 0;

                    return `M ${p1x},${p1y} L ${p2x},${p2y} A ${midR} ${midR} 0 ${isLargeArc} ${sweepFlag} ${p3x} ${p3y} L ${p4x},${p4y}`;
                }

                let sx = d.source.x || 0;
                let sy = d.source.y || 0;

                // Calculate the bottom-most edge of the parent node (considering spouse in vertical mode)
                let parentBottomY = sy + RectHeight;

                if (d.source.data.spouse) {
                    if (viewMode === 'vertical') {
                        const dy = ((d.source.data.spouse.birthYear - d.source.data.member.birthYear) * VerticalYearOffset);
                        // If spouse is drawn lower, the connection point should account for it to avoid overlap
                        parentBottomY = Math.max(parentBottomY, sy + dy + RectHeight);
                    }
                }

                let tx = d.target.x || 0;
                let ty = d.target.y || 0;
                let childTopY = ty - RectHeight;

                if (d.target.data.spouse) {
                    const isTargetMale = d.target.data.member.gender !== 'F';
                    tx += isTargetMale ? -SpouseOffset : SpouseOffset;
                }

                // Calculate the turning point exactly in the middle of the gap
                let midY = (viewMode === 'vertical' && (d.source as any).sharedMidY !== undefined)
                    ? (d.source as any).sharedMidY
                    : (parentBottomY + childTopY) / 2;

                return `M ${sx},${sy} L ${sx},${midY} L ${tx},${midY} L ${tx},${childTopY}`;
            });

        const nodeGroup = g.selectAll('.node')
            .data(root.descendants())
            .enter()
            .append('g')
            .attr('class', 'node')
            .attr('transform', d => `translate(${d.x},${d.y})`);

        const memberGroup = nodeGroup.append('g')
            .attr('class', 'member-group')
            .attr('transform', d => {
                let deg = viewMode.startsWith('polar') ? ((d as any).theta * 180 / Math.PI + 180) : 0;
                const isMale = d.data.member.gender !== 'F';

                let translation = `translate(0, 0)`;
                if (d.data.spouse) {
                    if (viewMode === 'normal' || viewMode === 'vertical') {
                        translation = isMale ? `translate(-${SpouseOffset}, 0)` : `translate(${SpouseOffset}, 0)`;
                    } else if (viewMode.startsWith('polar')) {
                        translation = isMale ? `translate(-${PolarSpouseOffset}, 0)` : `translate(${PolarSpouseOffset}, 0)`;
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
            .attr('x', -RectWidth)
            .attr('y', -RectHeight)
            .attr('width', RectWidth * 2)
            .attr('height', RectHeight * 2)
            .attr('rx', 8)
            .attr('fill', d => d.data.member.gender === 'M' ? MaleBGColor : d.data.member.gender === 'F' ? FemaleBGColor : NonBinBGColor)
            .attr('stroke', d => GenerationColors[d.depth % GenerationColors.length])
            .attr('stroke-width', 5);

        memberGroup.append('text')
            .attr('writing-mode', WritingMode)
            .attr('dy', -2)
            .attr('text-anchor', 'middle')
            .attr('font-size', NameFontSize)
            .attr('font-weight', '500')
            .attr('fill', '#1e293b')
            .attr('transform', d => {
                if (viewMode.startsWith('polar')) {
                    let deg = ((d as any).theta * 180 / Math.PI + 180) % 360;
                    if (deg < 0) deg += 360;
                    //if (deg > 90 && deg < 270) return `rotate(180) translate(0, -4)`;
                }
                return ``;
            }).text(d => d.data.member.name);

        if (ShowBirthYear) {
            memberGroup.append('text')
                .attr('dy', RectHeight * 0.9)
                .attr('text-anchor', 'middle')
                .attr('font-size', BirthYearFontSize)
                .attr('fill', '#64748b')
                .attr('transform', d => {
                    if (viewMode.startsWith('polar')) {
                        let deg = ((d as any).theta * 180 / Math.PI + 180) % 360;
                        if (deg < 0) deg += 360;
                        //if (deg > 90 && deg < 270) return `rotate(180) translate(0, -32)`;
                    }
                    return ``;
                }).text(d => d.data.member.birthYear);
        }

        const spouseNodes = nodeGroup.filter(d => !!d.data.spouse);

        spouseNodes.append('path')
            .attr('fill', 'none')
            .attr('stroke', '#94a3b8')
            .attr('stroke-width', 2)
            .attr('d', d => {
                const isMemberMale = d.data.member.gender !== 'F';
                if (viewMode === 'vertical') {
                    const dy = (d.data.spouse!.birthYear - d.data.member.birthYear) * VerticalYearOffset;
                    const startX = isMemberMale ? -15 : 15;
                    const endX = isMemberMale ? 15 : -15;
                    return `M ${startX},0 L 0,0 L 0,${dy} L ${endX},${dy}`;
                } else if (viewMode === 'polar-time') {
                    const dr = (d.data.spouse!.birthYear - d.data.member.birthYear) * PolarTimeYearOffset;
                    const startX = isMemberMale ? -20 : 20;
                    const endX = isMemberMale ? 20 : -20;
                    return `M ${startX},0 L 0,0 L 0,${dr} L ${endX},${dr}`;
                } else {
                    const startX = viewMode.startsWith('polar') ? (isMemberMale ? 10 : -10) : (isMemberMale ? -15 : 15);
                    const endX = viewMode.startsWith('polar') ? (isMemberMale ? -10 : 10) : (isMemberMale ? 15 : -15);
                    return `M ${startX},0 L ${endX},0`;
                }
            }).attr('transform', d => `rotate(${viewMode.startsWith('polar') ? ((d as any).theta * 180 / Math.PI + 180) : 0})`);

        const spouseGroup = spouseNodes.append('g')
            .attr('transform', d => {
                const isMemberMale = d.data.member.gender !== 'F';
                let deg = viewMode.startsWith('polar') ? ((d as any).theta * 180 / Math.PI + 180) : 0;

                if (viewMode === 'vertical') {
                    const dy = (d.data.spouse!.birthYear - d.data.member.birthYear) * VerticalYearOffset;
                    const xOffset = isMemberMale ? SpouseOffset : -SpouseOffset;
                    return `rotate(${deg}) translate(${xOffset}, ${dy})`;
                } else if (viewMode === 'polar-time') {
                    const dr = (d.data.spouse!.birthYear - d.data.member.birthYear) * PolarTimeYearOffset;
                    const xOffset = isMemberMale ? PolarSpouseOffset : -PolarSpouseOffset;
                    return `rotate(${deg}) translate(${xOffset}, ${dr})`;
                } else {
                    const xOffset = viewMode.startsWith('polar') ? (isMemberMale ? PolarSpouseOffset : -PolarSpouseOffset) : (isMemberMale ? SpouseOffset : -SpouseOffset);
                    return `rotate(${deg}) translate(${xOffset}, 0)`;
                }
            })
            .attr('class', 'spouse-group').attr('cursor', 'pointer')
            .on('click', (event, d) => { event.stopPropagation(); onSelect(d.data.spouse!.id); });

        spouseGroup.append('rect')
            .attr('x', -RectWidth)
            .attr('y', -RectHeight)
            .attr('width', RectWidth * 2)
            .attr('height', RectHeight * 2)
            .attr('rx', 8)
            .attr('fill', d => d.data.spouse!.gender === 'M' ? MaleBGColor : d.data.spouse!.gender === 'F' ? FemaleBGColor : NonBinBGColor)
            .attr('stroke', d => GenerationColors[d.depth % GenerationColors.length])
            .attr('stroke-width', 5);

        spouseGroup.append('text')
            .attr('writing-mode', WritingMode)
            .attr('dy', -2)
            .attr('text-anchor', 'middle')
            .attr('font-size', NameFontSize)
            .attr('font-weight', '500')
            .attr('fill', '#1e293b')
            .attr('transform', d => {
                if (viewMode.startsWith('polar')) {
                    let deg = ((d as any).theta * 180 / Math.PI + 180) % 360;
                    if (deg < 0) deg += 360;
                    //if (deg > 90 && deg < 270) return `rotate(180) translate(0, -4)`;
                }
                return ``;
            })
            .text(d => d.data.spouse!.name);

        if (ShowBirthYear) {
            spouseGroup.append('text')
                .attr('dy', RectHeight * 0.9)
                .attr('text-anchor', 'middle')
                .attr('font-size', BirthYearFontSize)
                .attr('fill', '#64748b')
                .attr('transform', d => {
                    if (viewMode.startsWith('polar')) {
                        let deg = ((d as any).theta * 180 / Math.PI + 180) % 360;
                        if (deg < 0) deg += 360;
                        //if (deg > 90 && deg < 270) return `rotate(180) translate(0, -32)`;
                    }
                    return ``;
                })
                .text(d => d.data.spouse!.birthYear);
        }

        // Draw Grid Lines (Year Markers)
        if (viewMode === 'vertical' || viewMode === 'polar-time') {
            const gridGroup = g.append('g').attr('class', 'grid-lines');
            const startYear = Math.floor(minYear / TimeGridStep) * TimeGridStep;
            const endYear = Math.ceil(maxYear / TimeGridStep) * TimeGridStep;

            for (let year = startYear; year <= endYear; year += TimeGridStep) {
                if (viewMode === 'vertical') {
                    const y = (year - minYear) * VerticalYearOffset;
                    // Draw horizontal line
                    gridGroup.append('line')
                        .attr('x1', minX - padding)
                        .attr('x2', maxX + padding)
                        .attr('y1', y)
                        .attr('y2', y)
                        .attr('stroke', TimeGridLineColor)
                        .attr('stroke-width', 2)
                        .attr('stroke-dasharray', TimeGridDashType);

                    // Draw year label
                    gridGroup.append('text')
                        .attr('x', minX - padding - 10)
                        .attr('y', y)
                        .attr('dy', '0.32em')
                        .attr('text-anchor', 'end')
                        .attr('fill', TimeGridLabelColor)
                        .attr('font-size', '12px')
                        .text(year);
                } else {
                    // Polar-time view
                    const r = (year - minYear) * PolarTimeYearOffset + PolarDepthRadius[0];
                    // Draw concentric circle
                    gridGroup.append('circle')
                        .attr('cx', 0)
                        .attr('cy', 0)
                        .attr('r', r)
                        .attr('fill', 'none')
                        .attr('stroke', TimeGridLineColor)
                        .attr('stroke-width', 2)
                        .attr('stroke-dasharray', TimeGridDashType);

                    // Draw year label (at the top)
                    gridGroup.append('text')
                        .attr('x', 0)
                        .attr('y', -r)
                        .attr('dy', '-0.4em')
                        .attr('text-anchor', 'middle')
                        .attr('fill', TimeGridLabelColor)
                        .attr('font-size', '12px')
                        .text(year);
                }
            }
        }
    }, [members, viewMode]);

    return (
        <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" onClick={() => onSelect(null)}>
            <svg ref={svgRef} className="w-full h-full" />
        </div>
    );
});

export default FamilyTreeViewer;
