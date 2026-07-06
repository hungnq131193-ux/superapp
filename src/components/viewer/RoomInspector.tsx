import type {Room, RoomType} from '../../types';
import {ROOM_COLORS} from './PlanCanvas';

interface Props {
  room: Room | null;
  onPatch: (id: string, patch: Partial<Room>) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
}

export function RoomInspector({room, onPatch, onDelete, onAdd}: Props) {
  return (
    <details open>
      <summary>Chỉnh sửa phòng {room ? `— ${room.name}` : '(chạm vào phòng trên bản vẽ để chọn)'}</summary>
      <button onClick={onAdd}>Thêm phòng</button>
      {room && (
        <div className="roomEdit" key={room.id}>
          <input aria-label="Tên phòng" value={room.name} onChange={e => onPatch(room.id, {name: e.target.value})} />
          <select aria-label="Loại phòng" value={room.type} onChange={e => onPatch(room.id, {type: e.target.value as RoomType})}>
            {Object.keys(ROOM_COLORS).map(c => <option key={c}>{c}</option>)}
          </select>
          {(['x', 'y', 'width', 'height'] as const).map(k => (
            <label key={k}>
              {k}
              <input
                type="number"
                step="0.1"
                value={room[k]}
                onChange={e => {
                  const v = Number(e.target.value);
                  if (Number.isFinite(v)) onPatch(room.id, {[k]: v});
                }}
              />
            </label>
          ))}
          <button onClick={() => onDelete(room.id)}>Xóa</button>
        </div>
      )}
    </details>
  );
}
