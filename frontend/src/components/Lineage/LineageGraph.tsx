import { useMemo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MarkerType,
  Handle,
  Position
} from 'reactflow';
import 'reactflow/dist/style.css';

const TableNode = ({ data }: any) => {
  const styles = data.isFailed
    ? { bg: '#fff1f2', border: '#fca5a5', text: '#dc2626', labelColor: '#e11d48' }
    : data.isImpacted
    ? { bg: '#fffbeb', border: '#fcd34d', text: '#d97706', labelColor: '#b45309' }
    : { bg: '#ffffff', border: '#e2e8f0', text: '#64748b', labelColor: '#0f172a' };

  return (
    <div style={{
      padding: '12px 16px',
      borderRadius: '12px',
      background: styles.bg,
      border: `2px solid ${styles.border}`,
      boxShadow: data.isFailed ? '0 0 15px rgba(225,29,72,0.3)' : '0 2px 8px rgba(0,0,0,0.08)',
      minWidth: '160px',
      transition: 'all 0.3s ease'
    }}>
      <Handle type="target" position={Position.Left} style={{ background: styles.border, border: 'none', width: 8, height: 8 }} />
      <div style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: styles.text, marginBottom: 4 }}>
        {data.isFailed ? '🔴 FAILED' : data.isImpacted ? '⚠️ IMPACTED' : data.type}
      </div>
      <div style={{ fontSize: '13px', fontWeight: 700, color: styles.labelColor }}>{data.label}</div>
      <Handle type="source" position={Position.Right} style={{ background: styles.border, border: 'none', width: 8, height: 8 }} />
    </div>
  );
};

const nodeTypes = { table: TableNode };

const LineageGraph = ({ nodesData, edgesData }: any) => {
  const nodes = useMemo(() => nodesData.map((node: any, index: number) => ({
    id: node.id,
    type: 'table',
    data: { label: node.name, type: node.type, isFailed: node.isFailed, isImpacted: node.isImpacted },
    position: { x: index * 260 + 50, y: 150 + (index % 2 === 0 ? -60 : 60) },
  })), [nodesData]);

  const edges = useMemo(() => edgesData.map((edge: any) => ({
    id: `e${edge.from}-${edge.to}`,
    source: edge.from,
    target: edge.to,
    animated: true,
    style: { stroke: '#6366f1', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1' },
  })), [edgesData]);

  return (
    <div style={{ height: '380px', width: '100%', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc', overflow: 'hidden' }}>
      <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView>
        <Background color="#e2e8f0" gap={20} />
        <Controls />
      </ReactFlow>
    </div>
  );
};

export default LineageGraph;
