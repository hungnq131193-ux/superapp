import type {Layout, ValidationIssue} from '../../types';

interface Props {
  layout: Layout;
  onHighlight: (issue: ValidationIssue) => void;
  onAutoFix: () => void;
}

export function IssueList({layout, onHighlight, onAutoFix}: Props) {
  const hasGeometryErrors = layout.issues.some(i => i.severity === 'error');
  if (layout.issues.length === 0) {
    return <div className="issues"><p className="info">Không phát hiện lỗi hay cảnh báo nào.</p></div>;
  }
  return (
    <div className="issues">
      {hasGeometryErrors && (
        <button className="autofix" onClick={onAutoFix}>⚒ Tự sửa lỗi layout (kẹp ranh + gỡ chồng lấn)</button>
      )}
      {layout.issues.map((i, idx) => (
        <p
          key={idx}
          className={i.severity + (i.roomIds?.length ? ' clickable' : '')}
          onClick={() => i.roomIds?.length && onHighlight(i)}
          title={i.roomIds?.length ? 'Bấm để tô sáng phòng liên quan' : undefined}
        >
          {i.roomIds?.length ? '◉ ' : ''}{i.message}
        </p>
      ))}
    </div>
  );
}
